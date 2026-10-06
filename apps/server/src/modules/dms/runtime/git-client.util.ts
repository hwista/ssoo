import path from 'path';
import {
  simpleGit,
  type SimpleGit,
  type SimpleGitOptions,
} from 'simple-git';

type DmsGitOptions = Pick<SimpleGitOptions, 'baseDir' | 'config' | 'unsafe'>;

/**
 * Build a DMS-scoped Git client configuration.
 *
 * The document working tree is bind-mounted in production, so its host owner
 * can differ from the container user. Trust only the resolved document root
 * for each command instead of changing the container's global Git config.
 */
export function buildDmsGitOptions(
  rootPath: string,
  environment: NodeJS.ProcessEnv = process.env,
): DmsGitOptions {
  const resolvedRoot = path.resolve(rootPath);
  const config = [`safe.directory=${resolvedRoot}`];
  const scope = environment.DMS_GIT_HTTP_AUTH_SCOPE;
  const helper = '!f() { cat /run/secrets/dms_git_http_credentials; }; f';

  // simple-git 4 filters GIT_CONFIG_* from child environments. Reconstruct only
  // the exact credential contract emitted by our container entrypoint; never
  // allow arbitrary inherited Git configuration or copy credential contents.
  let validScope = false;
  try {
    const url = new URL(scope ?? '');
    validScope = ['http:', 'https:'].includes(url.protocol) && url.origin === scope;
  } catch {
    // No scoped container credential configuration is present.
  }
  if (validScope && environment.GIT_CONFIG_COUNT === '2'
    && environment.GIT_CONFIG_KEY_0 === `credential.${scope}.helper`
    && environment.GIT_CONFIG_VALUE_0 === helper
    && environment.GIT_CONFIG_KEY_1 === `credential.${scope}.useHttpPath`
    && environment.GIT_CONFIG_VALUE_1 === 'false') {
    config.push(`credential.${scope}.helper=${helper}`, `credential.${scope}.useHttpPath=false`);
  }

  return {
    baseDir: resolvedRoot,
    config,
    // The fixed helper intentionally reads a Docker secret. Opt in only after
    // validating its complete entrypoint contract; other unsafe guards remain.
    ...(config.length > 1 ? { unsafe: { allowUnsafeCredentialHelper: true } } : {}),
  };
}

export function createDmsGitClient(rootPath: string): SimpleGit {
  return simpleGit(buildDmsGitOptions(rootPath));
}
