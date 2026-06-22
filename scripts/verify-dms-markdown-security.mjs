import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const markdown = read('apps/web/dms/src/lib/utils/markdown.ts');
const linkUtils = read('apps/web/dms/src/lib/utils/linkUtils.ts');
const content = read('apps/web/dms/src/components/common/viewer/Content.tsx');
const viewerUtils = read('apps/web/dms/src/components/common/viewer/runtime/viewerUtils.ts');
const downloadUtils = read('apps/web/dms/src/lib/utils/downloadUtils.ts');

assert(markdown.includes('DOMPurify.sanitize'), 'markdown renderer must sanitize HTML with DOMPurify');
for (const tag of ['base', 'embed', 'form', 'iframe', 'object', 'script', 'style']) {
  assert(markdown.includes(`'${tag}'`), `markdown sanitizer must forbid <${tag}>`);
}
assert(markdown.includes('USE_PROFILES: { html: true }'), 'markdown sanitizer must use the HTML profile');
assert(markdown.includes("element.removeAttribute('href')"), 'markdown sanitizer must strip unsafe href attributes');
assert(markdown.includes("element.removeAttribute('src')"), 'markdown sanitizer must strip unsafe src attributes');
assert(markdown.includes("url.protocol === 'http:'"), 'markdown sanitizer must allow http URLs explicitly');
assert(markdown.includes("url.protocol === 'https:'"), 'markdown sanitizer must allow https URLs explicitly');
assert(markdown.includes("url.protocol === 'mailto:'"), 'markdown sanitizer must allow mailto hrefs explicitly');
assert(markdown.includes("url.protocol === 'blob:'"), 'markdown sanitizer must allow blob image src explicitly');
assert(markdown.includes('escapeHtml(resolvedSrc)'), 'markdown image renderer must escape resolved image src');
assert(markdown.includes('escapeHtml(text || \'\')'), 'markdown image renderer must escape alt text');
assert(markdown.includes('escapeHtml(href)'), 'markdown image renderer must escape original image src');
assert(markdown.includes('escapeHtml(title)'), 'markdown image renderer must escape image title');
assert(markdown.includes('escapeHtml(text)'), 'markdown code and Mermaid renderers must escape code text');
assert(!markdown.includes('return parser.parse(markdown'), 'markdown renderer must not return raw marked output');

assert(linkUtils.includes("new Set(['http:', 'https:', 'mailto:'])"), 'link resolver must allow-list external href protocols');
assert(linkUtils.includes("new Set(['http:', 'https:', 'blob:'])"), 'image resolver must allow-list image src protocols');
assert(!linkUtils.includes("src.startsWith('data:')"), 'image resolver must not allow data: image src');
assert(!linkUtils.includes("href.startsWith('javascript:')"), 'link resolver must not special-case javascript: as allowed');

const dangerousHtmlMatches = content.match(/dangerouslySetInnerHTML/g) ?? [];
assert(dangerousHtmlMatches.length === 1, 'Content viewer must keep exactly one audited dangerouslySetInnerHTML sink');
assert(content.includes('dangerouslySetInnerHTML={{ __html: content }}'), 'Content viewer HTML sink must remain explicit and auditable');
assert(viewerUtils.includes('parsed.body.innerHTML'), 'viewer search highlighter must only return DOMParser body HTML');
assert(viewerUtils.includes('parsed.createTextNode'), 'viewer search highlighter must create text nodes for existing content');
assert(viewerUtils.includes('mark.textContent = matched'), 'viewer search highlighter must insert matched text via textContent');

assert(downloadUtils.includes('escapeHtml(title || \'문서\')'), 'print helper must escape the document title before document.write');
assert(downloadUtils.includes('<article>${htmlContent}</article>'), 'print helper must only print already-rendered viewer HTML content');

if (failures.length > 0) {
  console.error('[verify-dms-markdown-security] failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[verify-dms-markdown-security] passed');
