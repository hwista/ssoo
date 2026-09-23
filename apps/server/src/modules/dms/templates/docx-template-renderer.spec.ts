import fs from 'node:fs';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import {
  assertValidDocxTemplate,
  createDocxTemplateFromText,
  renderDocxTemplate,
} from './docx-template-renderer.js';

const fixtureRoot = new URL('../../../../test/fixtures/office-zip/', import.meta.url);
const baseline = JSON.parse(fs.readFileSync(new URL('baseline.json', fixtureRoot), 'utf8')) as {
  text: string;
  variables: Record<string, string>;
  entries: Record<string, Record<string, string>>;
};

async function readDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('word/document.xml missing');
  return entry.async('string');
}

async function entryHashes(buffer: Buffer): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.fromEntries(await Promise.all(Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map(async (entry) => [entry.name, createHash('sha256').update(await entry.async('nodebuffer')).digest('hex')])));
}

describe('DOCX template renderer', () => {
  it('replaces source-style single braces and SSOO double braces in the actual template binary', async () => {
    const template = await createDocxTemplateFromText('계약번호 {계약번호}\n고객사 {{customerName}}');
    const rendered = await renderDocxTemplate(template, { 계약번호: 'CRM-CT-001', customerName: 'LS MnM' });
    const xml = await readDocumentXml(rendered);
    expect(xml).toContain('CRM-CT-001');
    expect(xml).toContain('LS MnM');
    expect(xml).not.toContain('{계약번호}');
    expect(xml).not.toContain('{{customerName}}');
  });

  it('preserves the previous renderer output for split placeholders, headers, footers, notes, styles, images and attachments', async () => {
    const template = fs.readFileSync(new URL('complex.docx', fixtureRoot));
    const rendered = await renderDocxTemplate(template, baseline.variables);
    expect(await entryHashes(rendered)).toEqual(baseline.entries['rendered.docx']);
    expect(await readDocumentXml(rendered)).toContain('삼삼오오 &amp; 협력사');
  });

  it('generates the same document parts as the previous renderer', async () => {
    expect(await entryHashes(await createDocxTemplateFromText(baseline.text))).toEqual(baseline.entries['generated.docx']);
  });

  it('preserves entry comments, dates and permissions when replacing text', async () => {
    const zip = await JSZip.loadAsync(fs.readFileSync(new URL('plain.docx', fixtureRoot)));
    const date = new Date('2025-01-02T03:04:06Z');
    zip.file('word/document.xml', await zip.file('word/document.xml')!.async('nodebuffer'), {
      date, comment: '기존 메타데이터', unixPermissions: 0o100644, createFolders: false,
    });
    const input = await zip.generateAsync({ type: 'nodebuffer', platform: 'UNIX' });
    const rendered = await JSZip.loadAsync(await renderDocxTemplate(input, baseline.variables));
    expect(rendered.file('word/document.xml')?.date).toEqual(date);
    expect(rendered.file('word/document.xml')?.comment).toBe('기존 메타데이터');
    expect(rendered.file('word/document.xml')?.unixPermissions).toBe(0o100644);
  });

  it('rejects a non-DOCX binary with the existing error message', async () => {
    await expect(assertValidDocxTemplate(Buffer.from('not-a-docx'))).rejects.toThrow('유효한 DOCX ZIP 파일이 아닙니다.');
  });

  it('rejects missing document parts with the existing error message', async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types/>');
    await expect(assertValidDocxTemplate(await zip.generateAsync({ type: 'nodebuffer' })))
      .rejects.toThrow('DOCX 필수 entry가 없습니다: _rels/.rels');
  });
});
