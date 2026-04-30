import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { verifyWsToken } from './ws-jwt.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const logger = new Logger('DmsEventsGateway');

// ============================================================================
// Types
// ============================================================================

export interface DmsFileChangedEvent {
  action: 'create' | 'update' | 'rename' | 'delete' | 'metadata';
  paths: string[];
  userId: string;
  userName?: string;
  revisionSeq?: number;
  commitHash?: string;
}

export interface DmsPublishStatusEvent {
  path: string;
  status: string;
  commitHash?: string;
  error?: string;
}

export interface DmsTreeChangedEvent {
  action: 'create' | 'rename' | 'delete' | 'sync';
}

/**
 * 문서 access state 변경 이벤트 — visibility / grant / ownership 등 ACL 영향 변경 시 emit.
 * 모든 dms 클라이언트가 받아 search / file tree / managed documents query 를 invalidate.
 */
export interface DmsAccessChangedEvent {
  documentId: string;
  relativePath?: string;
  reason: 'visibility' | 'ownership' | 'grant-revoked' | 'grant-created';
  actorUserId?: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user?: TokenPayload;
    subscribedPaths?: Set<string>;
  };
}

// ============================================================================
// Gateway
// ============================================================================

@WebSocketGateway({
  namespace: '/dms',
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class DmsEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly connectedUsers = new Map<string, Set<string>>(); // userId → socketIds

  // --------------------------------------------------------------------------
  // Connection lifecycle
  // --------------------------------------------------------------------------

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token as string | undefined
        ?? client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('WebSocket 연결 거부: 토큰 없음', { id: client.id });
        client.disconnect(true);
        return;
      }

      const user = await verifyWsToken(token);
      if (!user) {
        logger.warn('WebSocket 연결 거부: 유효하지 않은 토큰', { id: client.id });
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      client.data.subscribedPaths = new Set();

      // Track connected user
      const existing = this.connectedUsers.get(user.userId) ?? new Set();
      existing.add(client.id);
      this.connectedUsers.set(user.userId, existing);

      logger.log(`WebSocket 연결 수립: ${user.loginId} (${client.id})`);
    } catch {
      logger.warn('WebSocket 연결 중 오류', { id: client.id });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const user = client.data?.user;
    if (user) {
      const sockets = this.connectedUsers.get(user.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.connectedUsers.delete(user.userId);
      }
      logger.log(`WebSocket 연결 해제: ${user.loginId} (${client.id})`);
    }
  }

  // --------------------------------------------------------------------------
  // Client subscriptions (document room join/leave)
  // --------------------------------------------------------------------------

  @SubscribeMessage('subscribe:document')
  handleSubscribeDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { path: string },
  ): { success: boolean } {
    if (!client.data.user || !data?.path) return { success: false };

    const roomName = this.documentRoom(data.path);
    client.join(roomName);
    client.data.subscribedPaths?.add(data.path);

    return { success: true };
  }

  @SubscribeMessage('unsubscribe:document')
  handleUnsubscribeDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { path: string },
  ): { success: boolean } {
    if (!data?.path) return { success: false };

    const roomName = this.documentRoom(data.path);
    client.leave(roomName);
    client.data.subscribedPaths?.delete(data.path);

    return { success: true };
  }

  @SubscribeMessage('subscribe:tree')
  handleSubscribeTree(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): { success: boolean } {
    if (!client.data.user) return { success: false };
    client.join('dms:tree');
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Server-side event emission (called by CollaborationService)
  // --------------------------------------------------------------------------

  emitFileChanged(event: DmsFileChangedEvent): void {
    for (const filePath of event.paths) {
      const roomName = this.documentRoom(filePath);
      this.server?.to(roomName).emit('dms:file-changed', {
        ...event,
        path: filePath,
      });
    }

    // Tree-level notification for create/rename/delete
    if (event.action !== 'update' && event.action !== 'metadata') {
      this.server?.to('dms:tree').emit('dms:tree-changed', {
        action: event.action,
      } satisfies DmsTreeChangedEvent);
    }
  }

  emitPublishStatus(event: DmsPublishStatusEvent): void {
    const roomName = this.documentRoom(event.path);
    this.server?.to(roomName).emit('dms:publish-status', event);
  }

  emitTreeChanged(event: DmsTreeChangedEvent): void {
    this.server?.to('dms:tree').emit('dms:tree-changed', event);
  }

  /**
   * 문서 ACL/visibility 변경 broadcast — 모든 dms 사용자가 search/tree cache 를 invalidate 하도록.
   * tree room 으로 보내 모든 인증된 dms 클라이언트에게 도달 (개별 doc room 가입 여부와 무관).
   */
  emitAccessChanged(event: DmsAccessChangedEvent): void {
    this.server?.to('dms:tree').emit('dms:access-changed', event);
    if (event.relativePath) {
      const roomName = this.documentRoom(event.relativePath);
      this.server?.to(roomName).emit('dms:access-changed', event);
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private documentRoom(filePath: string): string {
    return `doc:${filePath}`;
  }

  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }
}
