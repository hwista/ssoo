import type { Meta, StoryObj } from '@storybook/react';
import { Search, Plus, Trash2, Download, Settings } from 'lucide-react';
import { Button } from './button';

/**
 * Button 컴포넌트는 SSOO 디자인 시스템의 핵심 액션 요소입니다.
 *
 * ## 디자인 원칙
 * - **Primary (default)**: CUD 작업, 중요 액션 (저장, 등록, 확인)
 * - **Secondary**: 일반 액션, 보조 버튼
 * - **Destructive**: 삭제, 위험한 작업 (LS Red 적용)
 * - **Ghost/Link**: 최소 강조, 텍스트 버튼
 *
 * ## 높이 규격
 * - `sm`: 32px - 작은 버튼, 인라인 컨트롤
 * - `default`: 36px - **표준 높이** (h-control-h)
 * - `lg`: 44px - 큰 버튼, 주요 액션
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive', 'ghost', 'link'],
      description: '버튼 스타일 변형',
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon'],
      description: '버튼 크기',
    },
    disabled: {
      control: 'boolean',
      description: '비활성화 상태',
    },
    asChild: {
      control: 'boolean',
      description: 'Slot 패턴으로 자식 요소에 스타일 적용',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 Primary 버튼 - CUD 작업에 사용 */
export const Default: Story = {
  args: {
    children: '저장',
    variant: 'default',
    size: 'default',
  },
};

/** Secondary 버튼 - 일반 액션 */
export const Secondary: Story = {
  args: {
    children: '취소',
    variant: 'secondary',
  },
};

/** Outline 버튼 - 보조 액션 */
export const Outline: Story = {
  args: {
    children: '상세보기',
    variant: 'outline',
  },
};

/** Destructive 버튼 - 삭제/위험 액션 (LS Red) */
export const Destructive: Story = {
  args: {
    children: '삭제',
    variant: 'destructive',
  },
};

/** Ghost 버튼 - 최소 강조 */
export const Ghost: Story = {
  args: {
    children: '더보기',
    variant: 'ghost',
  },
};

/** Link 버튼 - 텍스트 링크 스타일 */
export const Link: Story = {
  args: {
    children: '자세히 보기',
    variant: 'link',
  },
};

// ============================================================================
// 크기 변형
// ============================================================================

/** 작은 버튼 (32px) */
export const Small: Story = {
  args: {
    children: '작은 버튼',
    size: 'sm',
  },
};

/** 큰 버튼 (44px) */
export const Large: Story = {
  args: {
    children: '큰 버튼',
    size: 'lg',
  },
};

/** 아이콘 전용 버튼 */
export const IconButton: Story = {
  args: {
    size: 'icon',
    variant: 'ghost',
    children: <Search className="h-4 w-4" />,
  },
};

// ============================================================================
// 상태
// ============================================================================

/** 비활성화 상태 */
export const Disabled: Story = {
  args: {
    children: '비활성화',
    disabled: true,
  },
};

// ============================================================================
// 아이콘 조합
// ============================================================================

/** 아이콘 + 텍스트 버튼 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus className="h-4 w-4" />
        신규 등록
      </>
    ),
  },
};

/** 삭제 버튼 with 아이콘 */
export const DeleteWithIcon: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <Trash2 className="h-4 w-4" />
        삭제
      </>
    ),
  },
};

// ============================================================================
// 갤러리 뷰
// ============================================================================

/** 모든 Variant 비교 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

/** 모든 Size 비교 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small (32px)</Button>
      <Button size="default">Default (36px)</Button>
      <Button size="lg">Large (44px)</Button>
      <Button size="icon">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  ),
};

/** 실제 사용 예시 - 폼 액션 */
export const FormActions: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="default">저장</Button>
      <Button variant="outline">취소</Button>
      <Button variant="destructive">삭제</Button>
    </div>
  ),
};

/** 실제 사용 예시 - 툴바 */
export const Toolbar: Story = {
  render: () => (
    <div className="flex gap-1 rounded-md border p-1">
      <Button variant="ghost" size="icon">
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  ),
};
