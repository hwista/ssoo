import fs from 'node:fs';
import { extractTextFromFile, type ExtractionResult } from './text-extractor.js';

const fixtureRoot = new URL('../../../../test/fixtures/office-zip/', import.meta.url);
const baseline = JSON.parse(fs.readFileSync(new URL('baseline.json', fixtureRoot), 'utf8')) as {
  extraction: Record<string, ExtractionResult>;
};

describe('Office extraction compatibility', () => {
  it.each(Object.keys(baseline.extraction))('preserves the existing text, image order and error result for %s', async (name) => {
    const buffer = fs.readFileSync(new URL(name, fixtureRoot));
    expect(await extractTextFromFile(buffer, name)).toEqual(baseline.extraction[name]);
  });
});
