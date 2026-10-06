import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { redactSecretsInText } from '../security/secret-redaction.js';

const PMS_API_PATH_PREFIXES = [
  '/api/projects',
  '/api/customers',
  '/api/codes',
  '/api/menus',
  '/api/roles',
  '/api/master',
  '/api/home',
];

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestPath = request.path || request.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let responseCode: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const { message: msg, error, code: explicitCode } = res as Record<string, unknown>;
        if (msg) {
          message = Array.isArray(msg) ? msg.join(', ') : String(msg);
        }
        if (typeof explicitCode === 'string') {
          responseCode = explicitCode;
        }
        if (error) {
          code = String(error);
        }
        // Only the authorized DMS revision-conflict contract carries document data.
        // Do not forward arbitrary exception details from other endpoints.
        if (
          status === HttpStatus.CONFLICT
          && ['/api/dms/file', '/api/dms/content'].includes(requestPath)
          && error === 'Document conflict'
        ) {
          message = 'Document conflict';
          const source = (res as Record<string, unknown>).details;
          if (source && typeof source === 'object' && !Array.isArray(source)) {
            const values = source as Record<string, unknown>;
            details = {};
            for (const key of ['expectedRevisionSeq', 'currentRevisionSeq']) {
              if (typeof values[key] === 'number' && Number.isFinite(values[key])) details[key] = values[key];
            }
            for (const key of ['serverContent', 'serverContentHash', 'clientContentHash']) {
              if (typeof values[key] === 'string') details[key] = values[key];
            }
          }
        }
      }
    }

    message = redactSecretsInText(message);
    const sanitizedRequestUrl = redactSecretsInText(request.url);

    code = resolveErrorCode({
      requestPath,
      status,
      message,
      candidateCode: responseCode ?? code,
    });

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        path: sanitizedRequestUrl,
        statusCode: status,
      },
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  }
}

function resolveErrorCode(input: {
  requestPath: string;
  status: number;
  message: string;
  candidateCode: string;
}): string {
  if (!isPmsApiPath(input.requestPath)) {
    return input.candidateCode;
  }
  if (input.candidateCode.startsWith('PMS_')) {
    return input.candidateCode;
  }

  if (input.status === HttpStatus.UNAUTHORIZED) return 'PMS_AUTHENTICATION_REQUIRED';
  if (input.status === HttpStatus.FORBIDDEN) {
    return input.requestPath.includes('/projects/')
      ? 'PMS_PROJECT_PERMISSION_DENIED'
      : 'PMS_PERMISSION_DENIED';
  }
  if (input.status === HttpStatus.NOT_FOUND) {
    return resolvePmsNotFoundCode(input.requestPath, input.message);
  }
  if (input.status === HttpStatus.CONFLICT) {
    return resolvePmsConflictCode(input.message);
  }
  if (input.status === HttpStatus.TOO_MANY_REQUESTS) return 'PMS_RATE_LIMITED';
  if (input.status >= HttpStatus.INTERNAL_SERVER_ERROR) return 'PMS_INTERNAL_ERROR';
  if (input.status === HttpStatus.BAD_REQUEST) {
    return resolvePmsBadRequestCode(input.message);
  }

  return `PMS_HTTP_${input.status}`;
}

function isPmsApiPath(path: string): boolean {
  return PMS_API_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function resolvePmsNotFoundCode(path: string, message: string): string {
  if (path.includes('/members') || message.includes('Project member')) return 'PMS_PROJECT_MEMBER_NOT_FOUND';
  if (path.includes('/relations') || message.includes('Project relation')) return 'PMS_PROJECT_RELATION_NOT_FOUND';
  if (path.includes('/organizations') || message.includes('Organization')) return 'PMS_PROJECT_ORGANIZATION_NOT_FOUND';
  if (path.includes('/deliverables')) return 'PMS_DELIVERABLE_NOT_FOUND';
  if (path.includes('/close-conditions')) return 'PMS_CLOSE_CONDITION_NOT_FOUND';
  if (path.includes('/control')) return 'PMS_CONTROL_OBJECT_NOT_FOUND';
  if (path.includes('/tasks') || message.includes('Task')) return 'PMS_TASK_NOT_FOUND';
  if (path.includes('/milestones') || message.includes('Milestone')) return 'PMS_MILESTONE_NOT_FOUND';
  if (path.includes('/objectives') || message.includes('Objective')) return 'PMS_OBJECTIVE_NOT_FOUND';
  if (path.includes('/wbs') || message.includes('WBS')) return 'PMS_WBS_NOT_FOUND';
  if (path.includes('/master') || message.includes('Site') || message.includes('System')) return 'PMS_MASTER_REFERENCE_NOT_FOUND';
  if (path.includes('/customers') || message.includes('Customer')) return 'PMS_CUSTOMER_NOT_FOUND';
  if (path.includes('/projects') || message.includes('Project')) return 'PMS_PROJECT_NOT_FOUND';
  return 'PMS_RESOURCE_NOT_FOUND';
}

function resolvePmsConflictCode(message: string): string {
  if (message.includes('Member already')) return 'PMS_PROJECT_MEMBER_CONFLICT';
  if (message.includes('Project relation')) return 'PMS_PROJECT_RELATION_CONFLICT';
  if (message.includes('Import profile')) return 'PMS_MASTER_IMPORT_PROFILE_CONFLICT';
  if (message.includes('already exists')) return 'PMS_DUPLICATE_RESOURCE';
  return 'PMS_CONFLICT';
}

function resolvePmsBadRequestCode(message: string): string {
  if (/식별자|ID 형식|positive integer|숫자 ID|유효한 .*식별자/.test(message)) {
    return 'PMS_INVALID_IDENTIFIER';
  }
  if (/belongs to a different|same objective tree|자기 자신|cannot reference itself|must be different/.test(message)) {
    return 'PMS_INVALID_RELATION';
  }
  if (/doneResultCode|전이|산출물|종료조건|단계/.test(message)) {
    return 'PMS_STAGE_TRANSITION_BLOCKED';
  }
  if (/columnMapping|import|반입|rows|mapped column|CSV|TSV/.test(message)) {
    return 'PMS_MASTER_IMPORT_INVALID';
  }
  if (/inactive/.test(message)) {
    return 'PMS_REFERENCE_INACTIVE';
  }
  if (/was not found|not created or found/.test(message)) {
    return 'PMS_REFERENCE_NOT_FOUND';
  }
  if (/required|필수|필요합니다|is required/.test(message)) {
    return 'PMS_REQUIRED_FIELD_MISSING';
  }
  return 'PMS_BAD_REQUEST';
}
