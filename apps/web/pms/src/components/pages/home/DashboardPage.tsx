'use client';

import { Home, Calendar, CheckSquare, TrendingUp, Clock } from 'lucide-react';

/**
 * 홈 대시보드 페이지
 * - 기본 랜딩 페이지 (첫 접속 시 표시)
 * - 추후 개발 예정:
 *   - 오늘의 할 일 (My Tasks)
 *   - 프로젝트 진척도 요약
 *   - 최근 활동 내역
 *   - 집계/통계 위젯
 */
export function HomeDashboardPage() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* 아이콘 */}
        <div className="w-20 h-20 mx-auto mb-6 bg-ssoo-content-bg rounded-full flex items-center justify-center">
          <Home className="w-10 h-10 text-ssoo-primary" />
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          SSOO에 오신 것을 환영합니다
        </h1>
        <p className="text-gray-500 mb-8">
          좌측 메뉴에서 원하는 항목을 선택하거나,<br />
          아래 기능을 활용해보세요.
        </p>

        {/* 대시보드 위젯 Placeholder */}
        <div className="grid grid-cols-2 gap-4 text-left">
          <DashboardWidget
            icon={CheckSquare}
            title="오늘의 할 일"
            description="준비 중"
            color="text-ls-green"
          />
          <DashboardWidget
            icon={TrendingUp}
            title="프로젝트 진척도"
            description="준비 중"
            color="text-ls-sub-blue"
          />
          <DashboardWidget
            icon={Calendar}
            title="일정"
            description="준비 중"
            color="text-ssoo-primary"
          />
          <DashboardWidget
            icon={Clock}
            title="최근 활동"
            description="준비 중"
            color="text-ls-gray"
          />
        </div>
      </div>
    </div>
  );
}

interface DashboardWidgetProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

function DashboardWidget({ icon: Icon, title, description, color }: DashboardWidgetProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-ssoo-sitemap-bg transition-colors cursor-pointer">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}
