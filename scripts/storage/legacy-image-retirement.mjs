import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateManifest } from '../ci/release-state.mjs';

export function planLegacyRetirement(images, containers, manifests, approved, now = Date.now()) {
  const protectedIds = new Set(containers.map(item => item.Image));
  for (const manifest of manifests) {
    validateManifest(manifest);
    for (const service of Object.values(manifest.services)) protectedIds.add(service.imageId);
  }
  const refs = new Map();
  for (const item of approved) {
    if (!/^(ssoo|app)-(server|db-init|admin|crm|pms|dms|sns):latest$/u.test(item.imageRef)
      || !/^sha256:[a-f0-9]{64}$/u.test(item.imageId) || refs.has(item.imageRef)) throw new Error('Invalid approved legacy image');
    refs.set(item.imageRef, item.imageId);
  }
  const plan = [];
  for (const [imageRef, imageId] of refs) {
    const image = images.find(item => item.RepoTags?.includes(imageRef));
    if (!image) continue; // Safe to resume a partial cleanup without broadening it.
    if (image.Id !== imageId) throw new Error(`Image changed since audit: ${imageRef}`);
    if (protectedIds.has(imageId)) throw new Error(`Container or release protects: ${imageRef}`);
    if (!Number.isFinite(Date.parse(image.Created)) || now - Date.parse(image.Created) < 86400_000) {
      throw new Error(`Image age is unknown or too recent: ${imageRef}`);
    }
    if (image.RepoTags.some(tag => refs.get(tag) !== imageId)) throw new Error(`Unapproved alias protects: ${imageRef}`);
    plan.push({ imageRef, imageId });
  }
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, snapshot] = process.argv.slice(2);
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const manifests = [];
  const current = path.join(root, 'last-successful.json');
  if (!fs.existsSync(current)) throw new Error('Missing current release; refusing legacy cleanup');
  manifests.push(read(current));
  for (const id of fs.readdirSync(root).filter(name => /^\d+-[a-f0-9]{40}$/u.test(name))) {
    const file = path.join(root, id, 'release.json');
    if (fs.existsSync(file)) manifests.push(read(file)); // Includes retired and recovery manifests.
  }
  const approved = read(new URL('./legacy-image-retirement.json', import.meta.url)).images;
  const plan = planLegacyRetirement(read(path.join(snapshot, 'images.json')),
    read(path.join(snapshot, 'containers.json')), manifests, approved);
  for (const item of plan) console.log(`${item.imageRef}\t${item.imageId}`);
}
