import { jest } from '@jest/globals';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

describe('DmsConfigService (singleton)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DMS_INSTANCE_ENV;
    delete process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL;
    delete process.env.DMS_GIT_BOOTSTRAP_BRANCH;
    delete process.env.DMS_GIT_PROD_REMOTE_URL;
    delete process.env.DMS_GIT_DEV_REMOTE_URL;
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

  describe('git role contract', () => {
    it('requires DMS_INSTANCE_ENV before resolving the bootstrap binding', () => {
      expect(() => configService.getGitBootstrapBinding()).toThrow(/DMS_INSTANCE_ENV/);
    });

    it('uses the prod document repo by default for prod instances', () => {
      process.env.DMS_INSTANCE_ENV = 'prod';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'prod',
        bootstrapRemoteUrl: 'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
        bootstrapBranch: 'master',
      });
    });

    it('uses the dev document repo by default for dev instances', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'dev',
        bootstrapRemoteUrl: 'git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git',
        bootstrapBranch: 'master',
      });
    });

    it('allows local-test instances to stay remote-empty', () => {
      process.env.DMS_INSTANCE_ENV = 'local-test';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'local-test',
        bootstrapRemoteUrl: undefined,
        bootstrapBranch: 'master',
      });
    });

    it('accepts role-specific remote overrides', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';
      process.env.DMS_GIT_DEV_REMOTE_URL = 'ssh://git@10.125.31.72/LSITC_WEB/LSWIKI_DOC_DEV_ALT.git';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'dev',
        bootstrapRemoteUrl: 'ssh://git@10.125.31.72/LSITC_WEB/LSWIKI_DOC_DEV_ALT.git',
        bootstrapBranch: 'master',
      });
    });

    it('rejects explicit bootstrap remotes that do not match the role contract', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = 'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git';

      expect(() => configService.assertGitBootstrapContract()).toThrow(/DMS git role contract invalid/);
    });

    it('treats a blank bootstrap remote env as an explicit cleanup override', async () => {
      await configService.updateConfig({
        git: {
          bootstrapRemoteUrl: 'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
        },
      });
      process.env.DMS_INSTANCE_ENV = 'local-test';
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = '   ';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'local-test',
        bootstrapRemoteUrl: undefined,
        bootstrapBranch: 'master',
      });
    });

    it('lets an explicit branch override win over the default', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';
      process.env.DMS_GIT_BOOTSTRAP_BRANCH = 'release';

      expect(configService.getGitBootstrapBinding().bootstrapBranch).toBe('release');
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
