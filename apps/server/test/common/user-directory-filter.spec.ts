import { jest } from '@jest/globals';
import { UserController } from '../../src/modules/common/user/user.controller.js';

describe('User directory activation filter', () => {
  it('keeps explicit false distinct from the unrestricted list and preserves pagination totals', async () => {
    const findAll = jest.fn<(...args: unknown[]) => Promise<{ data: unknown[]; total: number }>>()
      .mockResolvedValue({ data: [], total: 37 });
    const controller = new UserController({ findAll } as never);
    const result = await controller.findAll('2', '20', undefined, undefined, 'false');
    expect(findAll).toHaveBeenLastCalledWith({ page: 2, limit: 20, isActive: false });
    expect(result.meta.total).toBe(37);
    await controller.findAll();
    expect(findAll).toHaveBeenLastCalledWith({ page: 1, limit: 20, isActive: undefined });
  });

  it('keeps an explicit target independent from the first page and rejects malformed IDs', async () => {
    const findAll = jest.fn<(...args: unknown[]) => Promise<{ data: unknown[]; total: number }>>().mockResolvedValue({ data: [], total: 1 });
    const controller = new UserController({ findAll } as never);
    await controller.findAll(undefined, undefined, undefined, undefined, undefined, '12345');
    expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ userId: '12345' }));
    await expect(controller.findAll(undefined, undefined, undefined, undefined, undefined, 'bad')).rejects.toThrow('사용자 ID');
  });

  it('rejects malformed activation filters before querying', async () => {
    const findAll = jest.fn();
    const controller = new UserController({ findAll } as never);
    await expect(controller.findAll(undefined, undefined, undefined, undefined, 'inactive')).rejects.toThrow('활성 조건');
    expect(findAll).not.toHaveBeenCalled();
  });
});
