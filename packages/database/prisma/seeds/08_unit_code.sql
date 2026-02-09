-- =========================================================
-- Seed: 08_unit_code.sql
-- 단위 코드 (UNIT)
-- =========================================================

begin;

insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, updated_at)
values
('UNIT','KRW','원','KRW','대한민국 원화.',10,now()),
('UNIT','USD','달러','USD','미국 달러.',20,now()),
('UNIT','EUR','유로','EUR','유럽연합 유로.',30,now()),
('UNIT','JPY','엔','JPY','일본 엔.',40,now())
on conflict (code_group, code_value) do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
