import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dmsRequire = createRequire(resolve(repositoryRoot, 'apps/web/dms/package.json'));
const postcss = dmsRequire('postcss');
const tailwindcss = dmsRequire('tailwindcss');

// These generated states keep existing tab actions and sidebar hover controls usable.
// A selector-parser security update previously dropped all group-hover rules silently.
const result = await postcss([
  tailwindcss({
    content: [{ raw: '<div class="group group/sidebar"><button class="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto hidden group-hover/sidebar:flex"></button></div>' }],
    corePlugins: { preflight: false },
  }),
]).process('@tailwind utilities;', { from: undefined });

const expectedRules = [
  ['.group:hover .group-hover\\:opacity-100', 'opacity', '1'],
  ['.group:hover .group-hover\\:pointer-events-auto', 'pointer-events', 'auto'],
  ['.group\\/sidebar:hover .group-hover\\/sidebar\\:flex', 'display', 'flex'],
];

for (const [selector, property, value] of expectedRules) {
  let found = false;
  result.root.walkRules(selector, (rule) => {
    rule.walkDecls(property, (declaration) => {
      if (declaration.value === value) found = true;
    });
  });
  assert.ok(found, `missing interactive style: ${selector} { ${property}: ${value} }`);
}

console.log(`[style-runtime] passed: ${expectedRules.length} existing hover behaviors generated`);
