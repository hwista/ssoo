import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../../database/database.service.js';
import type { InitialSetupDto } from './initial-setup.controller.js';

@Injectable()
export class InitialSetupService {
  constructor(private readonly db: DatabaseService, private readonly config: ConfigService) {}

  async status() {
    const required = await this.db.client.user.count() === 0;
    return { required, enabled: required && this.setupCode().length >= 32 };
  }

  private setupCode() { return this.config.get<string>('PLATFORM_SETUP_TOKEN')?.trim() ?? ''; }

  async create(dto: InitialSetupDto) {
    const expected = this.setupCode();
    if (expected.length < 32) throw new ServiceUnavailableException('설치 확인 코드가 준비되지 않았습니다. 설치 담당자에게 문의해 주세요.');
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(digest(expected), digest(dto.setupCode.trim()))) {
      throw new ForbiddenException('설치 확인 코드가 일치하지 않습니다. 설치 담당자에게 받은 코드를 확인해 주세요.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.db.client.$transaction(async (tx) => {
      // One first-run operation across server instances. READ COMMITTED sees the winner after the lock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(731206, 1)`;
      if (await tx.user.count() !== 0) throw new ConflictException('최초 관리자 설정이 이미 완료되었거나 기존 계정이 있습니다. 로그인 화면을 이용해 주세요.');
      const adminRole = await tx.rolePermission.count({ where: { isActive: true,
        role: { roleCode: 'admin', isActive: true }, permission: { permissionCode: 'system.override' } } });
      if (!adminRole) throw new ServiceUnavailableException('운영 기준정보가 준비되지 않았습니다. 설치 담당자에게 DB 초기화를 요청해 주세요.');
      const audit = { lastSource: 'platform-initial-setup', lastActivity: 'platform.first-admin' };
      const user = await tx.user.create({ data: { userName: dto.userName.trim(), email: dto.email.trim(), roleCode: 'admin', ...audit } });
      await tx.userAuth.create({ data: { userId: user.id, loginId: dto.loginId.trim(), passwordHash,
        accountStatusCode: 'active', createdBy: user.id, ...audit } });
      await tx.platformEnrollment.create({ data: { userId: user.id, statusCode: 'active', sourceCode: 'bootstrap', createdBy: user.id, ...audit } });
      return { loginId: dto.loginId.trim() };
    });
  }
}
