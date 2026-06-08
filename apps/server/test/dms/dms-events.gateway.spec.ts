import { jest } from '@jest/globals';
import { DmsEventsGateway } from '../../src/modules/dms/events/dms-events.gateway.js';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';

const tokenFor = (userId = '42'): TokenPayload => ({
  userId,
  loginId: `user-${userId}`,
  roleCode: 'user',
  sessionId: `session-${userId}`,
});

function createClient(user = tokenFor()) {
  return {
    data: {
      user,
      subscribedPaths: new Set<string>(),
    },
    join: jest.fn(),
    leave: jest.fn(),
  };
}

describe('DmsEventsGateway', () => {
  it('subscribes readable markdown documents to their document room', () => {
    const documentAclService = {
      isReadableAbsolutePath: jest.fn(() => true),
    };
    const gateway = new DmsEventsGateway(documentAclService as never);
    const client = createClient();

    const result = gateway.handleSubscribeDocument(client as never, { path: '/docs/a.md' });

    expect(result).toEqual({ success: true });
    expect(documentAclService.isReadableAbsolutePath).toHaveBeenCalledWith(
      client.data.user,
      expect.stringContaining('docs/a.md'),
    );
    expect(client.join).toHaveBeenCalledWith('doc:docs/a.md');
    expect(client.data.subscribedPaths.has('docs/a.md')).toBe(true);
  });

  it('rejects unreadable markdown document subscriptions', () => {
    const documentAclService = {
      isReadableAbsolutePath: jest.fn(() => false),
    };
    const gateway = new DmsEventsGateway(documentAclService as never);
    const client = createClient();

    const result = gateway.handleSubscribeDocument(client as never, { path: 'secret/a.md' });

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(client.join).not.toHaveBeenCalled();
    expect(client.data.subscribedPaths.size).toBe(0);
  });

  it('rejects non-markdown document room subscriptions', () => {
    const documentAclService = {
      isReadableAbsolutePath: jest.fn(() => true),
    };
    const gateway = new DmsEventsGateway(documentAclService as never);
    const client = createClient();

    const result = gateway.handleSubscribeDocument(client as never, { path: 'assets/a.png' });

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(documentAclService.isReadableAbsolutePath).not.toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });
});
