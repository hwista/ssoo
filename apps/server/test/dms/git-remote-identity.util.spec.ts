import {
  gitRemoteIdentitiesMatch,
  normalizeGitRemoteIdentity,
} from '../../src/modules/dms/runtime/git-remote-identity.util.js';

describe('git remote identity utilities', () => {
  it('normalizes HTTPS remotes to host/path identity', () => {
    expect(normalizeGitRemoteIdentity('http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git')).toBe(
      '10.125.31.72/LSITC_WEB/LSWIKI_DOC',
    );
  });

  it('normalizes SCP-style SSH remotes to the same identity', () => {
    expect(normalizeGitRemoteIdentity('git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git')).toBe(
      '10.125.31.72/LSITC_WEB/LSWIKI_DOC_DEV',
    );
  });

  it('matches equivalent HTTP and SSH remotes transport-independently', () => {
    expect(
      gitRemoteIdentitiesMatch(
        'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
        'git@10.125.31.72:LSITC_WEB/LSWIKI_DOC.git',
      ),
    ).toBe(true);
  });

  it('does not match different repository paths', () => {
    expect(
      gitRemoteIdentitiesMatch(
        'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
        'git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git',
      ),
    ).toBe(false);
  });
});
