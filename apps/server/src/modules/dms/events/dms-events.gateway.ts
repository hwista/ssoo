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
import { AuthService } from '../../common/auth/auth.service.js';
import { AccessService } from '../access/access.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { normalizePath } from '../collaboration/collaboration-paths.util.js';
import { configService } from '../runtime/dms-config.service.js';
import { resolveAbsolutePath } from '../search/search.helpers.js';
import type {
  DocumentCollaborationSnapshot,
  SoftLockTakeoverRequest,
  SoftLockTakeoverResponse,
} from '../collaboration/collaboration.service.js';

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

export interface DmsCollaborationChangedEvent {
  path: string;
  reason: 'join' | 'mode' | 'leave' | 'lock' | 'takeover' | 'publish' | 'refresh';
  snapshot: DocumentCollaborationSnapshot;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user?: TokenPayload;
    subscribedPaths?: Set<string>;
    accessToken?: string;
    treeSubscribed?: boolean;
  };
}

// ============================================================================
// Gateway
// ============================================================================

@WebSocketGateway({
  namespace: '/dms',
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class DmsEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly clients = new Map<string, AuthenticatedSocket>();

  private readonly connectedUsers = new Map<string, Set<string>>(); // userId → socketIds

  constructor(
    private readonly documentAclService: DocumentAclService,
    private readonly authService: AuthService,
    private readonly accessService: AccessService,
  ) {}

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

      const user = await verifyWsToken(token, this.authService);
      if (!user) {
        logger.warn('WebSocket 연결 거부: 유효하지 않은 토큰', { id: client.id });
        client.disconnect(true);
        return;
      }

      const access = await this.accessService.getAccessSnapshot(user);
      if (!access.features.canReadDocuments) {
        logger.warn('WebSocket 연결 거부: DMS 문서 읽기 권한 없음', {
          id: client.id,
          userId: user.userId,
        });
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      client.data.accessToken = token;
      this.clients.set(client.id, client);
      client.data.subscribedPaths = new Set();

      // Track connected user
      const existing = this.connectedUsers.get(user.userId) ?? new Set();
      existing.add(client.id);
      this.connectedUsers.set(user.userId, existing);

      logger.log(`WebSocket 연결 수립: ${user.loginId} (${client.id})`);
      client.emit('dms:ready', { ready: true });
    } catch {
      logger.warn('WebSocket 연결 중 오류', { id: client.id });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.clients.delete(client.id);
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
  async handleSubscribeDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { path: string },
  ): Promise<{ success: boolean; error?: string }> {
    if (!await this.refreshClientUser(client)) return { success: false, error: 'forbidden' };
    if (!client.data.user) return { success: false, error: 'not-ready' };
    if (!data?.path) return { success: false, error: 'invalid-path' };

    const documentPath = normalizePath(data.path);
    if (!documentPath || !this.canSubscribeDocument(client.data.user, documentPath)) {
      logger.warn('WebSocket 문서 구독 거부: 읽기 권한 없음', {
        userId: client.data.user.userId,
        loginId: client.data.user.loginId,
        documentPath,
      });
      return { success: false, error: 'forbidden' };
    }

    const roomName = this.documentRoom(documentPath);
    client.join(roomName);
    client.data.subscribedPaths?.add(documentPath);

    return { success: true };
  }

  @SubscribeMessage('unsubscribe:document')
  handleUnsubscribeDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { path: string },
  ): { success: boolean } {
    if (!data?.path) return { success: false };

    const documentPath = normalizePath(data.path);
    const roomName = this.documentRoom(documentPath);
    client.leave(roomName);
    client.data.subscribedPaths?.delete(documentPath);

    return { success: true };
  }

  @SubscribeMessage('subscribe:tree')
  async handleSubscribeTree(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ success: boolean }> {
    if (!await this.refreshClientUser(client)) return { success: false };
    client.data.treeSubscribed = true;
    if (!client.data.user) return { success: false };
    client.join('dms:tree');
    return { success: true };
  }

  private canSubscribeDocument(user: TokenPayload, documentPath: string): boolean {
    if (!/\.md$/i.test(documentPath)) {
      return false;
    }

    const absolutePath = resolveAbsolutePath(documentPath, configService.getDocDir());
    return this.documentAclService.isReadableAbsolutePath(user, absolutePath);
  }

  // --------------------------------------------------------------------------
  // Server-side event emission (called by CollaborationService)
  // --------------------------------------------------------------------------

  emitFileChanged(event: DmsFileChangedEvent): void {
    for (const filePath of event.paths) {
      this.dispatch('dms:file-changed', { ...event, paths: [filePath], path: filePath }, filePath);
    }
    if (event.action !== 'update' && event.action !== 'metadata') this.emitTreeChanged({ action: event.action });
  }

  emitPublishStatus(event: DmsPublishStatusEvent): void {
    this.dispatch('dms:publish-status', event, event.path, true);
  }

  emitTreeChanged(event: DmsTreeChangedEvent): void {
    this.dispatch('dms:tree-changed', event, undefined, true);
  }

  emitCollaborationChanged(event: DmsCollaborationChangedEvent): void {
    this.dispatch('dms:collaboration-changed', { ...event, path: normalizePath(event.path) }, event.path);
  }

  emitLockTakeoverRequested(ownerUserId: string, event: SoftLockTakeoverRequest): void {
    this.dispatch('dms:lock-takeover-requested', event, event.path, false, ownerUserId);
  }

  emitLockTakeoverResponded(requesterUserId: string, event: SoftLockTakeoverResponse): void {
    this.dispatch('dms:lock-takeover-responded', event, event.path, false, requesterUserId);
  }

  private documentRoom(filePath: string): string {
    return `doc:${normalizePath(filePath)}`;
  }

  private async refreshClientUser(client: AuthenticatedSocket): Promise<boolean> {
    try {
      const token = client.data.accessToken;
      const user = token ? await verifyWsToken(token, this.authService) : null;
      if (!user || !(await this.accessService.getAccessSnapshot(user)).features.canReadDocuments) {
        client.disconnect(true);
        this.clients.delete(client.id);
        return false;
      }
      client.data.user = user;
      return true;
    } catch {
      client.disconnect(true);
      this.clients.delete(client.id);
      return false;
    }
  }

  private dispatch(eventName: string, payload: unknown, documentPath?: string, includeTree = false, userId?: string): void {
    const normalizedPath = documentPath ? normalizePath(documentPath) : undefined;
    for (const client of this.clients.values()) {
      if (userId ? client.data.user?.userId !== userId
        : !((normalizedPath && client.data.subscribedPaths?.has(normalizedPath)) || (includeTree && client.data.treeSubscribed))) continue;
      void this.emitAuthorized(client, eventName, payload, normalizedPath).catch(error => {
        logger.warn(`DMS event delivery failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  }

  private async emitAuthorized(client: AuthenticatedSocket, eventName: string, payload: unknown, documentPath?: string): Promise<void> {
    if (!await this.refreshClientUser(client) || !client.data.user) return;
    if (documentPath && !this.canSubscribeDocument(client.data.user, documentPath)) {
      client.data.subscribedPaths?.delete(documentPath);
      await client.leave(this.documentRoom(documentPath));
      return;
    }
    client.emit(eventName, payload);
  }

  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  isUserConnected(userId: string): boolean {
    return Boolean(this.connectedUsers.get(userId)?.size);
  }
}
