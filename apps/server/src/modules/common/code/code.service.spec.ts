import { BadRequestException, ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DatabaseService } from '../../../database/database.service.js';
import { CodeService } from './code.service.js';
import { CodeController } from './code.controller.js';

function fixture() {
  const row = { id: 9007199254740993n, codeGroup: 'payment_term', codeValue: 'QA', displayNameKo: '검수', isActive: true, updatedAt: new Date('2026-11-04T00:00:00Z') };
  const model = {
    findUnique: jest.fn<() => Promise<typeof row | null>>().mockResolvedValue(row),
    findFirst: jest.fn<() => Promise<{ id: bigint } | null>>().mockResolvedValue(null),
    update: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
    count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
    create: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
  };
  const client = { cmCode: model };
  const service = new CodeService({ client: { ...client, $transaction: async (fn: (tx: typeof client) => Promise<unknown>) => fn(client) } } as unknown as DatabaseService);
  return { service, controller: new CodeController(service), model, row };
}

describe('CodeService input contract', () => {
  it.each(['', '   ', null])('rejects blank update display names before writing: %s', async (name) => {
    const { service, model, row } = fixture();
    await expect(service.update(row.id, { displayNameKo: name as unknown as string })).rejects.toThrow(BadRequestException);
    expect(model.update).not.toHaveBeenCalled();
  });

  it('trims updated names while preserving the exact bigint identifier', async () => {
    const { controller, model, row } = fixture();
    await controller.update(row.id.toString(), { displayNameKo: '  변경된 수금조건  ' });
    expect(model.update).toHaveBeenCalledWith({ where: { id: row.id }, data: { displayNameKo: '변경된 수금조건' } });
  });

  it.each(['0', '-1', '1.5', 'bad', '9223372036854775808'])('rejects malformed IDs across update and deletion routes: %s', async (id) => {
    const { controller, model } = fixture();
    await expect(controller.update(id, { isActive: false })).rejects.toThrow(BadRequestException);
    await expect(controller.deactivate(id)).rejects.toThrow(BadRequestException);
    await expect(controller.removePermanently(id)).rejects.toThrow(BadRequestException);
    expect(model.findUnique).not.toHaveBeenCalled();
  });

  it('rejects duplicate group/value changes and CRM business-year reassignment', async () => {
    const { service, model, row } = fixture();
    model.findFirst.mockResolvedValueOnce({ id: 2n });
    await expect(service.update(row.id, { codeValue: 'duplicate' })).rejects.toThrow(ConflictException);
    await expect(service.update(row.id, { codeGroup: 'biz_year' })).rejects.toThrow(BadRequestException);
    expect(model.update).not.toHaveBeenCalled();
  });
  it('blocks deactivation and identity edits of referenced codes but permits display corrections', async () => {
    const { service, model, row } = fixture();
    model.count.mockResolvedValue(2);
    await expect(service.deactivate(row.id)).rejects.toThrow(ConflictException);
    await expect(service.update(row.id, { codeValue: 'new-value' })).rejects.toThrow(ConflictException);
    expect(model.update).not.toHaveBeenCalled();
    await service.update(row.id, { displayNameKo: '표시명 수정' });
    expect(model.update).toHaveBeenCalledTimes(1);
  });

  it('does not allow moving CRM business-year records into another group', async () => {
    const { service, model, row } = fixture();
    row.codeGroup = 'biz_year';
    await expect(service.update(row.id, { codeGroup: 'payment_term' })).rejects.toThrow(BadRequestException);
    await expect(service.deactivate(row.id)).rejects.toThrow(BadRequestException);
    expect(model.update).not.toHaveBeenCalled();
  });

  it('reports ownership and explicitly limits reference coverage', async () => {
    const { service, model, row } = fixture();
    model.count.mockResolvedValue(2);
    const usage = await service.usage(row.id);
    expect(usage.owner).toBe('crm');
    expect(usage.total).toBe(2);
    expect(usage.coverage).toContain('별도 확인');
  });

  it('rejects stale edits and records the actor and reason on an accepted edit', async () => {
    const { service, model, row } = fixture();
    await expect(service.update(row.id, { displayNameKo: '변경', reason: '수정', expectedUpdatedAt: '2000-01-01T00:00:00Z' }, 1n)).rejects.toThrow(ConflictException);
    expect(model.update).not.toHaveBeenCalled();
    await service.update(row.id, { displayNameKo: '변경', reason: '수정', expectedUpdatedAt: row.updatedAt.toISOString() }, 1n);
    expect(model.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ memo: '수정', updatedBy: 1n }) }));
  });

});
