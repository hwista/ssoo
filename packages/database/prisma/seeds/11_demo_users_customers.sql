-- =========================================================
-- Seed: 11_demo_users_customers.sql
-- 데모용 사용자 5명 + 고객사 6건
-- 비밀번호: user123! (bcrypt hash)
-- =========================================================

begin;

-- ─────────────────────────────────────────────────────────
-- 고객사 6건 (프로젝트 09_seed가 참조하는 1001~1006)
-- ─────────────────────────────────────────────────────────
insert into pms.cm_customer_m (
  customer_id, customer_code, customer_name, customer_type, industry,
  contact_person, contact_phone, email, phone, address, is_active,
  created_at, updated_at, last_source
)
values
  (1001, 'CUST-001', 'LS일렉트릭', 'enterprise', '제조/에너지',
   '김영수', '010-1234-5678', 'ys.kim@lselectric.co.kr', '02-2034-4000',
   '경기도 안양시 동안구', true, now(), now(), 'SEED'),
  (1002, 'CUST-002', '한국산업은행', 'enterprise', '금융',
   '박민지', '010-2345-6789', 'mj.park@kdb.co.kr', '02-787-4000',
   '서울특별시 영등포구', true, now(), now(), 'SEED'),
  (1003, 'CUST-003', 'CJ올리브네트웍스', 'enterprise', 'IT/유통',
   '이준호', '010-3456-7890', 'jh.lee@cjolivenetworks.co.kr', '02-6740-3000',
   '서울특별시 중구', true, now(), now(), 'SEED'),
  (1004, 'CUST-004', '포스코ICT', 'enterprise', '제조/IT',
   '최서연', '010-4567-8901', 'sy.choi@poscoict.com', '02-3457-7000',
   '인천광역시 연수구', true, now(), now(), 'SEED'),
  (1005, 'CUST-005', 'LS메카피온', 'enterprise', '제조/자동화',
   '정현우', '010-5678-9012', 'hw.jung@mecapion.com', '031-689-8000',
   '경기도 안양시 동안구', true, now(), now(), 'SEED'),
  (1006, 'CUST-006', 'LG유플러스', 'enterprise', 'IT/통신',
   '한소영', '010-6789-0123', 'sy.han@lguplus.co.kr', '02-2005-0000',
   '서울특별시 용산구', true, now(), now(), 'SEED')
on conflict (customer_id) do nothing;

select setval(
  pg_get_serial_sequence('pms.cm_customer_m', 'customer_id'),
  greatest(
    (select coalesce(max(customer_id),0) from pms.cm_customer_m),
    1006
  )
);

-- ─────────────────────────────────────────────────────────
-- 사용자 7명 (user_id 2~8)
-- 비밀번호 모두: user123!
-- ─────────────────────────────────────────────────────────
insert into common.cm_user_m (
  user_id,
  user_name, display_name, email,
  department_code, position_code, employee_number,
  role_code, is_active,
  memo, last_source, last_activity, updated_at
)
values
  -- PM: 프로젝트 매니저
  (2,
   '김프로', 'PM Kim', 'pm.kim@company.com',
   'PM', 'MANAGER', 'EMP002',
   'manager', true,
   '프로젝트 매니저', 'SEED', 'demo_seed', now()),

  -- 개발자
  (3,
   '이개발', 'Dev Lee', 'dev.lee@company.com',
   'DEV', 'SENIOR', 'EMP003',
   'user', true,
   '시니어 개발자', 'SEED', 'demo_seed', now()),

  -- AM: 영업담당
  (4,
   '박영업', 'AM Park', 'am.park@company.com',
   'SALES', 'MANAGER', 'EMP004',
   'user', true,
   '영업 관리자', 'SEED', 'demo_seed', now()),

  -- SM: 서비스매니저
  (5,
   '최서비', 'SM Choi', 'sm.choi@company.com',
   'SM', 'SENIOR', 'EMP005',
   'user', true,
   '서비스 매니저', 'SEED', 'demo_seed', now()),

  -- 개발자 (동일 조직 visibility 검증용)
  (7,
   '박개발', 'Dev Park', 'dev.park@company.com',
   'DEV', 'MID', 'EMP007',
   'user', true,
   '조직 공개 게시물 검증용 개발자', 'SEED', 'demo_seed', now()),

  -- 조회 전용 사용자 (권한 snapshot / same-org read-only 검증용)
  (8,
   '한조회', 'Viewer Han', 'viewer.han@company.com',
   'DEV', 'JUNIOR', 'EMP008',
   'viewer', true,
   '조회 전용 계정', 'SEED', 'demo_seed', now()),

  -- 컨설턴트
  (6,
   '정컨설', 'Con Jung', 'con.jung@company.com',
   'AM', 'SENIOR', 'EMP006',
   'user', true,
   '비즈니스 컨설턴트', 'SEED', 'demo_seed', now())
on conflict (user_id) do nothing;

select setval(
  pg_get_serial_sequence('common.cm_user_m', 'user_id'),
  greatest(
    (select coalesce(max(user_id),0) from common.cm_user_m),
    8
  )
);

insert into common.cm_user_auth_m (
  user_id, login_id, password_hash, account_status_code,
  created_at, updated_at, last_source, last_activity
)
values
  (2, 'pm.kim', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed'),
  (3, 'dev.lee', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed'),
  (4, 'am.park', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed'),
  (5, 'sm.choi', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed'),
  (7, 'dev.park', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed'),
  (8, 'viewer.han', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed'),
  (6, 'con.jung', '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56', 'active', now(), now(), 'SEED', 'demo_seed')
on conflict (user_id) do update
set
  login_id = excluded.login_id,
  password_hash = excluded.password_hash,
  account_status_code = excluded.account_status_code,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

commit;
