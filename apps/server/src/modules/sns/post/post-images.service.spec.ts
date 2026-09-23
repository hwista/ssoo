import 'reflect-metadata';
import { jest } from '@jest/globals';
import sharp from 'sharp';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostImagesService, postImageFileName, validatePostImages, type UploadedPostImage } from './post-images.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AccessService } from '../access/access.service.js';
import type { PostService } from './post.service.js';

async function fixture(format: 'png' | 'jpeg' | 'webp' = 'png'): Promise<UploadedPostImage> {
  const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#287f8e' } }).toFormat(format).toBuffer();
  return { buffer, size: buffer.length, mimetype: `image/${format}`, originalname: `sample.${format}` };
}

describe('post image validation', () => {
  it('preserves Korean multipart filenames and removes path segments', () => {
    expect(postImageFileName(Buffer.from('첨부사진.png').toString('latin1'))).toBe('첨부사진.png');
    expect(postImageFileName('사진.webp')).toBe('사진.webp');
    expect(postImageFileName('C:\\fakepath\\photo.png')).toBe('photo.png');
  });
  it.each(['png', 'jpeg', 'webp'] as const)('fully decodes an allowed %s image', async (format) => {
    await expect(validatePostImages([await fixture(format)])).resolves.toBeUndefined();
  });
  it('accepts four images', async () => { await expect(validatePostImages(Array(4).fill(await fixture()))).resolves.toBeUndefined(); });
  it('rejects empty and excessive selections', async () => {
    await expect(validatePostImages([])).rejects.toBeInstanceOf(BadRequestException);
    await expect(validatePostImages(Array(5).fill(await fixture()))).rejects.toBeInstanceOf(BadRequestException);
  });
  it('checks actual bytes instead of caller-supplied size', async () => {
    await expect(validatePostImages([{ ...await fixture(), buffer: Buffer.alloc(5_000_001), size: 1 }])).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects a declared format mismatch', async () => {
    await expect(validatePostImages([{ ...await fixture(), mimetype: 'image/jpeg' }])).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects HTML and SVG disguised as a permitted image', async () => {
    for (const payload of ['<html>bad</html>', '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>']) {
      await expect(validatePostImages([{ ...await fixture(), buffer: Buffer.from(payload) }])).rejects.toBeInstanceOf(BadRequestException);
    }
  });
  it('rejects truncated image data that still has a header', async () => {
    const file = await fixture();
    await expect(validatePostImages([{ ...file, buffer: file.buffer.subarray(0, 45) }])).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('post image read boundary', () => {
  const user = { userId: '3', loginId: 'reader' };
  function setup(allowed: boolean) {
    const findFirst = jest.fn(async () => null);
    const assertReadablePost = jest.fn(async () => { if (!allowed) throw new NotFoundException(); });
    const db = { client: { snsAttachment: { findFirst } } } as unknown as DatabaseService;
    return { findFirst, assertReadablePost, service: new PostImagesService(db, { assertReadablePost } as unknown as AccessService, {} as PostService, new ConfigService()) };
  }
  it('checks post access before reading attachment metadata or bytes', async () => {
    const s = setup(false);
    await expect(s.service.read('7', '9', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.assertReadablePost).toHaveBeenCalledWith(user, 7n);
    expect(s.findFirst).not.toHaveBeenCalled();
  });
  it('binds an attachment identifier to its post', async () => {
    const s = setup(true);
    await expect(s.service.read('7', '9', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.findFirst).toHaveBeenCalledWith({ where: { id: 9n, postId: 7n } });
  });
  it.each(['0', '-1', '01', 'abc', '9223372036854775808', '../1'])('rejects invalid ids before access %s', async (id) => {
    const s = setup(true);
    await expect(s.service.read('7', id, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.assertReadablePost).not.toHaveBeenCalled();
  });
});

describe('failed image attempt cleanup', () => {
  it('does not remove files belonging to a later attempt after a transaction timeout', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sns-images-test-'));
    let laterFile = '';
    const tx = {
      $queryRaw: async () => [],
      snsAttachment: {
        findFirst: async () => null,
        create: async ({ data }: { data: { filePath: string } }) => {
          laterFile = path.join(root, path.dirname(path.dirname(data.filePath)), 'later-attempt', '0.png');
          await mkdir(path.dirname(laterFile), { recursive: true });
          await writeFile(laterFile, 'successful retry');
          throw new Error('transaction timed out');
        },
      },
    };
    const db = { client: { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } } as unknown as DatabaseService;
    const access = { resolvePostVisibility: async () => ({ visibilityScopeCode: 'public', targetOrgId: null }) } as unknown as AccessService;
    const posts = { createInTransaction: async () => ({ id: 1n }) } as unknown as PostService;
    const service = new PostImagesService(db, access, posts, new ConfigService({ SNS_IMAGE_STORAGE_PATH: root }));
    try {
      await expect(service.create({ submissionId: '2e579db4-e0c9-4d02-a3e2-7ab047c9f26d', content: 'photo' }, [await fixture()], { userId: '3', loginId: 'writer' })).rejects.toThrow('transaction timed out');
      expect(await readFile(laterFile, 'utf8')).toBe('successful retry');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
