'use client';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ssoo/web-ui';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { programPath } from './program-context';

export function UserParticipationDialog({ user, onClose }: { user: { id: string; userName: string; loginId: string; email?: string; roleCode?: string; isActive?: boolean }; onClose: () => void }) {
  const openTab = useTabStore(state => state.openTab);
  const links = [
    ['/accounts', '계정 상태·복구', '계정·잠금·세션'],
    ['/memberships', '소속 관리', '배치·겸직·이동·종료와 유효기간'],
    ['/service-grants', '서비스 이용권 관리', '앱별 역할·만료·회수'],
    ['/user-permissions', '사용자 권한 예외', '공통 기능의 허용·차단 예외'],
    ['/operation-history', '변경 이력', '이 사용자의 변경 사유와 전후 값'],
    ['/access-diagnosis', '접근 진단', '5개 앱 이용 자격과 기능 권한 판정'],
  ];
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>사용자 상세</DialogTitle><DialogDescription>{user.userName} · {user.loginId}</DialogDescription></DialogHeader>
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">{user.email && <><dt>이메일</dt><dd className="break-all">{user.email}</dd></>}{user.roleCode && <><dt>기본 역할</dt><dd>{({ admin: '플랫폼 관리자', manager: '매니저', user: '사용자', viewer: '조회자' } as Record<string, string>)[user.roleCode] ?? user.roleCode}</dd></>}{user.isActive !== undefined && <><dt>계정</dt><dd>{user.isActive ? '활성' : '중지'}</dd></>}</dl>
    <ul className="divide-y">{links.map(([path, label]) => <li key={path} className="space-y-2 py-3">
      <Button variant="outline" onClick={() => { const opened = openTab(getAdminTabOptions(programPath(path, { userId: user.id, ...(path === '/accounts' ? { search: user.loginId } : {}) }))); if (opened) onClose(); }}>{label} ↗</Button>
    </li>)}</ul>
  </DialogContent></Dialog>;
}
