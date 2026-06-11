import { ShellFrame, ShellPageContainer } from '@ssoo/web-shell';
import { BarChart3, Building2, CircleDollarSign, FileText, Handshake, ShieldCheck } from 'lucide-react';

const navItems = [
  { label: '영업기회', description: '현황/등록 1차 범위', icon: BarChart3, active: true },
  { label: '견적', description: '다음 구현 예정', icon: FileText, active: false },
  { label: '계약 원장', description: 'CRM 소유 예정', icon: CircleDollarSign, active: false },
  { label: 'PMS 인계', description: '읽기 스냅샷 예정', icon: Handshake, active: false },
  { label: '공용 Admin', description: '계정/권한 참조', icon: ShieldCheck, active: false },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellFrame
      sidebar={
        <aside className="group/sidebar fixed left-0 top-0 z-40 flex h-full w-14 flex-col overflow-hidden border-r border-ssoo-content-border bg-white transition-[width,box-shadow] duration-300 hover:w-[340px] hover:shadow-xl">
          <div className="flex h-header-h items-center gap-3 bg-ssoo-primary px-3 text-white">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white text-sm font-bold text-ssoo-primary">C</div>
            <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              <p className="truncate text-sm font-semibold">SSOO CRM</p>
              <p className="truncate text-[11px] text-white/70">Sales & Contract Ledger</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={item.active ? 'flex items-center gap-3 rounded-xl bg-ssoo-sitemap-bg px-3 py-3 text-ssoo-primary' : 'flex items-center gap-3 rounded-xl px-3 py-3 text-gray-400'}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <div className="min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                    <div className="truncate text-sm font-medium">{item.label}</div>
                    <div className="truncate text-xs text-gray-500">{item.description}</div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="border-t border-ssoo-content-border px-3 py-3 text-[10px] text-gray-400">
            <div className="group-hover/sidebar:hidden">CRM</div>
            <div className="hidden group-hover/sidebar:block">중복 구현 금지 경계 적용</div>
          </div>
        </aside>
      }
      mainOffset={56}
      className="bg-gray-50"
    >
      <header className="flex h-header-h items-center justify-between bg-ssoo-primary px-5 text-white">
        <div>
          <div className="text-sm font-semibold">CRM 워크스페이스</div>
          <div className="text-xs text-white/70">영업기회 → 계약 원장 후보 → 읽기용 PMS 인계</div>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs">
          <Building2 className="h-4 w-4" />
          계정·권한·법인·조직은 공용 Admin 참조
        </div>
      </header>
      <div className="flex-1 overflow-auto bg-background">
        <ShellPageContainer as="div" className="max-w-[1440px] px-4 py-6">
          {children}
        </ShellPageContainer>
      </div>
    </ShellFrame>
  );
}
