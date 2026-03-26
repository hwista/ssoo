begin;

-- PROJECT_HANDOFF_TYPE
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_HANDOFF_TYPE','PRE_TO_PM','기회→PM 인계','Pre→PM','기회 단계에서 PM에게 실행 인수 목적 인계.',10),
('PROJECT_HANDOFF_TYPE','PRE_TO_CONTRACT_OWNER','기회→계약담당 인계','Pre→Contract Owner','기회 단계에서 AM/계약담당에게 계약 진행 목적 인계.',20),
('PROJECT_HANDOFF_TYPE','EXEC_TO_CONTRACT_OWNER','실행→계약이행 인계','Exec→Contract Owner','실행 중 중도금/정산 등 계약 이행 목적 인계.',30),
('PROJECT_HANDOFF_TYPE','EXEC_TO_SM','실행→운영 인계','Exec→SM','종료 후 운영 전환 목적 인계(SM).',40)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_HANDOFF_STAGE
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_HANDOFF_STAGE','waiting','대기','Waiting','인계 생성(수신자 미착수).',10),
('PROJECT_HANDOFF_STAGE','in_progress','진행','In Progress','수신자 인수/진행 중.',20),
('PROJECT_HANDOFF_STAGE','done','완료','Done','인계 완료.',30)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
