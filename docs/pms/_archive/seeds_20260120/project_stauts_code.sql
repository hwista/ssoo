begin;

-- PROJECT_STATUS
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_STATUS','opportunity','기회','Opportunity','계약 전 기회(요청/제안 기반).',10),
('PROJECT_STATUS','execution','실행','Execution','계약 후 실행(프로젝트 수행).',20)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_STAGE
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_STAGE','waiting','대기','Waiting','아직 본격 작업 전(대기).',10),
('PROJECT_STAGE','in_progress','진행','In Progress','작업 진행 중.',20),
('PROJECT_STAGE','done','완료','Done','해당 상태의 종료.',30)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_SOURCE
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_SOURCE','request','요청','Request','고객 요청 기반 유입.',10),
('PROJECT_SOURCE','proposal','제안','Proposal','영업/AM 제안 기반 유입.',20)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_DONE_RESULT (opportunity + done일 때 의미)
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_DONE_RESULT','won','수주','Won','계약 성사(실행 전환 대상).',10),
('PROJECT_DONE_RESULT','lost','실주','Lost','무산/패배.',20),
('PROJECT_DONE_RESULT','hold','보류','Hold','보류(추후 재개 가능).',30)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;