/**
 * 서비스 레이어 진입점
 */

// Types
export type {
  ServiceResult,
  ServiceError,
  ServiceConfig,
  ServiceMetadata,
  ValidationResult,
  CreateFileOptions,
  ReadFileOptions,
  UpdateFileOptions,
  DeleteFileOptions,
  CreateFolderOptions,
  RenameOptions,
  GetTreeOptions,
  SearchOptions,
} from './types/ServiceTypes';

// Base Classes
export { BaseService } from './base/BaseService';
export { ServiceEventBus, serviceEventBus } from './base/ServiceEvents';
export type { ServiceEventMap } from './base/ServiceEvents';

// File System Service
export { FileSystemService, fileSystemService } from './fileSystem/FileSystemService';

// Utility functions for service layer
import type { ServiceResult, ServiceError } from './types/ServiceTypes';
import { BaseService } from './base/BaseService';

export const createServiceInstance = <T extends BaseService>(
  ServiceClass: new (...args: unknown[]) => T,
  ...args: unknown[]
): T => {
  return new ServiceClass(...args);
};

export const isServiceResult = <T>(obj: unknown): obj is ServiceResult<T> => {
  return obj !== null && typeof obj === 'object' && 'success' in obj && typeof (obj as ServiceResult<T>).success === 'boolean';
};

export const isServiceError = (obj: unknown): obj is ServiceError => {
  return obj !== null && typeof obj === 'object' && 'code' in obj && 'message' in obj;
};