import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SEARCH_RESULT_SOURCE_LABELS,
  getSearchResultBadgeLabel as badge,
  getSearchResultMetadata as metadata,
  getSearchResultSummary as summary,
} from '../packages/web-shell/src/global-search-presentation.ts';

function result(sourceApp, entityType, extra = {}) {
  return { id: 'opaque-id', sourceApp, entityType, title: '원문 제목', permissionState: 'blocked',
    target: { sourceApp, path: '/original?selected=opaque-id' }, ...extra };
}

test('customer exposes business code and owner without internal identifier, preserving input', () => {
  const r = result('crm', 'customer', { summary: '고객 active · 김담당 · active',
    metadata: { customerId: 'secret-id', customerCode: 'CUSTOMER-0042', customerType: 'active', ownerName: '김담당' } });
  const before = structuredClone(r);
  assert.deepEqual(metadata(r), [['고객 코드', 'CUSTOMER-0042'], ['담당자', '김담당']]);
  assert.equal(summary(r), '고객 active · 김담당 · 거래중');
  assert.equal(badge(r, '12 activities'), '활동 12건');
  assert.deepEqual(r, before);
});

test('opportunity uses its own status and priority vocabulary', () => {
  const r = result('crm', 'opportunity', { summary: '고객 · SI · won', ownerLabel: '김담당',
    metadata: { opportunityId: 'hidden', customerName: '고객', status: 'won', priority: 'high' } });
  assert.equal(summary(r), '고객 · SI · 수주');
  assert.equal(badge(r, 'proposal'), '제안');
  assert.equal(badge(r, 'high'), '우선순위 높음');
  assert.deepEqual(metadata(r), [['고객', '고객'], ['담당자', '김담당']]);
});

test('project shares the existing work queue terminology, not opportunity terminology', () => {
  const r = result('pms', 'project', { summary: 'proposal · in_progress',
    metadata: { projectId: 'hidden', statusCode: 'proposal', stageCode: 'in_progress' } });
  assert.equal(badge(r, 'proposal'), '제안 참조');
  assert.equal(summary(r), '제안 참조 · 진행중');
  assert.deepEqual(metadata(r), [['상태', '제안 참조'], ['진행 단계', '진행중']]);
  assert.equal(summary({ ...r, summary: '고객 요청 원문 · proposal' }), '고객 요청 원문 · proposal');
});

test('post visibility is localized but authored content is untouched', () => {
  const r = result('sns', 'post', { summary: '공유 원문 · public' });
  assert.equal(badge(r, 'public'), '전체 공개');
  assert.equal(badge(r, 'organization'), '내 조직');
  assert.equal(summary(r), r.summary);
});

test('user role suffix changes without changing a login ID or email', () => {
  const r = result('admin', 'user', { summary: 'admin@example.com · admin', badges: [{ label: 'admin' }] });
  assert.equal(summary(r), 'admin@example.com · 관리자');
  assert.equal(badge(r, 'viewer'), '뷰어');
});

test('document location and source text are preserved', () => {
  const r = result('dms', 'document', { summary: '원문 · active', metadata: { path: '긴 경로/계약.md', visibilityScope: 'self' } });
  assert.deepEqual(metadata(r), [['문서 위치', '긴 경로/계약.md']]);
  assert.equal(summary(r), r.summary);
  assert.equal(badge(r, '나만 보기'), '나만 보기');
});

test('unknown values never become normal or complete, including inherited property names', () => {
  for (const [app, kind] of [['crm', 'customer'], ['crm', 'opportunity'], ['pms', 'project'], ['admin', 'user'], ['sns', 'post']]) {
    for (const value of ['new-status', 'constructor', '__proto__']) assert.equal(badge(result(app, kind), value), value);
  }
  const r = result('pms', 'project', { metadata: { statusCode: 'new-status', stageCode: 'future' }, summary: 'new-status · future' });
  assert.equal(summary(r), 'new-status · future');
  assert.deepEqual(metadata(r), [['상태', 'new-status'], ['진행 단계', 'future']]);
});

test('missing metadata does not invent values; snippets and unsupported kinds keep existing fallback', () => {
  assert.deepEqual(metadata(result('crm', 'customer')), []);
  assert.equal(summary(result('crm', 'customer', { snippets: ['원문 · active'] })), '원문 · active');
  const r = result('crm', 'activity', { metadata: { empty: ' ', one: '1', two: '2', three: '3', four: '4' } });
  assert.deepEqual(metadata(r), [['one', '1'], ['two', '2'], ['three', '3']]);
  assert.equal(badge(r, 'active'), 'active');
});

test('service labels describe all five destinations without changing the target', () => {
  assert.deepEqual(Object.values(SEARCH_RESULT_SOURCE_LABELS), ['관리자', '영업관리', '프로젝트관리', '문서관리', '협업']);
  const r = result('crm', 'customer'); const before = structuredClone(r);
  metadata(r); summary(r); badge(r, 'active'); assert.deepEqual(r, before);
});
