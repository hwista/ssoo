-- =========================================================
-- Seed: 14_demo_milestones.sql
-- 프로젝트별 마일스톤 (3~5건씩)
-- =========================================================

begin;

-- ─────────────────────────────────────────────────────────
-- 900001: LS ERP 고도화
-- ─────────────────────────────────────────────────────────
insert into pms.pr_milestone_m (milestone_id, project_id, milestone_code, milestone_name, description, status_code, due_at, achieved_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (101, 900001, 'M1-001', '요구사항 확정',  '고객 요구사항 최종 합의 및 서명',          'achieved',    '2026-02-28', '2026-02-27', 1, true, now(), now(), 'SEED'),
  (102, 900001, 'M1-002', '설계 완료',      '시스템 설계서 최종 승인',                  'in_progress', '2026-03-31', null,          2, true, now(), now(), 'SEED'),
  (103, 900001, 'M1-003', '개발 완료',      '전체 모듈 개발 완료 및 단위 테스트 통과',  'not_started', '2026-06-30', null,          3, true, now(), now(), 'SEED'),
  (104, 900001, 'M1-004', '사용자 테스트',  'UAT 수행 및 결함 조치',                    'not_started', '2026-07-15', null,          4, true, now(), now(), 'SEED'),
  (105, 900001, 'M1-005', '오픈',           '시스템 운영 오픈',                         'not_started', '2026-07-31', null,          5, true, now(), now(), 'SEED')
on conflict (milestone_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900002: 통합 포털 리뉴얼
-- ─────────────────────────────────────────────────────────
insert into pms.pr_milestone_m (milestone_id, project_id, milestone_code, milestone_name, description, status_code, due_at, achieved_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (201, 900002, 'M2-001', 'UX 디자인 확정', 'UX 리서치 완료 및 디자인 시안 승인',       'achieved',    '2026-02-25', '2026-02-24', 1, true, now(), now(), 'SEED'),
  (202, 900002, 'M2-002', '프론트엔드 1차', '메인 페이지 및 핵심 기능 프론트엔드 완료', 'in_progress', '2026-03-31', null,          2, true, now(), now(), 'SEED'),
  (203, 900002, 'M2-003', '통합 테스트',    '프론트/백엔드 통합 테스트 완료',           'not_started', '2026-05-20', null,          3, true, now(), now(), 'SEED'),
  (204, 900002, 'M2-004', '오픈',           '포털 리뉴얼 오픈',                        'not_started', '2026-06-01', null,          4, true, now(), now(), 'SEED')
on conflict (milestone_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900003: 모바일 오더 시스템
-- ─────────────────────────────────────────────────────────
insert into pms.pr_milestone_m (milestone_id, project_id, milestone_code, milestone_name, description, status_code, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (301, 900003, 'M3-001', '프로세스 분석 완료', '주문 프로세스 As-Is/To-Be 확정',       'in_progress', '2026-03-05', 1, true, now(), now(), 'SEED'),
  (302, 900003, 'M3-002', '모바일 UI 확정',     'UI 설계 및 프로토타입 승인',            'not_started', '2026-03-25', 2, true, now(), now(), 'SEED'),
  (303, 900003, 'M3-003', '앱 베타 릴리스',     '내부 테스트용 베타 버전 배포',           'not_started', '2026-05-15', 3, true, now(), now(), 'SEED')
on conflict (milestone_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900004: 데이터 레이크 구축
-- ─────────────────────────────────────────────────────────
insert into pms.pr_milestone_m (milestone_id, project_id, milestone_code, milestone_name, description, status_code, due_at, achieved_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (401, 900004, 'M4-001', '데이터 소스 확정',   '수집 대상 시스템 및 데이터 목록 확정', 'achieved',    '2026-02-28', '2026-02-26', 1, true, now(), now(), 'SEED'),
  (402, 900004, 'M4-002', 'ETL 파이프라인 완료', '수집-정제-적재 파이프라인 개발 완료',   'in_progress', '2026-04-15', null,          2, true, now(), now(), 'SEED'),
  (403, 900004, 'M4-003', '데이터 품질 합격',   '데이터 정합성 검증 통과',               'not_started', '2026-05-10', null,          3, true, now(), now(), 'SEED'),
  (404, 900004, 'M4-004', '운영 전환',          '프로덕션 환경 배포 및 모니터링 시작',   'not_started', '2026-05-30', null,          4, true, now(), now(), 'SEED')
on conflict (milestone_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900005: 현장 설비 모니터링
-- ─────────────────────────────────────────────────────────
insert into pms.pr_milestone_m (milestone_id, project_id, milestone_code, milestone_name, description, status_code, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (501, 900005, 'M5-001', '센서 연동 완료',     '현장 센서 데이터 실시간 수집 확인',   'in_progress', '2026-03-15', 1, true, now(), now(), 'SEED'),
  (502, 900005, 'M5-002', '대시보드 오픈',      '실시간 모니터링 대시보드 배포',         'not_started', '2026-04-30', 2, true, now(), now(), 'SEED'),
  (503, 900005, 'M5-003', '알람 시스템 가동',   '알람 정책 설정 및 운영 시작',           'not_started', '2026-05-15', 3, true, now(), now(), 'SEED')
on conflict (milestone_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900006: CRM 마이그레이션
-- ─────────────────────────────────────────────────────────
insert into pms.pr_milestone_m (milestone_id, project_id, milestone_code, milestone_name, description, status_code, due_at, achieved_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (601, 900006, 'M6-001', '데이터 분석 완료',   '현행 CRM 데이터 구조 및 품질 분석 완료', 'achieved',    '2026-02-28', '2026-02-28', 1, true, now(), now(), 'SEED'),
  (602, 900006, 'M6-002', '매핑 설계 완료',     '소스→타겟 데이터 매핑 설계서 승인',       'in_progress', '2026-03-20', null,          2, true, now(), now(), 'SEED'),
  (603, 900006, 'M6-003', '이관 완료',          '전체 데이터 이관 및 1차 검증',            'not_started', '2026-04-15', null,          3, true, now(), now(), 'SEED'),
  (604, 900006, 'M6-004', '정합성 검증 통과',   '마이그레이션 정합성 최종 승인',            'not_started', '2026-05-10', null,          4, true, now(), now(), 'SEED')
on conflict (milestone_id) do nothing;

-- Reset sequence
select setval(
  pg_get_serial_sequence('pms.pr_milestone_m', 'milestone_id'),
  greatest(
    (select coalesce(max(milestone_id),0) from pms.pr_milestone_m),
    604
  )
);

commit;
