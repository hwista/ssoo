/**
 * 서비스 레이어 진입점
 */

// File System Service
export {
  fileSystemService,
  type ServiceResult,
  type GetTreeOptions,
} from './fileSystem/FileSystemService';

// Git Service
export {
  gitService,
  type GitChangeEntry,
  type GitLogEntry,
  type GitDiffResult,
  type GitFileStatus,
  type GitResult,
} from './git/GitService';