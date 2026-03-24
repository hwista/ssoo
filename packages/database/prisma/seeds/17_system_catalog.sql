-- =========================================================
-- Seed: 17_system_catalog.sql
-- 시스템 카탈로그 기본 데이터
-- =========================================================

begin;

INSERT INTO pms.cm_system_catalog_m (
  catalog_code, catalog_name, parent_code, sort_order, description, updated_at
) VALUES
  ('MES', 'MES', NULL, 10, '제조 실행 시스템', CURRENT_TIMESTAMP),
  ('ERP', 'ERP', NULL, 20, '전사적 자원 관리', CURRENT_TIMESTAMP),
  ('SCADA', 'SCADA', NULL, 30, '감시 제어 및 데이터 수집', CURRENT_TIMESTAMP),
  ('QMS', 'QMS', NULL, 40, '품질 관리 시스템', CURRENT_TIMESTAMP),
  ('WMS', 'WMS', NULL, 50, '창고 관리 시스템', CURRENT_TIMESTAMP),
  ('LIMS', 'LIMS', NULL, 60, '실험실 정보 관리 시스템', CURRENT_TIMESTAMP),
  ('PLC', 'PLC', NULL, 70, '프로그래머블 로직 컨트롤러', CURRENT_TIMESTAMP),
  ('DAS', 'DAS', 'MES', 11, '데이터 수집 시스템', CURRENT_TIMESTAMP),
  ('HMI', 'HMI', 'MES', 12, '휴먼 머신 인터페이스', CURRENT_TIMESTAMP)
ON CONFLICT (catalog_code) DO UPDATE SET
  catalog_name = EXCLUDED.catalog_name,
  parent_code = EXCLUDED.parent_code,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

commit;
