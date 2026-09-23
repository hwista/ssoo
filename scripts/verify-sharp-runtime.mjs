import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_SHARP_VERSION = '0.35.4';
const EXPECTED_VIPS_VERSION = '8.18.6';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dmsRequire = createRequire(
  resolve(repositoryRoot, 'apps/web/dms/package.json'),
);
const nextRequire = createRequire(dmsRequire.resolve('next/package.json'));
const sharp = nextRequire('sharp');

assert.equal(
  sharp.versions.sharp,
  EXPECTED_SHARP_VERSION,
  `expected sharp ${EXPECTED_SHARP_VERSION}, received ${sharp.versions.sharp}`,
);
assert.equal(
  sharp.versions.vips,
  EXPECTED_VIPS_VERSION,
  `expected libvips ${EXPECTED_VIPS_VERSION}, received ${sharp.versions.vips}`,
);

const { data, info } = await sharp({
  create: {
    width: 8,
    height: 8,
    channels: 4,
    background: { r: 32, g: 96, b: 160, alpha: 1 },
  },
})
  .resize(4, 4)
  .png()
  .toBuffer({ resolveWithObject: true });

assert.ok(data.length > 0, 'sharp produced an empty image buffer');
assert.equal(info.width, 4);
assert.equal(info.height, 4);
assert.equal(info.format, 'png');

console.log(
  `[sharp-runtime] passed (${process.platform}/${process.arch}, sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}, ${info.width}x${info.height} ${info.format})`,
);
