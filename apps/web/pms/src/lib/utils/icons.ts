import {
  Home,
  Search,
  Star,
  Layers,
  FolderTree,
  Settings,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronLeft,
  X,
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  Rocket,
  ArrowRightLeft,
  Shield,
  List,
  Users,
  UserCog,
  Menu,
  Code,
  Building2,
  Network,
  LogOut,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

// Lucide 아이콘 컴포넌트 타입
type IconComponent = ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
>;

/**
 * 사용 중인 아이콘만 명시적으로 등록
 * 
 * ⚠️ 새 아이콘 추가 시 이 맵에 등록 필요
 * DB 메뉴 시드(05_menu_data.sql)에 아이콘 추가 시 여기도 함께 추가
 */
const iconMap: Record<string, IconComponent> = {
  // Sidebar 섹션
  Home,
  Search,
  Star,
  Layers,
  FolderTree,
  Settings,
  // MenuTree 기본값
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronLeft,
  X,
  // DB 메뉴 아이콘 (seeds/05_menu_data.sql)
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  Rocket,
  ArrowRightLeft,
  Shield,
  List,
  Users,
  UserCog,
  Menu,
  Code,
  Building2,
  Network,
  // Layout 컴포넌트
  LogOut,
};

/**
 * Lucide 아이콘 이름으로 컴포넌트 가져오기
 * @param iconName - 아이콘 이름 (예: 'Home', 'Settings', 'FileText')
 * @returns 아이콘 컴포넌트 또는 null
 */
export function getIconComponent(iconName: string | undefined | null): IconComponent | null {
  if (!iconName) return null;
  return iconMap[iconName] ?? null;
}

/**
 * 아이콘이 존재하는지 확인
 */
export function hasIcon(iconName: string): boolean {
  return iconName in iconMap;
}
