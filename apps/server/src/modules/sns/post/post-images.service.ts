import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessService } from '../access/access.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { CreateImagePostDto } from './dto/image-post.dto.js';
import { PostService, type PostTransaction } from './post.service.js';

export interface UploadedPostImage { buffer: Buffer; originalname: string; mimetype: string; size: number }
export const POST_IMAGE_MAX_BYTES = 5_000_000;
export const postImageSelect = { id: true, fileName: true, mimeType: true, fileSize: true } as const;
const formats = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function postImageFileName(original: string) {
  // Multipart headers are decoded as latin1 by the upload parser; browsers send UTF-8 names.
  const decoded = Buffer.from(original, 'latin1').toString('utf8');
  const name = Array.from(original).every((character) => character.charCodeAt(0) <= 255) && !decoded.includes('\ufffd') ? decoded : original;
  const basename = path.basename(name.replaceAll('\\', '/'));
  return Array.from(basename).filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127).join('').slice(0, 500) || 'image';
}

export async function validatePostImages(files: UploadedPostImage[]) {
  if (!files.length || files.length > 4) throw new BadRequestException('사진은 1~4장 선택해 주세요.');
  for (const file of files) {
    if (!file.buffer.length || file.buffer.length > POST_IMAGE_MAX_BYTES) throw new BadRequestException('사진은 장당 5MB 이하여야 합니다.');
    try {
      const image = sharp(file.buffer, { limitInputPixels: 40_000_000, failOn: 'warning' });
      const metadata = await image.metadata();
      const format = metadata.format;
      if (!format || !(format in formats) || formats[format as keyof typeof formats] !== file.mimetype || (metadata.pages ?? 1) > 1) throw new Error('format');
      // Full decode also rejects truncated/corrupt image data; metadata alone is insufficient.
      await image.stats();
    } catch {
      throw new BadRequestException('손상되지 않은 JPEG·PNG·WebP 정지 이미지를 선택해 주세요. (최대 4천만 화소)');
    }
  }
}

@Injectable()
export class PostImagesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostImagesService.name);
  private readonly root: string;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private cleaning = false;

  constructor(private readonly db: DatabaseService, private readonly access: AccessService, private readonly posts: PostService, config: ConfigService) {
    const configured = config.get<string>('SNS_IMAGE_STORAGE_PATH');
    this.root = path.resolve(configured || '.runtime/sns-images');
  }

  onModuleInit() {
    // No upload exists before submission. Only crash leftovers require a periodic sweep.
    void this.cleanupOrphans();
    this.cleanupTimer = setInterval(() => void this.cleanupOrphans(), 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }
  onModuleDestroy() { if (this.cleanupTimer) clearInterval(this.cleanupTimer); }

  private async lock(tx: PostTransaction, key: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`sns-images:${key}`}, 0))::text`;
  }

  async create(dto: CreateImagePostDto, files: UploadedPostImage[], user: TokenPayload) {
    if (!uuidPattern.test(dto.submissionId)) throw new BadRequestException('작성 요청 식별자가 올바르지 않습니다.');
    await validatePostImages(files);
    const visibility = await this.access.resolvePostVisibility(user, dto.visibilityScopeCode);
    const key = `${BigInt(user.userId)}/${dto.submissionId.toLowerCase()}`;
    const hash = createHash('sha256').update(JSON.stringify([dto.content, dto.visibilityScopeCode ?? 'public']));
    for (const file of files) hash.update(JSON.stringify([file.originalname, file.mimetype, file.buffer.length])).update(file.buffer);
    const digest = hash.digest('hex');
    const payloadDirectory = `${key}/${digest}`;
    // A timed-out transaction can finish an in-flight filesystem call after its lock expires.
    // Each attempt owns a separate directory so its cleanup cannot erase a successful retry.
    const directory = `${payloadDirectory}/${randomUUID()}`;
    const result = await this.db.client.$transaction(async (tx) => {
      await this.lock(tx, key);
      const existing = await tx.snsAttachment.findFirst({ where: { filePath: { startsWith: `${key}/` } }, include: { post: true } });
      if (existing) {
        if (!existing.post.isActive) throw new ConflictException('이미 삭제된 게시 요청입니다.');
        if (!existing.filePath.startsWith(`${payloadDirectory}/`)) throw new ConflictException('이전 요청과 내용이 다릅니다. 기존 요청을 확인해 주세요.');
        return { post: existing.post, created: false };
      }
      // The transaction lock prevents retries and the orphan sweep from racing this directory.
      await rm(path.join(this.root, key), { recursive: true, force: true });
      try {
        await mkdir(path.join(this.root, directory), { recursive: true, mode: 0o700 });
        const post = await this.posts.createInTransaction(tx, { content: dto.content }, BigInt(user.userId), visibility);
        if (!post) throw new Error('Post creation failed');
        for (const [index, file] of files.entries()) {
          const filePath = `${directory}/${index}.${file.mimetype.split('/')[1]}`;
          await writeFile(path.join(this.root, filePath), file.buffer, { mode: 0o600 });
          await tx.snsAttachment.create({ data: { postId: post.id, fileName: postImageFileName(file.originalname), filePath, fileSize: BigInt(file.buffer.length), mimeType: file.mimetype, sortOrder: index, createdBy: BigInt(user.userId) } });
        }
        return { post, created: true };
      } catch (error) {
        await rm(path.join(this.root, directory), { recursive: true, force: true }).catch(() => this.logger.warn('Failed image submission cleanup will be retried by sweep'));
        // Remove only empty parents; another attempt may already own a child directory.
        await rmdir(path.join(this.root, payloadDirectory)).catch(() => undefined);
        await rmdir(path.join(this.root, key)).catch(() => undefined);
        throw error;
      }
    }, { timeout: 30_000 });
    if (result.created) await this.posts.afterCreate(result.post.id, BigInt(user.userId));
    return result.post;
  }

  async read(postId: string, imageId: string, user: TokenPayload) {
    for (const id of [postId, imageId]) if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) throw new NotFoundException('이미지를 볼 수 없습니다.');
    await this.access.assertReadablePost(user, BigInt(postId));
    const image = await this.db.client.snsAttachment.findFirst({ where: { id: BigInt(imageId), postId: BigInt(postId) } });
    if (!image || !/^\d+\/[0-9a-f-]{36}\/[0-9a-f]{64}\/(?:[0-9a-f-]{36}\/)?[0-3]\.(jpeg|png|webp)$/.test(image.filePath)) throw new NotFoundException('이미지를 볼 수 없습니다.');
    try {
      const buffer = await readFile(path.join(this.root, image.filePath));
      return { buffer, mimeType: image.mimeType };
    } catch { throw new NotFoundException('이미지를 볼 수 없습니다.'); }
  }

  async cleanupOrphans() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      const owners = await readdir(this.root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error; });
      for (const owner of owners) {
        if (!owner.isDirectory() || !/^\d+$/.test(owner.name)) continue;
        for (const entry of await readdir(path.join(this.root, owner.name), { withFileTypes: true })) {
          if (!entry.isDirectory() || !uuidPattern.test(entry.name)) continue;
          const key = `${owner.name}/${entry.name}`;
          const folder = path.join(this.root, key);
          if (Date.now() - (await stat(folder)).mtimeMs < 24 * 60 * 60 * 1000) continue;
          await this.db.client.$transaction(async (tx) => {
            await this.lock(tx, key);
            const linked = await tx.snsAttachment.count({ where: { filePath: { startsWith: `${key}/` } } });
            if (!linked) await rm(folder, { recursive: true, force: true });
          });
        }
      }
    } catch { this.logger.warn('Image orphan sweep failed; will retry'); }
    finally { this.cleaning = false; }
  }
}
