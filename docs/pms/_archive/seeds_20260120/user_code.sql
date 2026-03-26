begin;

-- =========================================================
-- USER_TYPE: 사용자 유형
-- =========================================================
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('USER_TYPE','internal','내부','Internal','내부 직원 (우리 회사).',10),
('USER_TYPE','external','외부','External','외부 이해관계자 (고객사 담당자, 협력사 등).',20)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_STATUS: 사용자 상태
-- =========================================================
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('USER_STATUS','registered','등록됨','Registered','프로젝트 리소스로만 등록됨 (시스템 미사용).',10),
('USER_STATUS','invited','초대됨','Invited','시스템 사용 초대됨 (아직 가입 미완료).',20),
('USER_STATUS','active','활성','Active','정상 사용 중.',30),
('USER_STATUS','inactive','비활성','Inactive','일시 비활성 (휴직 등).',40),
('USER_STATUS','suspended','정지','Suspended','정지됨 (보안 이슈 등).',50)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_ROLE: 사용자 역할
-- =========================================================
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('USER_ROLE','admin','관리자','Admin','시스템 전체 관리 권한.',10),
('USER_ROLE','manager','매니저','Manager','팀/부서 관리 권한. 사용자 초대 가능.',20),
('USER_ROLE','user','사용자','User','일반 사용자. 할당된 프로젝트/업무 수행.',30),
('USER_ROLE','viewer','조회자','Viewer','조회 전용 권한.',40)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_DEPARTMENT: 부서 (예시 - 실제 조직에 맞게 수정 필요)
-- =========================================================
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('USER_DEPARTMENT','SALES','영업부','Sales','영업/제안 담당.',10),
('USER_DEPARTMENT','AM','AM팀','Account Management','고객관리/계약관리 담당.',20),
('USER_DEPARTMENT','PM','PM팀','Project Management','프로젝트 수행 담당.',30),
('USER_DEPARTMENT','SM','SM팀','Service Management','운영/유지보수 담당.',40),
('USER_DEPARTMENT','DEV','개발팀','Development','개발 담당.',50),
('USER_DEPARTMENT','ADMIN','경영지원','Administration','경영지원/관리.',60)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_POSITION: 직급/직책 (예시 - 실제 조직에 맞게 수정 필요)
-- =========================================================
insert into cm_code_m (code_group, code, display_name_ko, display_name_en, description, sort_order)
values
('USER_POSITION','EXECUTIVE','임원','Executive','임원.',10),
('USER_POSITION','DIRECTOR','팀장','Director','팀장/파트장.',20),
('USER_POSITION','SENIOR','선임','Senior','선임/책임.',30),
('USER_POSITION','STAFF','사원','Staff','사원/주임.',40)
on conflict (code_group, code) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
