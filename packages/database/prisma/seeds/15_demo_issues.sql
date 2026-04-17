-- =========================================================
-- Seed: 15_demo_issues.sql
-- 프로젝트별 이슈 (2~4건씩, 다양한 상태)
-- =========================================================

begin;

-- ─────────────────────────────────────────────────────────
-- 900001: LS ERP 고도화
-- ─────────────────────────────────────────────────────────
insert into pms.pr_issue_m (issue_id, project_id, issue_code, issue_title, description, issue_type_code, status_code, priority_code, reported_by_user_id, assignee_user_id, reported_at, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (1, 900001, 'I1-001', 'ERP 인터페이스 규격 미확정', '레거시 ERP 시스템 인터페이스 규격이 아직 확정되지 않아 설계 진행 불가', 'impediment', 'open', 'high', 6, 2, '2026-03-05', '2026-03-15', 1, true, now(), now(), 'SEED'),
  (2, 900001, 'I1-002', '데이터 마이그레이션 범위 변경', '고객사에서 마이그레이션 대상 테이블 20개 추가 요청', 'requirement_change', 'in_progress', 'normal', 4, 3, '2026-03-08', '2026-03-25', 2, true, now(), now(), 'SEED'),
  (3, 900001, 'I1-003', '개발 서버 환경 구성 지연', '클라우드 인프라 프로비저닝 지연으로 개발 환경 1주 지연', 'impediment', 'resolved', 'high', 3, 5, '2026-02-20', '2026-03-01', 3, true, now(), now(), 'SEED')
on conflict (issue_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900002: 통합 포털 리뉴얼
-- ─────────────────────────────────────────────────────────
insert into pms.pr_issue_m (issue_id, project_id, issue_code, issue_title, description, issue_type_code, status_code, priority_code, reported_by_user_id, assignee_user_id, reported_at, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (4, 900002, 'I2-001', '접근성 기준 상향', 'WCAG 2.1 AA → AAA 수준으로 접근성 기준 상향 요청', 'requirement_change', 'open', 'high', 4, 3, '2026-03-10', '2026-03-20', 1, true, now(), now(), 'SEED'),
  (5, 900002, 'I2-002', 'IE11 호환성 이슈', '일부 고객사에서 IE11 사용 확인, 폴리필 대응 필요', 'bug', 'deferred', 'low', 3, 3, '2026-03-12', null, 2, true, now(), now(), 'SEED')
on conflict (issue_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900003: 모바일 오더 시스템
-- ─────────────────────────────────────────────────────────
insert into pms.pr_issue_m (issue_id, project_id, issue_code, issue_title, description, issue_type_code, status_code, priority_code, reported_by_user_id, assignee_user_id, reported_at, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (6, 900003, 'I3-001', '결제 모듈 연동 방식 미확정', '결제 PG사 선정 지연으로 연동 규격 확정 불가', 'impediment', 'open', 'critical', 2, 4, '2026-02-28', '2026-03-10', 1, true, now(), now(), 'SEED'),
  (7, 900003, 'I3-002', '오프라인 모드 요구사항 추가', '현장 네트워크 불안정 지역 대응을 위한 오프라인 모드 추가 요청', 'requirement_change', 'open', 'normal', 6, 3, '2026-03-03', '2026-03-20', 2, true, now(), now(), 'SEED'),
  (8, 900003, 'I3-003', '재고 조회 API 응답 지연', '기존 ERP 재고 조회 API가 3초 이상 소요, 성능 개선 필요', 'bug', 'in_progress', 'high', 3, 3, '2026-03-05', '2026-03-15', 3, true, now(), now(), 'SEED')
on conflict (issue_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900004: 데이터 레이크 구축
-- ─────────────────────────────────────────────────────────
insert into pms.pr_issue_m (issue_id, project_id, issue_code, issue_title, description, issue_type_code, status_code, priority_code, reported_by_user_id, assignee_user_id, reported_at, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (9, 900004, 'I4-001', '소스 시스템 접근 권한 미부여', 'MES 시스템 DB 접근 권한 요청 후 2주째 미승인', 'impediment', 'resolved', 'high', 3, 2, '2026-02-15', '2026-02-28', 1, true, now(), now(), 'SEED'),
  (10, 900004, 'I4-002', 'Kafka 클러스터 장애', '개발 환경 Kafka 클러스터 OOM으로 일시 중단', 'bug', 'closed', 'critical', 3, 5, '2026-03-10', '2026-03-12', 2, true, now(), now(), 'SEED'),
  (11, 900004, 'I4-003', '데이터 정합성 기준 정의 필요', '품질 검증 기준(오류율, 완전성, 일관성) 정의 미비', 'inquiry', 'open', 'normal', 6, 2, '2026-03-15', '2026-03-25', 3, true, now(), now(), 'SEED'),
  (12, 900004, 'I4-004', '개인정보 마스킹 요구사항 추가', 'GDPR 대응을 위한 PII 데이터 마스킹 처리 추가', 'requirement_change', 'in_progress', 'high', 4, 3, '2026-03-18', '2026-04-05', 4, true, now(), now(), 'SEED')
on conflict (issue_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900005: 현장 설비 모니터링
-- ─────────────────────────────────────────────────────────
insert into pms.pr_issue_m (issue_id, project_id, issue_code, issue_title, description, issue_type_code, status_code, priority_code, reported_by_user_id, assignee_user_id, reported_at, due_at, sort_order, is_active, created_at, updated_at, last_source)
values
  (13, 900005, 'I5-001', '센서 프로토콜 비호환', 'A라인 설비 센서가 Modbus TCP 미지원, 별도 게이트웨이 필요', 'impediment', 'in_progress', 'high', 5, 3, '2026-02-25', '2026-03-10', 1, true, now(), now(), 'SEED'),
  (14, 900005, 'I5-002', '알람 임계값 기준 정의 지연', '현장 담당자와 임계값 합의 미완료', 'inquiry', 'open', 'normal', 2, 5, '2026-03-01', '2026-03-15', 2, true, now(), now(), 'SEED')
on conflict (issue_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900006: CRM 마이그레이션
-- ─────────────────────────────────────────────────────────
insert into pms.pr_issue_m (issue_id, project_id, issue_code, issue_title, description, issue_type_code, status_code, priority_code, reported_by_user_id, assignee_user_id, reported_at, due_at, resolved_at, resolution, sort_order, is_active, created_at, updated_at, last_source)
values
  (15, 900006, 'I6-001', '레거시 CRM 문자셋 이슈', '기존 CRM이 EUC-KR 인코딩 사용, UTF-8 변환 시 일부 문자 깨짐', 'bug', 'resolved', 'high', 3, 3, '2026-02-20', '2026-03-05', '2026-03-03', 'iconv 변환 스크립트로 해결, 깨진 3건은 수동 보정', 1, true, now(), now(), 'SEED'),
  (16, 900006, 'I6-002', '고객 연락처 중복 데이터 처리', '동일 고객 다건 중복 존재, 정합 기준 필요', 'inquiry', 'in_progress', 'normal', 6, 2, '2026-03-05', '2026-03-20', null, null, 2, true, now(), now(), 'SEED'),
  (17, 900006, 'I6-003', '이관 후 레포트 불일치 위험', '마이그레이션 후 기존 리포트와 수치 차이 발생 가능성', 'risk', 'open', 'high', 2, 3, '2026-03-10', '2026-04-01', null, null, 3, true, now(), now(), 'SEED')
on conflict (issue_id) do nothing;

-- Reset sequence
select setval(
  pg_get_serial_sequence('pms.pr_issue_m', 'issue_id'),
  greatest(
    (select coalesce(max(issue_id),0) from pms.pr_issue_m),
    17
  )
);

commit;
