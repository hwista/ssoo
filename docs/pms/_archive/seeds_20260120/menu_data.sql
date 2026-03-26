-- ============================================
-- Menu Seed Data (초기 메뉴 데이터)
-- 비즈니스 프로세스 흐름: 요청 → 제안 → 계약 → 실행 → 종료 → 이관 → 운영
-- ============================================

-- 기존 데이터 정리 (개발 환경용)
-- DELETE FROM cm_role_menu_r;
-- DELETE FROM cm_user_menu_r;
-- DELETE FROM cm_user_favorite_r;
-- DELETE FROM cm_menu_m;

-- ============================================
-- 1레벨 메뉴 (비즈니스 프로세스 단계)
-- ============================================

-- 1. 대시보드 (메인 진입점)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('dashboard', '대시보드', 'Dashboard', 'menu', '/dashboard', 'LayoutDashboard', 1, 1, true, '전체 현황, KPI, 알림', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 2. 요청 (고객 요청, AM 관리)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('request', '요청', 'Request', 'group', '/request', 'MessageSquare', 2, 1, true, '고객 요청 접수/관리, AM 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 3. 제안 (영업기회, 사전검토, 제안서)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('opportunity', '제안', 'Opportunity', 'group', '/opportunity', 'Lightbulb', 3, 1, true, '영업기회, 사전검토, 제안서', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 4. 계약 (계약 관리, 수주 확정)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('contract', '계약', 'Contract', 'group', '/contract', 'FileText', 4, 1, true, '계약 관리, 수주 확정', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 5. 실행 (프로젝트 관리 - 핵심)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('project', '실행', 'Project', 'group', '/project', 'Rocket', 5, 1, true, '프로젝트 목록/상세, 진행관리, 산출물, WBS, 이슈, 리스크', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 6. 종료 (프로젝트 완료)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('closing', '종료', 'Closing', 'group', '/closing', 'CheckCircle', 6, 1, true, '프로젝트 완료조건 검증, 클로징 리포트', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 7. 이관 (SI → SM 전환)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('handoff', '이관', 'Handoff', 'group', '/handoff', 'ArrowRightLeft', 7, 1, true, 'SM 이관 준비, 승인, 완료', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 8. 운영 (SM 업무)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('operation', '운영', 'Operation', 'group', '/operation', 'Settings', 8, 1, true, '운영 시스템, 유지보수, SLA', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9. 관리자 (기준정보, 새 창)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, description, updated_at)
VALUES ('admin', '관리자', 'Admin', 'group', '/admin', 'Shield', 99, 1, true, '사용자/역할/부서/메뉴/고객사/코드 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- ============================================
-- 2레벨 메뉴 (필요시 추가 - 현재는 placeholder)
-- 실제 2레벨/3레벨 메뉴는 업무 설계 후 추가 예정
-- ============================================

-- 5.1 프로젝트 목록 (실행 메뉴 하위 - 예시)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('project.list', '프로젝트 목록', 'Project List', 'menu', '/project', 'List', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'project'), true, '프로젝트 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9.1 사용자 관리 (관리자 메뉴 하위)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('admin.user', '사용자 관리', 'User Management', 'menu', '/admin/user', 'Users', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, '사용자 계정 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9.2 역할 관리
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('admin.role', '역할 관리', 'Role Management', 'menu', '/admin/role', 'UserCog', 2, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, '역할 및 권한 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9.3 메뉴 관리
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('admin.menu', '메뉴 관리', 'Menu Management', 'menu', '/admin/menu', 'Menu', 3, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, '메뉴 구조 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9.4 코드 관리
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('admin.code', '코드 관리', 'Code Management', 'menu', '/admin/code', 'Code', 4, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, '공통 코드 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9.5 고객사 관리 (기준정보 - Admin으로 이동)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('admin.customer', '고객사 관리', 'Customer Management', 'menu', '/admin/customer', 'Building2', 5, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, '고객사/플랜트/시스템 기준정보', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 9.6 부서 관리
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('admin.dept', '부서 관리', 'Department Management', 'menu', '/admin/dept', 'Network', 6, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, '부서 구조 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- ============================================
-- 요청 > 고객요청 관리 하위 메뉴 (2026-01-19 추가)
-- ============================================

-- 2.1 고객요청 관리 (2레벨 그룹)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('request.customer', '고객요청 관리', 'Customer Request', 'group', '/request/customer', 'MessageSquarePlus', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'request'), true, '고객 요청 접수 및 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 2.1.1 고객요청 목록 (3레벨 메뉴)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('request.customer.list', '고객요청 목록', 'Customer Request List', 'menu', '/request/customer', 'List', 1, 3, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'request.customer'), true, '고객 요청 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;

-- 2.1.2 고객요청 등록 (3레벨 액션 - 메뉴 비노출)
INSERT INTO cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, description, updated_at)
VALUES ('request.customer.create', '고객요청 등록', 'Create Customer Request', 'action', '/request/customer/create', 'Plus', 2, 3, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'request.customer'), false, '고객 요청 신규 등록', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO NOTHING;
