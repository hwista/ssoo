-- =========================================================
-- Seed: 01_project_status_code.sql
-- 프로젝트 상태/단계/결과 코드
-- =========================================================

begin;

-- PROJECT_STATUS (4단계: 요청 → 제안 → 수행 → 전환)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('PROJECT_STATUS','request','요청','Request','고객 요청 접수 및 검토 단계.',10,now(),now()),
('PROJECT_STATUS','proposal','제안','Proposal','견적/제안서 작성 및 계약 협상 단계.',20,now(),now()),
('PROJECT_STATUS','execution','수행','Execution','계약 체결 후 프로젝트 수행 단계.',30,now(),now()),
('PROJECT_STATUS','transition','전환','Transition','프로젝트 완료 후 운영/유지보수 전환 단계.',40,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_STAGE (각 상태 내 진행 단계)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('PROJECT_STAGE','waiting','대기','Waiting','아직 본격 작업 전 대기.',10,now(),now()),
('PROJECT_STAGE','in_progress','진행','In Progress','작업 진행 중.',20,now(),now()),
('PROJECT_STAGE','done','완료','Done','해당 상태가 종료.',30,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_DONE_RESULT (상태별 종료 결과)
-- request done: accepted(채용), rejected(거절), hold(보류)
-- proposal done: won(수주), lost(실주), hold(보류)
-- execution done: completed(완료), transfer_pending(운영 전환 필요), linked(프로젝트 연계), cancelled(취소), hold(보류)
-- transition done: transferred(전환완료), cancelled(취소)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
-- 요청 단계 결과
('PROJECT_DONE_RESULT','accepted','채용','Accepted','요청 채용 (제안 단계 전환 예정).',10,now(),now()),
('PROJECT_DONE_RESULT','rejected','거절','Rejected','요청 거절 (종료).',15,now(),now()),
-- 제안 단계 결과
('PROJECT_DONE_RESULT','won','수주','Won','계약 성사 (수행 전환 예정).',20,now(),now()),
('PROJECT_DONE_RESULT','lost','실주','Lost','무산/패배.',25,now(),now()),
-- 수행 단계 결과
('PROJECT_DONE_RESULT','completed','완료','Completed','프로젝트 정상 완료.',30,now(),now()),
('PROJECT_DONE_RESULT','transfer_pending','전환 필요','Transfer Pending','운영 전환 필요 (transition 단계 전환).',35,now(),now()),
('PROJECT_DONE_RESULT','linked','연계','Linked','다음 프로젝트 연계.',40,now(),now()),
('PROJECT_DONE_RESULT','cancelled','취소','Cancelled','프로젝트 취소.',45,now(),now()),
-- 전환 단계 결과
('PROJECT_DONE_RESULT','transferred','전환완료','Transferred','운영/유지보수 전환 완료.',50,now(),now()),
-- 공통
('PROJECT_DONE_RESULT','hold','보류','Hold','보류 (추후 재개 가능).',60,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
