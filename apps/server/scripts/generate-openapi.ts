import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../dist/app.module.js';
import { CommonModule } from '../dist/modules/common/common.module.js';
import { PmsModule } from '../dist/modules/pms/pms.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const baseBuilder = () =>
    new DocumentBuilder()
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

  const commonDoc = SwaggerModule.createDocument(app, {
    ...baseBuilder(),
    info: { title: 'SSOO Common API', description: 'Common module API reference', version: '1.0.0' },
  }, { include: [CommonModule] });

  const pmsDoc = SwaggerModule.createDocument(app, {
    ...baseBuilder(),
    info: { title: 'SSOO PMS API', description: 'PMS module API reference', version: '1.0.0' },
  }, { include: [PmsModule] });
  await app.close();

  // Generate OpenAPI JSON files
  const commonDir = join(__dirname, '..', '..', '..', 'docs', 'common', 'reference', 'api');
  const commonFile = join(commonDir, 'openapi.json');
  await mkdir(commonDir, { recursive: true });
  await writeFile(commonFile, JSON.stringify(commonDoc, null, 2), 'utf8');

  const pmsDir = join(__dirname, '..', '..', '..', 'docs', 'pms', 'reference', 'api');
  const pmsFile = join(pmsDir, 'openapi.json');
  await mkdir(pmsDir, { recursive: true });
  await writeFile(pmsFile, JSON.stringify(pmsDoc, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`OpenAPI specs generated at:
- ${commonFile}
- ${pmsFile}`);

  // Generate Redoc HTML files
  const commonHtml = join(commonDir, 'index.html');
  const pmsHtml = join(pmsDir, 'index.html');

  // eslint-disable-next-line no-console
  console.log('Generating Redoc HTML...');

  execSync(`npx @redocly/cli build-docs "${commonFile}" -o "${commonHtml}"`, { stdio: 'inherit' });
  execSync(`npx @redocly/cli build-docs "${pmsFile}" -o "${pmsHtml}"`, { stdio: 'inherit' });

  // eslint-disable-next-line no-console
  console.log(`Redoc HTML generated at:
- ${commonHtml}
- ${pmsHtml}`);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
