import type { Meta, StoryObj } from '@storybook/react';
import { Search as SearchIcon, Mail, Lock } from 'lucide-react';
import { Input } from './input';
import { Label } from './label';

/**
 * Input 컴포넌트는 텍스트 입력을 위한 기본 폼 요소입니다.
 *
 * ## 높이 규격
 * - 기본 높이: 36px (h-control-h)
 *
 * ## 사용 지침
 * - Label과 함께 사용 권장
 * - placeholder는 예시 형식 안내에만 사용
 * - 필수 입력은 Label에 * 표시
 */
const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'date', 'search'],
      description: '입력 타입',
    },
    placeholder: {
      control: 'text',
      description: '플레이스홀더 텍스트',
    },
    disabled: {
      control: 'boolean',
      description: '비활성화 상태',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 텍스트 입력 */
export const Default: Story = {
  args: {
    type: 'text',
    placeholder: '텍스트를 입력하세요',
  },
};

/** 이메일 입력 */
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'example@company.com',
  },
};

/** 비밀번호 입력 */
export const Password: Story = {
  args: {
    type: 'password',
    placeholder: '비밀번호를 입력하세요',
  },
};

/** 숫자 입력 */
export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

/** 날짜 입력 */
export const Date: Story = {
  args: {
    type: 'date',
  },
};

/** 검색 입력 */
export const Search: Story = {
  args: {
    type: 'search',
    placeholder: '검색어를 입력하세요',
  },
};

// ============================================================================
// 상태
// ============================================================================

/** 비활성화 상태 */
export const Disabled: Story = {
  args: {
    placeholder: '입력 불가',
    disabled: true,
  },
};

/** 값이 있는 상태 */
export const WithValue: Story = {
  args: {
    defaultValue: '입력된 값',
  },
};

/** 읽기 전용 */
export const ReadOnly: Story = {
  args: {
    defaultValue: '읽기 전용 값',
    readOnly: true,
  },
};

// ============================================================================
// Label과 함께
// ============================================================================

/** Label + Input 조합 */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="name">이름</Label>
      <Input id="name" placeholder="홍길동" />
    </div>
  ),
};

/** 필수 입력 표시 */
export const Required: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">
        이메일 <span className="text-ls-red">*</span>
      </Label>
      <Input id="email" type="email" placeholder="example@company.com" required />
    </div>
  ),
};

/** 도움말 텍스트 */
export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="username">사용자 ID</Label>
      <Input id="username" placeholder="영문, 숫자 조합 8자 이상" />
      <p className="text-xs text-muted-foreground">영문, 숫자 조합 8자 이상 입력하세요.</p>
    </div>
  ),
};

// ============================================================================
// 아이콘 조합
// ============================================================================

/** 아이콘 + Input (래퍼 필요) */
export const WithIconLeft: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder="검색어를 입력하세요" />
    </div>
  ),
};

/** 로그인 폼 예시 */
export const LoginForm: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-4">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" type="email" placeholder="이메일" />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" type="password" placeholder="비밀번호" />
      </div>
    </div>
  ),
};

// ============================================================================
// 크기 비교
// ============================================================================

/** 너비 변형 */
export const Widths: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input className="w-32" placeholder="w-32" />
      <Input className="w-64" placeholder="w-64" />
      <Input className="w-full max-w-sm" placeholder="max-w-sm" />
    </div>
  ),
};
