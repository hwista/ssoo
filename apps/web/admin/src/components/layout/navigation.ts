import {
  Building2, KeyRound, LayoutDashboard, Shield, Search, Bot, Code2, Users,
  User, AppWindow, ClipboardCheck, Network, UserCog, Ticket, UserCheck,
  History, Mail, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  keywords?: string;
}
export interface AdminNavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

// One discoverable entry per management responsibility; contextual panels reuse the same programs.
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { id: 'people', title: '조직·사용자', icon: Building2, items: [
    { href: '/organizations', label: '회사·조직 관리', icon: Building2, description: '조직 계층과 운영 상태를 관리합니다.', keywords: '회사 부서 신설 폐쇄 복구' },
    { href: '/users', label: '사용자 관리', icon: Users, description: '사용자를 등록하고 기본정보와 역할을 변경합니다.', keywords: '직원 계정 등록 이름' },
    { href: '/memberships', label: '사용자 소속 관리', icon: Network, description: '소속 배치·겸직·전보·종료를 처리합니다.', keywords: '구성원 인사 이동 주 소속 배치 전보 겸직 종료' },
    { href: '/accounts', label: '계정 상태·복구', icon: UserCog, description: '계정 중지·잠금 해제·세션 회수·비밀번호 복구를 처리합니다.', keywords: '로그인 잠금 비밀번호 초기화 퇴사 세션' },
  ] },
  { id: 'access', title: '이용·권한', icon: Shield, items: [
    { href: '/applications', label: '애플리케이션 기준', icon: AppWindow, description: '5개 앱의 접속 경로와 이용 정책을 확인합니다.', keywords: '서비스 앱 목록 기준' },
    { href: '/service-grants', label: '서비스 이용권 관리', icon: Ticket, description: '사용자·조직별 앱 이용권을 부여·변경·회수합니다.', keywords: '서비스 이용 접근 허용 기간 회수' },
    { href: '/roles', label: '역할·기능 권한', icon: Shield, description: '역할별 허용 기능과 변경 영향을 확인합니다.', keywords: '역할 & 권한 편집 기능 명세' },
    { href: '/organization-permissions', label: '조직 공통 권한', icon: Building2, description: '조직 구성원에게 적용할 공통 권한을 관리합니다.', keywords: '부서 권한 부여 종료 회수' },
    { href: '/user-permissions', label: '사용자 권한 예외', icon: User, description: '개별 사용자의 공통 권한 허용·차단 예외를 관리합니다.', keywords: '사용자 공통 예외 허용 차단' },
    { href: '/access-diagnosis', label: '유효 권한 진단', icon: Search, description: '사용자가 앱에 접근할 수 있는지와 판정 근거를 확인합니다.', keywords: '권한 조회 접근 불가 거부 진단' },
    { href: '/approval-authorities', label: '승인 담당자·위임', icon: UserCheck, description: '승인 담당자의 범위·기간을 지정하고 회수합니다.', keywords: '승인 권한 위임 담당자 교체' },
  ] },
  { id: 'operations', title: '신청·이력', icon: ClipboardCheck, items: [
    { href: '/approvals', label: '공통 신청 처리', icon: ClipboardCheck, description: '가입·조직·소속·서비스 신청을 승인하거나 반려합니다.', keywords: '신청 승인 가입 반려 취소' },
    { href: '/operation-history', label: '공통 변경 이력', icon: History, description: '대상·기간·처리자로 변경 전후와 사유를 추적합니다.', keywords: '감사 이벤트 운영 이력 기록' },
  ] },
  { id: 'system', title: '시스템 운영', icon: Settings, items: [
    { href: '/codes', label: '공통코드 관리', icon: Code2, description: '공통 코드와 사용 범위·참조 영향을 관리합니다.' },
    { href: '/auth', label: '인증 정책', icon: KeyRound, description: '로그인·가입·비밀번호 복구 정책을 설정합니다.', keywords: 'Microsoft SSO 로그인 설정' },
    { href: '/email-operations', label: '인증 메일 운영', icon: Mail, description: '메일 연결·발송·실패 재시도·로컬 수신함을 확인합니다.', keywords: 'SMTP Graph 메일 전달 이메일 수신함 시험 발송' },
    { href: '/ai-operations', label: 'AI 실행 운영', icon: Bot, description: '임베딩 연결과 색인 작업의 실행·실패·재시도를 관리합니다.', keywords: 'AI 운영 임베딩 Azure 인덱싱 색인 제공자 worker' },
  ] },
];
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  ...ADMIN_NAV_GROUPS.flatMap(group => group.items),
];
export const PERSONAL_NAV_ITEMS: AdminNavItem[] = [
  { href: '/my-organizations', label: '내 소속', icon: User },
  { href: '/my-services', label: '내 서비스 이용', icon: AppWindow },
  { href: '/approvals', label: '공통 신청 처리', icon: ClipboardCheck, keywords: '신청 승인' },
];
const ROLE_PATHS: Record<string, string> = {
  'organization-permissions': '/organization-permissions',
  'user-permissions': '/user-permissions',
  'approval-authorities': '/approval-authorities',
  inspect: '/access-diagnosis',
  audit: '/operation-history',
};

// Retain old contextual links while giving each program a stable tab and address.
export function normalizeAdminPath(path: string): string {
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  const tab = params.get('tab') ?? '';
  const destination = pathname === '/roles' ? ROLE_PATHS[tab] : undefined;
  if (!destination) return path || '/';
  params.delete('tab');
  if (tab === 'audit') params.set('view', 'events');
  return destination + (params.size ? `?${params}` : '');
}

export function getAdminNavItem(path: string): AdminNavItem {
  const pathname = normalizeAdminPath(path).split('?')[0] || '/';
  if (pathname === '/ssoo/search') return { href: pathname, label: '통합 검색', icon: Search };
  return [...ADMIN_NAV_ITEMS, ...PERSONAL_NAV_ITEMS].find(item => item.href === pathname) ?? ADMIN_NAV_ITEMS[0];
}
export function getAdminTabOptions(path: string) {
  const normalizedPath = normalizeAdminPath(path);
  const pathname = normalizedPath.split('?')[0] || '/';
  const item = getAdminNavItem(normalizedPath);
  return {
    id: pathname === '/' ? 'home' : pathname.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, ''),
    title: pathname === '/' ? '홈' : item.label,
    path: normalizedPath,
    closable: pathname !== '/',
  };
}
export function getAdminTabIcon(path: string) { return getAdminNavItem(path).icon; }

/** Page location uses the same Korean labels as the navigation directory. */
export function getAdminBreadcrumb(path: string) {
  const item = getAdminNavItem(path);
  const group = ADMIN_NAV_GROUPS.find(group => group.items.some(entry => entry.href === item.href));
  return [group?.title ?? '플랫폼 관리', item.label].map((label, index) => ({ id: `${item.href}-${index}`, label, path: index ? item.href : '/' }));
}
