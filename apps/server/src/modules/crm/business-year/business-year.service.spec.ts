import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DatabaseService } from '../../../database/database.service.js';
import { BusinessYearService } from './business-year.service.js';

const row = { id: 9007199254740993n, year: 2026, displayName: '2026 회계연도', sortOrder: 17, isActive: false };

function createService() {
  const model = {
    findMany: jest.fn<() => Promise<typeof row[]>>().mockResolvedValue([row]),
    create: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
    update: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
    updateMany: jest.fn<(input: unknown) => Promise<{ count: number }>>().mockResolvedValue({ count: 1 }),
    findUnique: jest.fn<(input: unknown) => Promise<typeof row | null>>().mockResolvedValue(row),
    delete: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
  };
  const transaction = { crmBusinessYear: model };
  const db = {
    client: {
      ...transaction,
      $transaction: async <T>(operation: (tx: typeof transaction) => Promise<T>) => operation(transaction),
    },
  } as unknown as DatabaseService;
  return { service: new BusinessYearService(db), model };
}

describe('BusinessYearService', () => {
  it('should preserve migrated labels, ordering and IDs beyond Number precision', async () => {
    const { service } = createService();
    await expect(service.list()).resolves.toEqual([{ ...row, id: '9007199254740993' }]);
  });

  it.each([1999, 2101, 2026.5, Number.NaN])('should reject invalid year %s before writing', async (year) => {
    const { service, model } = createService();
    await expect(service.create(year, 42n)).rejects.toThrow(BadRequestException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it.each([2000, 2100])('should accept boundary year %s and record its actor', async (year) => {
    const { service, model } = createService();
    await service.create(year, 42n);
    expect(model.create).toHaveBeenCalledWith({
      data: { year, displayName: `${year}년`, sortOrder: year, createdBy: 42n, updatedBy: 42n },
    });
  });

  it('should report duplicate years as conflicts and preserve unexpected database errors', async () => {
    const { service, model } = createService();
    model.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(service.create(2026, 42n)).rejects.toThrow(ConflictException);
    const failure = new Error('database unavailable');
    model.create.mockRejectedValueOnce(failure);
    await expect(service.create(2026, 42n)).rejects.toBe(failure);
  });

  it.each(['0', '-1', '1.5', 'invalid', '9223372036854775808'])('should reject invalid ID %s before mutation', async (id) => {
    const { service, model } = createService();
    await expect(service.setActive(id, true, 42n)).rejects.toThrow(BadRequestException);
    await expect(service.remove(id, 42n)).rejects.toThrow(BadRequestException);
    expect(model.update).not.toHaveBeenCalled();
    expect(model.updateMany).not.toHaveBeenCalled();
    expect(model.delete).not.toHaveBeenCalled();
  });

  it('should activate using the exact ID and return not found for a missing year', async () => {
    const { service, model } = createService();
    await service.setActive(row.id.toString(), true, 42n);
    expect(model.update).toHaveBeenCalledWith({ where: { id: row.id }, data: { isActive: true, updatedBy: 42n } });
    model.update.mockRejectedValueOnce({ code: 'P2025' });
    await expect(service.setActive(row.id.toString(), true, 42n)).rejects.toThrow(NotFoundException);
  });

  it('should delete only after atomically matching an inactive year and recording the actor', async () => {
    const { service, model } = createService();
    await expect(service.remove(row.id.toString(), 42n)).resolves.toEqual({ id: row.id.toString() });
    expect(model.updateMany).toHaveBeenCalledWith({ where: { id: row.id, isActive: false }, data: { updatedBy: 42n } });
    expect(model.delete).toHaveBeenCalledWith({ where: { id: row.id } });
    expect(model.updateMany.mock.invocationCallOrder[0]).toBeLessThan(model.delete.mock.invocationCallOrder[0]);
  });

  it('should refuse deletion when the year is active, including concurrent reactivation', async () => {
    const { service, model } = createService();
    model.updateMany.mockResolvedValueOnce({ count: 0 });
    model.findUnique.mockResolvedValueOnce({ ...row, isActive: true });
    await expect(service.remove(row.id.toString(), 42n)).rejects.toThrow(BadRequestException);
    expect(model.delete).not.toHaveBeenCalled();
  });

  it('should return not found when the deletion target no longer exists', async () => {
    const { service, model } = createService();
    model.updateMany.mockResolvedValueOnce({ count: 0 });
    model.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove(row.id.toString(), 42n)).rejects.toThrow(NotFoundException);
    expect(model.delete).not.toHaveBeenCalled();
  });
});
