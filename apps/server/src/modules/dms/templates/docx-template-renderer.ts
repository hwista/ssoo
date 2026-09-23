import JSZip from 'jszip';

const REQUIRED_DOCX_ENTRIES = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'];
const WORD_TEXT_PART_PATTERN = /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeVariableMap(variables: Record<string, string>): Map<string, string> {
  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(variables)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      continue;
    }
    normalized.set(trimmedKey, value ?? '');
  }
  return normalized;
}

function renderXmlTextNodes(xml: string, variables: Record<string, string>): string {
  const textNodePattern = /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g;
  const nodes: Array<{ prefix: string; value: string; suffix: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = textNodePattern.exec(xml)) !== null) {
    nodes.push({
      prefix: match[1],
      value: decodeXml(match[2]),
      suffix: match[3],
    });
  }
  if (nodes.length === 0) {
    return xml;
  }

  const variableMap = normalizeVariableMap(variables);
  const fullText = nodes.map((node) => node.value).join('');
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  const placeholderPattern = /\{\{\s*([^{}]+?)\s*\}\}|\{\s*([^{}]+?)\s*\}/g;
  while ((match = placeholderPattern.exec(fullText)) !== null) {
    const key = (match[1] ?? match[2] ?? '').trim();
    if (!variableMap.has(key)) {
      continue;
    }
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      value: variableMap.get(key) ?? '',
    });
  }

  const offsets: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const node of nodes) {
    offsets.push({ start: cursor, end: cursor + node.value.length });
    cursor += node.value.length;
  }

  for (const replacement of replacements.reverse()) {
    const startNodeIndex = offsets.findIndex((offset) => replacement.start >= offset.start && replacement.start < offset.end);
    const endPosition = Math.max(replacement.start, replacement.end - 1);
    const endNodeIndex = offsets.findIndex((offset) => endPosition >= offset.start && endPosition < offset.end);
    if (startNodeIndex < 0 || endNodeIndex < 0) {
      continue;
    }

    const startOffset = replacement.start - offsets[startNodeIndex].start;
    const endOffset = replacement.end - offsets[endNodeIndex].start;
    const prefix = nodes[startNodeIndex].value.slice(0, startOffset);
    const suffix = nodes[endNodeIndex].value.slice(endOffset);
    nodes[startNodeIndex].value = `${prefix}${replacement.value}${suffix}`;
    for (let index = startNodeIndex + 1; index <= endNodeIndex; index += 1) {
      nodes[index].value = '';
    }
  }

  let nodeIndex = 0;
  return xml.replace(textNodePattern, () => {
    const node = nodes[nodeIndex];
    nodeIndex += 1;
    return `${node.prefix}${escapeXml(node.value)}${node.suffix}`;
  });
}

export async function assertValidDocxTemplate(buffer: Buffer): Promise<void> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('유효한 DOCX ZIP 파일이 아닙니다.');
  }

  for (const entryName of REQUIRED_DOCX_ENTRIES) {
    if (!zip.file(entryName)) {
      throw new Error(`DOCX 필수 entry가 없습니다: ${entryName}`);
    }
  }
}

export async function renderDocxTemplate(
  templateBuffer: Buffer,
  variables: Record<string, string>,
): Promise<Buffer> {
  await assertValidDocxTemplate(templateBuffer);
  const zip = await JSZip.loadAsync(templateBuffer);
  for (const entry of Object.values(zip.files)) {
    if (!WORD_TEXT_PART_PATTERN.test(entry.name)) {
      continue;
    }
    const sourceXml = await entry.async('string');
    zip.file(entry.name, Buffer.from(renderXmlTextNodes(sourceXml, variables), 'utf-8'), {
      date: entry.date,
      comment: entry.comment,
      unixPermissions: entry.unixPermissions,
      dosPermissions: entry.dosPermissions,
      createFolders: false,
    });
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    platform: Object.values(zip.files).some((entry) => entry.unixPermissions !== null) ? 'UNIX' : 'DOS',
  });
}

export async function createDocxTemplateFromText(content: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>',
    'utf-8',
  ));
  zip.file('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>',
    'utf-8',
  ));
  const paragraphs = content.split(/\r?\n/).slice(0, 400);
  zip.file('word/document.xml', Buffer.from([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    ...paragraphs.map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join(''), 'utf-8'));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
