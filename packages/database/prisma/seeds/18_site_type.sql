-- =========================================================
-- Seed: 18_site_type.sql
-- Site 유형 코드
-- =========================================================

begin;

insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, updated_at)
values
('SITE_TYPE', 'PLANT', '플랜트/공장', 'Plant', '생산 공장 또는 제조 플랜트.', 10, now()),
('SITE_TYPE', 'OFFICE', '사무실', 'Office', '본사/지사 등 업무용 사무 공간.', 20, now()),
('SITE_TYPE', 'WAREHOUSE', '창고/물류센터', 'Warehouse', '보관/출하 중심의 물류 거점.', 30, now()),
('SITE_TYPE', 'DATACENTER', '데이터센터', 'Datacenter', '서버/네트워크 운영 중심의 데이터센터.', 40, now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
