-- =========================================================
-- Seed: 03_project_close_condition.sql
-- 프로젝트 종료 조건 항목 코드
-- =========================================================

begin;

insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, updated_at)
values
('PROJECT_CLOSE_CONDITION_ITEM','DELIVERABLE_SUBMITTED','산출물 제출','Deliverables Submitted','필요 산출물 제출(확정 포함) 완료를 근거로 종료 조건 충족.',10,now()),
('PROJECT_CLOSE_CONDITION_ITEM','CUSTOMER_ACCEPTANCE_SIGNED','검수확인서 서명','Acceptance Signed','고객 검수 인수 확인서 서명 완료.',20,now()),
('PROJECT_CLOSE_CONDITION_ITEM','FINAL_REPORT_DONE','종료 보고 완료','Final Report Done','종료 보고/최종 결과 보고 완료.',30,now()),
('PROJECT_CLOSE_CONDITION_ITEM','HANDOVER_COMPLETED','인수인계 완료','Handover Completed','운영/차기 담당자 인수인계 완료.',40,now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
