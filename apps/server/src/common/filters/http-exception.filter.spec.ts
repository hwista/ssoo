import { BadRequestException, HttpException, type ArgumentsHost } from '@nestjs/common';
import { jest } from '@jest/globals';
import { GlobalHttpExceptionFilter } from './http-exception.filter.js';

describe('GlobalHttpExceptionFilter secret masking', () => {
  it('redacts exception messages and sensitive query values from the response', () => {
    const marker = 'crm-s10-secret-marker';
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          path: '/api/crm/operations/attempts/invalid',
          url: `/api/crm/operations/attempts/invalid?access_token=${marker}`,
        }),
      }),
    } as unknown as ArgumentsHost;

    new GlobalHttpExceptionFilter().catch(
      new BadRequestException(`postgresql://operator:${marker}@db.internal/crm`),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    const payload = JSON.stringify(json.mock.calls[0]?.[0]);
    expect(payload).not.toContain(marker);
    expect(payload).toContain('***');
  });
});

describe('GlobalHttpExceptionFilter DMS conflict recovery', () => {
  it.each(['/api/dms/file', '/api/dms/content'])('preserves the revision comparison contract for %s', path => {
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }) }),
        getRequest: () => ({ path, url: path }),
      }),
    } as unknown as ArgumentsHost;
    const details = { expectedRevisionSeq: 1, currentRevisionSeq: 2, serverContent: 'latest document', serverContentHash: 'server-hash', clientContentHash: 'draft-hash' };
    new GlobalHttpExceptionFilter().catch(new HttpException({ error: 'Document conflict', details: { ...details, internalSecret: 'must-not-leak' } }, 409), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ message: 'Document conflict', statusCode: 409 }), details,
    }));
    expect(JSON.stringify(json.mock.calls)).not.toContain('must-not-leak');
  });

  it.each([
    ['/api/users', 409, 'Document conflict'],
    ['/api/dms/file', 403, 'Document conflict'],
    ['/api/dms/file', 409, 'Already exists'],
  ])('does not expose arbitrary exception details at %s (%s, %s)', (path, status, error) => {
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }) }),
        getRequest: () => ({ path, url: path }),
      }),
    } as unknown as ArgumentsHost;
    new GlobalHttpExceptionFilter().catch(new HttpException({ error, details: { serverContent: 'private-marker' } }, Number(status)), host);
    expect(JSON.stringify(json.mock.calls)).not.toContain('private-marker');
  });
});
