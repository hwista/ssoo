import path from 'path';
import { normalizePath, resolveContainedPath } from '../../src/modules/dms/runtime/path-utils.js';
import {
  tokenizeQuery,
  inferConfidence,
  buildSearchResponse,
  resolveAbsolutePath,
  toDisplayPath,
  toRelativePath,
  extractTitle,
  stripMarkdown,
} from '../../src/modules/dms/search/search.helpers.js';

describe('runtime/path-utils', () => {
  describe('normalizePath', () => {
    it('converts windows-style backslashes to forward slashes', () => {
      expect(normalizePath('a\\b\\c.md')).toBe('a/b/c.md');
    });

    it('handles double backslash escapes', () => {
      expect(normalizePath('a\\\\b')).toBe('a/b');
    });

    it('returns empty string on null-ish input', () => {
      expect(normalizePath('')).toBe('');
      expect(normalizePath(null as unknown as string)).toBe('');
    });
  });

  describe('resolveContainedPath', () => {
    const root = '/var/lib/dms/documents';

    it('marks a child path as valid', () => {
      const r = resolveContainedPath(root, 'analysis/foo.md');
      expect(r.valid).toBe(true);
      expect(r.targetPath).toBe(path.resolve(root, 'analysis/foo.md'));
      expect(r.safeRelPath).toBe('analysis/foo.md');
    });

    it('rejects path traversal attempts', () => {
      const r = resolveContainedPath(root, '../../etc/passwd');
      expect(r.valid).toBe(false);
    });

    it('strips leading slashes from input', () => {
      const r = resolveContainedPath(root, '/foo/bar.md');
      expect(r.valid).toBe(true);
      expect(r.safeRelPath).toBe('foo/bar.md');
    });
  });
});

describe('search/helpers', () => {
  describe('tokenizeQuery', () => {
    it('lowercases, splits on punctuation, filters short tokens', () => {
      const tokens = tokenizeQuery('Order Plan, AnalysisOrderRequest!');
      expect(tokens).toEqual(expect.arrayContaining(['order', 'plan', 'analysisorderrequest']));
    });

    it('drops one-character tokens', () => {
      expect(tokenizeQuery('a b cd e')).toEqual(['cd']);
    });

    it('deduplicates repeated tokens', () => {
      expect(tokenizeQuery('alpha alpha beta')).toEqual(['alpha', 'beta']);
    });
  });

  describe('inferConfidence', () => {
    it('returns high for ≥ 5 results', () => {
      expect(inferConfidence(5)).toBe('high');
      expect(inferConfidence(100)).toBe('high');
    });

    it('returns medium for 2-4 results', () => {
      expect(inferConfidence(2)).toBe('medium');
      expect(inferConfidence(4)).toBe('medium');
    });

    it('returns low for 0-1 results', () => {
      expect(inferConfidence(0)).toBe('low');
      expect(inferConfidence(1)).toBe('low');
    });
  });

  describe('buildSearchResponse', () => {
    it('omits citations in default doc mode', () => {
      const resp = buildSearchResponse('q', [
        { path: 'a.md', title: 'A', isReadable: true } as never,
      ]);
      expect(resp.contextMode).toBe('doc');
      expect(resp.citations).toBeUndefined();
    });

    it('emits citations only for readable items in deep mode (max 5)', () => {
      const items = Array.from({ length: 8 }, (_, i) => ({
        path: `${i}.md`, title: `T${i}`, isReadable: i % 2 === 0,
      })) as never[];
      const resp = buildSearchResponse('q', items, { contextMode: 'deep' });
      expect(resp.contextMode).toBe('deep');
      expect(resp.citations).toBeDefined();
      expect(resp.citations!.length).toBeLessThanOrEqual(5);
      expect(resp.citations!.every((c) => c.storageUri.startsWith('doc://'))).toBe(true);
    });
  });

  describe('absolute/relative path helpers', () => {
    const root = '/srv/dms/docs';

    it('resolveAbsolutePath joins rootDir with relative input', () => {
      expect(resolveAbsolutePath('a/b.md', root)).toBe(path.join(root, 'a/b.md'));
    });

    it('resolveAbsolutePath returns absolute input as-is', () => {
      const abs = path.resolve('/already/absolute.md');
      expect(resolveAbsolutePath(abs, root)).toBe(abs);
    });

    it('toDisplayPath returns normalized relative for paths inside root', () => {
      expect(toDisplayPath(path.join(root, 'a/b.md'), root)).toBe('a/b.md');
    });

    it('toDisplayPath falls back to normalized absolute when outside root', () => {
      expect(toDisplayPath('/elsewhere/x.md', root)).toBe('/elsewhere/x.md');
    });

    it('toRelativePath always returns posix-style relative', () => {
      expect(toRelativePath(path.join(root, 'x', 'y.md'), root)).toBe('x/y.md');
    });
  });

  describe('extractTitle', () => {
    it('uses first H1 heading when present', () => {
      expect(extractTitle('# My Doc\n\ncontent', 'fallback.md')).toBe('My Doc');
    });

    it('falls back to filename without .md extension', () => {
      expect(extractTitle('no heading', 'design-doc.md')).toBe('design-doc');
    });

    it('trims heading whitespace', () => {
      expect(extractTitle('#   spaced  \n', 'x.md')).toBe('spaced');
    });
  });

  describe('stripMarkdown', () => {
    it('removes fenced code blocks', () => {
      expect(stripMarkdown('hi\n```js\nsecret\n```\nworld')).toContain('hi');
      expect(stripMarkdown('hi\n```js\nsecret\n```\nworld')).not.toContain('secret');
    });

    it('preserves link text but drops urls', () => {
      const out = stripMarkdown('see [docs](http://x/y) link');
      expect(out).toContain('docs');
      expect(out).not.toContain('http');
    });

    it('collapses whitespace', () => {
      expect(stripMarkdown('a    b\t\nc')).toBe('a b c');
    });
  });
});
