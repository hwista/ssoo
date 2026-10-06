import { BadRequestException, ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DatabaseService } from '../../../database/database.service.js';
import { CodeService } from './code.service.js';
import { CodeController } from './code.controller.js';

function fixture() {
  const row = { id: 9007199254740993n, codeGroup: 'payment_term', codeValue: 'QA', displayNameKo: '검수', isActive: true };
  const model = {
    findUnique: jest.fn<() => Promise<typeof row | null>>().mockResolvedValue(row),
    findFirst: jest.fn<() => Promise<{ id: bigint } | null>>().mockResolvedValue(null),
    update: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
    create: jest.fn<(input: unknown) => Promise<typeof row>>().mockResolvedValue(row),
  };
  const service = new CodeService({ client: { cmCode: model } } as unknown as DatabaseService);
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
});
