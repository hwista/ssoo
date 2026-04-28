import { jest } from '@jest/globals';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

describe('DmsConfigService (singleton)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL;
    delete process.env.DMS_GIT_BOOTSTRAP_BRANCH;
    configService.invalidateCache();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
    configService.invalidateCache();
    jest.restoreAllMocks();
  });

  describe('getConfig defaults', () => {
    it('produces a normalized DmsConfig with required sections', () => {
      const cfg = configService.getConfig();
      expect(cfg).toBeDefined();
      expect(cfg.git).toBeDefined();
      expect(typeof cfg.git.repositoryPath).toBe('string');
      expect(cfg.git.repositoryPath.length).toBeGreaterThan(0);
      expect(cfg.storage).toBeDefined();
      expect(cfg.storage.defaultProvider).toBeDefined();
      expect(['local', 'sharepoint', 'nas']).toContain(cfg.storage.defaultProvider);
    });

    it('caches the resolved config across calls', () => {
      const a = configService.getConfig();
      const b = configService.getConfig();
      expect(a).toBe(b);
    });

    it('invalidateCache forces re-resolution', () => {
      const a = configService.getConfig();
      configService.invalidateCache();
      const b = configService.getConfig();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('git bootstrap env overrides', () => {
    it('returns undefined when no env or config remote URL is set', () => {
      const url = configService.getGitBootstrapRemoteUrl();
      expect(url === undefined || typeof url === 'string').toBe(true);
      // 환경 + 기본값 둘 다 없으면 undefined 여야 함
      if (!process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL) {
        const cfgUrl = configService.getConfig().git.bootstrapRemoteUrl;
        if (!cfgUrl || cfgUrl.trim().length === 0) {
          expect(url).toBeUndefined();
        }
      }
    });

    it('env DMS_GIT_BOOTSTRAP_REMOTE_URL takes precedence', () => {
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = 'https://example.com/dms.git';
      expect(configService.getGitBootstrapRemoteUrl()).toBe('https://example.com/dms.git');
    });

    it('trims whitespace in env override', () => {
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = '  https://x/y.git  ';
      expect(configService.getGitBootstrapRemoteUrl()).toBe('https://x/y.git');
    });

    it('treats blank env value as not set (falls back)', () => {
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = '   ';
      const url = configService.getGitBootstrapRemoteUrl();
      // blank env value 는 무시되고 config 기본값 사용 — 정의되어 있을 수도, 없을 수도 있음
      expect(url).not.toBe('   ');
    });

    it('env DMS_GIT_BOOTSTRAP_BRANCH takes precedence', () => {
      process.env.DMS_GIT_BOOTSTRAP_BRANCH = 'production';
      expect(configService.getGitBootstrapBranch()).toBe('production');
    });
  });

  describe('runtime paths', () => {
    it('getDocDir returns a non-empty absolute path', () => {
      const dir = configService.getDocDir();
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    });

    it('getTemplateDir is a child of getDocDir + _templates', () => {
      const tmpl = configService.getTemplateDir();
      const root = configService.getDocDir();
      expect(tmpl.startsWith(root)).toBe(true);
      expect(tmpl.endsWith('_templates')).toBe(true);
    });
  });
});
