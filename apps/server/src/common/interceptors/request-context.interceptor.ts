/**
 * Request Context Interceptor
 * 
 * 모든 요청에 대해 컨텍스트를 설정하여 Prisma 미들웨어에서 사용
 * - userId: 현재 로그인 사용자 ID
 * - transactionId: 요청별 고유 UUID
 * - source: 데이터 변경 출처
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { runWithContext, RequestContext } from '@ssoo/database';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    
    // JWT 인증된 사용자 정보 추출
    const user = request.user;
    
    // 요청 컨텍스트 설정
    const requestContext: RequestContext = {
      userId: user?.userId ? BigInt(user.userId) : undefined,
      source: 'API',
      transactionId: uuidv4(),
    };

    // 요청 객체에도 transactionId 추가 (로깅용)
    request.transactionId = requestContext.transactionId;

    // 컨텍스트와 함께 핸들러 실행
    return new Observable((subscriber) => {
      runWithContext(requestContext, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
