import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select';
import { Label } from './label';

/**
 * Select 컴포넌트는 드롭다운 선택 입력입니다.
 *
 * ## 높이 규격
 * - 기본 높이: 36px (h-control-h)
 *
 * ## 사용 지침
 * - 5개 이상 옵션은 검색 가능한 Combobox 권장
 * - placeholder로 선택 안내
 * - 그룹이 있을 경우 SelectGroup + SelectLabel 사용
 */
const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 Select */
export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="선택하세요" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">옵션 1</SelectItem>
        <SelectItem value="option2">옵션 2</SelectItem>
        <SelectItem value="option3">옵션 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** 기본값 설정 */
export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="option2">
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">옵션 1</SelectItem>
        <SelectItem value="option2">옵션 2</SelectItem>
        <SelectItem value="option3">옵션 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** 비활성화 상태 */
export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="선택 불가" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">옵션 1</SelectItem>
      </SelectContent>
    </Select>
  ),
};

// ============================================================================
// 그룹 및 라벨
// ============================================================================

/** 그룹 Select */
export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="프로젝트 유형 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>개발</SelectLabel>
          <SelectItem value="si">SI (시스템 구축)</SelectItem>
          <SelectItem value="sm">SM (시스템 유지보수)</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>컨설팅</SelectLabel>
          <SelectItem value="consulting">IT 컨설팅</SelectItem>
          <SelectItem value="audit">시스템 진단</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

// ============================================================================
// Label과 함께
// ============================================================================

/** Label + Select */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <Label>프로젝트 상태</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="상태 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="planning">기획</SelectItem>
          <SelectItem value="progress">진행중</SelectItem>
          <SelectItem value="review">검수</SelectItem>
          <SelectItem value="complete">완료</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** 필수 선택 */
export const Required: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <Label>
        담당자 <span className="text-ls-red">*</span>
      </Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="담당자 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user1">홍길동</SelectItem>
          <SelectItem value="user2">김철수</SelectItem>
          <SelectItem value="user3">이영희</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

// ============================================================================
// 실제 사용 예시
// ============================================================================

/** 너비 변형 */
export const Widths: Story = {
  render: () => (
    <div className="space-y-4">
      <Select>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="w-32" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">옵션</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="w-64" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">옵션</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className="w-96">
          <SelectValue placeholder="w-96" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">옵션</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** 검색 필터 영역 */
export const SearchFilters: Story = {
  render: () => (
    <div className="flex gap-4 rounded-lg border p-4">
      <div className="grid gap-1.5">
        <Label className="text-xs">프로젝트 유형</Label>
        <Select defaultValue="all">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="si">SI</SelectItem>
            <SelectItem value="sm">SM</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">상태</Label>
        <Select defaultValue="all">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="progress">진행중</SelectItem>
            <SelectItem value="complete">완료</SelectItem>
            <SelectItem value="delay">지연</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">담당자</Label>
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user1">홍길동</SelectItem>
            <SelectItem value="user2">김철수</SelectItem>
            <SelectItem value="user3">이영희</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};

/** 폼 내 Select */
export const InForm: Story = {
  render: () => (
    <div className="w-80 space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">프로젝트 등록</h3>
      <div className="grid gap-1.5">
        <Label>
          프로젝트명 <span className="text-ls-red">*</span>
        </Label>
        <input
          className="flex h-control-h w-full rounded-md border px-3 py-2 text-sm"
          placeholder="프로젝트명을 입력하세요"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>
          프로젝트 유형 <span className="text-ls-red">*</span>
        </Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="유형 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="si">SI (시스템 구축)</SelectItem>
            <SelectItem value="sm">SM (시스템 유지보수)</SelectItem>
            <SelectItem value="consulting">컨설팅</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>
          PM <span className="text-ls-red">*</span>
        </Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="PM 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user1">홍길동</SelectItem>
            <SelectItem value="user2">김철수</SelectItem>
            <SelectItem value="user3">이영희</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
