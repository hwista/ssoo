-- =========================================================
-- Seed: 10_project_member_task_issue_code.sql
-- 프로젝트 멤버 역할, 태스크/마일스톤/이슈 상태 코드
-- =========================================================

begin;

-- PROJECT_MEMBER_ROLE (프로젝트 멤버 역할)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('PROJECT_MEMBER_ROLE','pm','프로젝트매니저','Project Manager','프로젝트 총괄 관리자.',10,now(),now()),
('PROJECT_MEMBER_ROLE','pmo','PMO','PMO','프로젝트 관리 오피스 담당자.',15,now(),now()),
('PROJECT_MEMBER_ROLE','am','영업담당','Account Manager','고객 영업/관계 관리 담당.',20,now(),now()),
('PROJECT_MEMBER_ROLE','sm','SM담당','Service Manager','운영/유지보수 담당자.',25,now(),now()),
('PROJECT_MEMBER_ROLE','developer','개발자','Developer','시스템 개발 담당.',30,now(),now()),
('PROJECT_MEMBER_ROLE','consultant','컨설턴트','Consultant','업무 분석/설계 컨설턴트.',35,now(),now()),
('PROJECT_MEMBER_ROLE','architect','아키텍트','Architect','기술 아키텍처 설계 담당.',40,now(),now()),
('PROJECT_MEMBER_ROLE','qa','품질관리','QA','품질 관리/테스트 담당.',45,now(),now()),
('PROJECT_MEMBER_ROLE','reviewer','검수자','Reviewer','산출물/품질 검수 담당.',50,now(),now()),
('PROJECT_MEMBER_ROLE','customer_rep','고객대표','Customer Representative','고객측 프로젝트 대표.',60,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- TASK_STATUS (태스크 상태)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('TASK_STATUS','not_started','미착수','Not Started','작업 시작 전.',10,now(),now()),
('TASK_STATUS','in_progress','진행중','In Progress','작업 진행 중.',20,now(),now()),
('TASK_STATUS','completed','완료','Completed','작업 완료.',30,now(),now()),
('TASK_STATUS','on_hold','보류','On Hold','작업 일시 중단.',40,now(),now()),
('TASK_STATUS','cancelled','취소','Cancelled','작업 취소.',50,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- TASK_TYPE (태스크 유형)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('TASK_TYPE','analysis','분석','Analysis','업무/요구사항 분석.',10,now(),now()),
('TASK_TYPE','design','설계','Design','시스템/화면 설계.',20,now(),now()),
('TASK_TYPE','development','개발','Development','프로그램 개발/구현.',30,now(),now()),
('TASK_TYPE','test','테스트','Test','단위/통합/사용자 테스트.',40,now(),now()),
('TASK_TYPE','deployment','배포','Deployment','시스템 배포/이관.',50,now(),now()),
('TASK_TYPE','review','검토','Review','산출물/코드 검토.',60,now(),now()),
('TASK_TYPE','management','관리','Management','프로젝트 관리 활동.',70,now(),now()),
('TASK_TYPE','meeting','회의','Meeting','회의/미팅.',80,now(),now()),
('TASK_TYPE','documentation','문서화','Documentation','문서 작성.',90,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- TASK_PRIORITY (태스크 우선순위)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('TASK_PRIORITY','critical','긴급','Critical','즉시 처리 필요.',10,now(),now()),
('TASK_PRIORITY','high','높음','High','우선 처리 필요.',20,now(),now()),
('TASK_PRIORITY','normal','보통','Normal','일반 우선순위.',30,now(),now()),
('TASK_PRIORITY','low','낮음','Low','여유 있을 때 처리.',40,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- MILESTONE_STATUS (마일스톤 상태)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('MILESTONE_STATUS','not_started','미착수','Not Started','마일스톤 시작 전.',10,now(),now()),
('MILESTONE_STATUS','in_progress','진행중','In Progress','마일스톤 진행 중.',20,now(),now()),
('MILESTONE_STATUS','achieved','달성','Achieved','마일스톤 달성 완료.',30,now(),now()),
('MILESTONE_STATUS','missed','미달성','Missed','기한 내 미달성.',40,now(),now()),
('MILESTONE_STATUS','cancelled','취소','Cancelled','마일스톤 취소.',50,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- ISSUE_TYPE (이슈 유형)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('ISSUE_TYPE','bug','버그','Bug','시스템 결함/오류.',10,now(),now()),
('ISSUE_TYPE','requirement_change','요구변경','Requirement Change','고객 요구사항 변경.',20,now(),now()),
('ISSUE_TYPE','risk','위험','Risk','잠재적 리스크.',30,now(),now()),
('ISSUE_TYPE','impediment','장애','Impediment','작업 진행 방해 요소.',40,now(),now()),
('ISSUE_TYPE','inquiry','문의','Inquiry','확인/질의 사항.',50,now(),now()),
('ISSUE_TYPE','improvement','개선','Improvement','프로세스/품질 개선 제안.',60,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- ISSUE_STATUS (이슈 상태)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('ISSUE_STATUS','open','등록','Open','이슈 등록됨.',10,now(),now()),
('ISSUE_STATUS','in_progress','처리중','In Progress','이슈 처리 중.',20,now(),now()),
('ISSUE_STATUS','resolved','해결','Resolved','이슈 해결 완료.',30,now(),now()),
('ISSUE_STATUS','closed','종료','Closed','이슈 종료 (확인 완료).',40,now(),now()),
('ISSUE_STATUS','deferred','보류','Deferred','이슈 처리 보류.',50,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- ISSUE_PRIORITY (이슈 우선순위 - TASK_PRIORITY와 동일 구조이나 별도 그룹)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('ISSUE_PRIORITY','critical','긴급','Critical','즉시 대응 필요.',10,now(),now()),
('ISSUE_PRIORITY','high','높음','High','우선 대응.',20,now(),now()),
('ISSUE_PRIORITY','normal','보통','Normal','일반 우선순위.',30,now(),now()),
('ISSUE_PRIORITY','low','낮음','Low','여유 있을 때 대응.',40,now(),now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
