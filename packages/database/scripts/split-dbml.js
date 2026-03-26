// Split generated DBML (schema.dbml) into per-schema files: common, pms, dms.
// Output: packages/database/dbml/{common,pms,dms}.dbml
// Refs are kept only if both sides belong to the target schema.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'dbml');
const source = join(root, 'schema.dbml');

const text = readFileSync(source, 'utf8');
const lines = text.split(/\r?\n/);
const headers = [];
const bySchema = { common: [], pms: [], dms: [] };
const refs = { common: [], pms: [], dms: [] };

const mapByPrefix = (name) => {
  if (name.startsWith('cm_')) return 'common';
  if (name.startsWith('pr_')) return 'pms';
  if (name.startsWith('dm_')) return 'dms';
  return null;
};

const getSchemaFromName = (name) => {
  const schemaPart = name.includes('.') ? name.split('.')[0] : null;
  if (schemaPart && ['common', 'pms', 'dms'].includes(schemaPart)) return schemaPart;
  return mapByPrefix(name.includes('.') ? name.split('.')[1] ?? name : name);
};

let i = 0;
while (i < lines.length) {
  const line = lines[i].trim();
  if (line.startsWith('Table ') || line.startsWith('Enum ')) {
    const match = line.match(/^(Table|Enum)\s+([^\s{]+)/);
    const name = match ? match[2] : '';
    const schema = getSchemaFromName(name);
    let blockLines = [lines[i]];
    let depth = (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
    i += 1;
    while (i < lines.length && depth > 0) {
      blockLines.push(lines[i]);
      depth += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
      i += 1;
    }
    const block = blockLines.join('\n').trim();
    if (schema && bySchema[schema]) bySchema[schema].push(block);
  } else if (line.startsWith('Ref:')) {
    const targets = line
      .replace(/^Ref:\s+/, '')
      .split(/[#>|=]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const tables = targets.map((t) => t.split('.')[0]);
    const schemas = tables.map(mapByPrefix).filter(Boolean);
    const unique = [...new Set(schemas)];
    if (unique.length === 1 && refs[unique[0]]) refs[unique[0]].push(line);
    i += 1;
  } else {
    if (line.length) headers.push(lines[i]);
    i += 1;
  }
}

mkdirSync(root, { recursive: true });

const writeSchema = (schema) => {
  const body = [...headers, ...bySchema[schema], ...refs[schema]]
    .filter(Boolean)
    .join('\n\n');
  const outFile = join(root, `${schema}.dbml`);
  writeFileSync(outFile, body + '\n', 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Split DBML for ${schema}: ${outFile}`);
};

['common', 'pms', 'dms'].forEach(writeSchema);
