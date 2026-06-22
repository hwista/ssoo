import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSsooNextConfig } from '../../../packages/web-shell/next-config.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = createSsooNextConfig({ appDir: __dirname });

export default nextConfig;
