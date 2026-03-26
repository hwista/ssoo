-- =========================================================
-- Seed: 02_project_deliverable_status.sql
-- 프로젝트 산출물 제출 상태 코드
-- =========================================================

begin;

-- PROJECT_DELIVERABLE_SUBMISSION_STATUS
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, updated_at)
values
('PROJECT_DELIVERABLE_SUBMISSION_STATUS','before_submit','제출 전','Before Submit','산출물 작성/준비 단계.',10,now()),
('PROJECT_DELIVERABLE_SUBMISSION_STATUS','submitted','제출됨','Submitted','내부 제출 또는 고객 전달 완료.',20,now()),
('PROJECT_DELIVERABLE_SUBMISSION_STATUS','confirmed','확정','Confirmed','고객 검토 확정 완료.',30,now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
