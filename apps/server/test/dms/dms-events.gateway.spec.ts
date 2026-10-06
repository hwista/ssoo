import { jest } from '@jest/globals';
import { DmsEventsGateway } from '../../src/modules/dms/events/dms-events.gateway.js';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';

const tokenFor = (userId = '42'): TokenPayload => ({
  userId,
  loginId: `user-${userId}`,
  sessionId: `session-${userId}`,
  type: 'access',
});

function createClient(user = tokenFor()) {
  return {
    id: 'sharing-socket',
    handshake: { auth: { token: 'valid-token' }, headers: {} },
    data: {
      user,
      accessToken: 'valid-token',
      subscribedPaths: new Set<string>(),
    },
    disconnect: jest.fn(),
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  };
}

describe('DmsEventsGateway', () => {
  it('rechecks document access before delivery and removes a revoked subscription', async () => {
    const documentAclService = { isReadableAbsolutePath: jest.fn(() => true) };
    const gateway = createGateway(documentAclService);
    const client = createClient();
    await gateway.handleConnection(client as never);
    await gateway.handleSubscribeDocument(client as never, { path: 'docs/a.md' });
    client.emit.mockClear();
    documentAclService.isReadableAbsolutePath.mockReturnValue(false);
    gateway.emitFileChanged({ action: 'update', paths: ['docs/a.md'], userId: '42' });
    await new Promise(resolve => setImmediate(resolve));
    expect(client.emit).not.toHaveBeenCalled();
    expect(client.leave).toHaveBeenCalledWith('doc:docs/a.md');
    expect(client.data.subscribedPaths.size).toBe(0);
  });

  it('does not disclose unreadable paths through tree publish events', async () => {
    const documentAclService = { isReadableAbsolutePath: jest.fn(() => false) };
    const gateway = createGateway(documentAclService);
    const client = createClient();
    await gateway.handleConnection(client as never);
    await gateway.handleSubscribeTree(client as never);
    client.emit.mockClear();
    gateway.emitPublishStatus({ path: 'secret/a.md', status: 'published' });
    await new Promise(resolve => setImmediate(resolve));
    expect(client.emit).not.toHaveBeenCalled();
  });

  it('disconnects an existing subscriber whose service access was revoked', async () => {
    const snapshot = jest.fn(async () => ({ features: { canReadDocuments: true } }));
    const gateway = new DmsEventsGateway(
      { isReadableAbsolutePath: () => true } as never,
      { validateToken: async () => tokenFor() } as never,
      { getAccessSnapshot: snapshot } as never,
    );
    const client = createClient();
    await gateway.handleConnection(client as never);
    await gateway.handleSubscribeTree(client as never);
    client.emit.mockClear();
    snapshot.mockResolvedValue({ features: { canReadDocuments: false } });
    gateway.emitTreeChanged({ action: 'sync' });
    await new Promise(resolve => setImmediate(resolve));
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).not.toHaveBeenCalled();
  });

  function createGateway(documentAclService: object) {
    return new DmsEventsGateway(
      documentAclService as never,
      { validateToken: jest.fn(async () => tokenFor()) } as never,
      {
        getAccessSnapshot: jest.fn(async () => ({
          features: { canReadDocuments: true },
        })),
      } as never,
    );
  }

  it('subscribes readable markdown documents to their document room', async () => {
    const documentAclService = {
      isReadableAbsolutePath: jest.fn(() => true),
    };
    const gateway = createGateway(documentAclService);
    const client = createClient();

    const result = await gateway.handleSubscribeDocument(client as never, { path: '/docs/a.md' });

    expect(result).toEqual({ success: true });
    expect(documentAclService.isReadableAbsolutePath).toHaveBeenCalledWith(
      client.data.user,
      expect.stringContaining('docs/a.md'),
    );
    expect(client.join).toHaveBeenCalledWith('doc:docs/a.md');
    expect(client.data.subscribedPaths.has('docs/a.md')).toBe(true);
  });

  it('rejects unreadable markdown document subscriptions', async () => {
    const documentAclService = {
      isReadableAbsolutePath: jest.fn(() => false),
    };
    const gateway = createGateway(documentAclService);
    const client = createClient();

    const result = await gateway.handleSubscribeDocument(client as never, { path: 'secret/a.md' });

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(client.join).not.toHaveBeenCalled();
    expect(client.data.subscribedPaths.size).toBe(0);
  });

  it('rejects non-markdown document room subscriptions', async () => {
    const documentAclService = {
      isReadableAbsolutePath: jest.fn(() => true),
    };
    const gateway = createGateway(documentAclService);
    const client = createClient();

    const result = await gateway.handleSubscribeDocument(client as never, { path: 'assets/a.png' });

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(documentAclService.isReadableAbsolutePath).not.toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('rejects a WebSocket connection when the access-token session is no longer active', async () => {
    const gateway = new DmsEventsGateway(
      { isReadableAbsolutePath: jest.fn(() => true) } as never,
      { validateToken: jest.fn(async () => null) } as never,
      { getAccessSnapshot: jest.fn() } as never,
    );
    const client = {
      id: 'socket-1',
      handshake: { auth: { token: 'revoked-token' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects a WebSocket connection without DMS document read permission', async () => {
    const gateway = new DmsEventsGateway(
      { isReadableAbsolutePath: jest.fn(() => true) } as never,
      { validateToken: jest.fn(async () => tokenFor()) } as never,
      {
        getAccessSnapshot: jest.fn(async () => ({
          features: { canReadDocuments: false },
        })),
      } as never,
    );
    const client = {
      id: 'socket-2',
      handshake: { auth: { token: 'valid-token' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
