-- =========================================================
-- Seed: 19_system_operator_type.sql
-- System Instance 운영 주체 유형 코드
-- =========================================================

begin;

insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, updated_at)
values
('SYSTEM_OPERATOR_TYPE', 'SELF', '자사 운영', 'Self', '자사 인력/조직이 직접 운영.', 10, now()),
('SYSTEM_OPERATOR_TYPE', 'CUSTOMER', '고객 운영', 'Customer', '고객사 인력/조직이 직접 운영.', 20, now()),
('SYSTEM_OPERATOR_TYPE', 'OUTSOURCE', '외주 운영', 'Outsource', '외부 운영사 또는 협력사가 운영.', 30, now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
