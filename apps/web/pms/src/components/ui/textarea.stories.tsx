import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

/**
 * Textarea 컴포넌트는 여러 줄의 텍스트 입력을 위한 요소입니다.
 *
 * ## 사용 지침
 * - 긴 텍스트 입력에 사용 (설명, 비고, 내용 등)
 * - 최소 높이 60px, 필요시 rows로 조절
 * - resize 필요 시 className으로 제어
 */
const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: '플레이스홀더 텍스트',
    },
    rows: {
      control: 'number',
      description: '표시 줄 수',
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
type Story = StoryObj<typeof Textarea>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 Textarea */
export const Default: Story = {
  args: {
    placeholder: '내용을 입력하세요',
    className: 'w-80',
  },
};

/** 긴 입력 영역 */
export const LargeArea: Story = {
  args: {
    placeholder: '상세 내용을 입력하세요',
    rows: 6,
    className: 'w-80',
  },
};

/** 비활성화 상태 */
export const Disabled: Story = {
  args: {
    placeholder: '입력 불가',
    disabled: true,
    className: 'w-80',
  },
};

/** 값이 있는 상태 */
export const WithValue: Story = {
  args: {
    defaultValue:
      '이것은 입력된 텍스트입니다.\n여러 줄로 입력할 수 있습니다.\n세 번째 줄입니다.',
    className: 'w-80',
  },
};

/** 읽기 전용 */
export const ReadOnly: Story = {
  args: {
    defaultValue: '이 내용은 수정할 수 없습니다.',
    readOnly: true,
    className: 'w-80',
  },
};

// ============================================================================
// Label과 함께
// ============================================================================

/** Label + Textarea */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-80 gap-1.5">
      <Label htmlFor="description">설명</Label>
      <Textarea id="description" placeholder="프로젝트 설명을 입력하세요" />
    </div>
  ),
};

/** 필수 입력 */
export const Required: Story = {
  render: () => (
    <div className="grid w-80 gap-1.5">
      <Label htmlFor="content">
        내용 <span className="text-ls-red">*</span>
      </Label>
      <Textarea id="content" placeholder="필수 입력 항목입니다" required />
    </div>
  ),
};

/** 글자 수 제한 */
export const WithCharCount: Story = {
  render: () => (
    <div className="grid w-80 gap-1.5">
      <Label htmlFor="limited">비고 (최대 500자)</Label>
      <Textarea id="limited" placeholder="비고를 입력하세요" maxLength={500} />
      <p className="text-right text-xs text-muted-foreground">0 / 500</p>
    </div>
  ),
};

/** 도움말 텍스트 */
export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-80 gap-1.5">
      <Label htmlFor="notes">특이사항</Label>
      <Textarea id="notes" placeholder="특이사항을 입력하세요" rows={4} />
      <p className="text-xs text-muted-foreground">
        프로젝트 진행 시 참고할 특이사항을 기록합니다.
      </p>
    </div>
  ),
};

// ============================================================================
// 실제 사용 예시
// ============================================================================

/** 프로젝트 등록 폼 */
export const ProjectForm: Story = {
  render: () => (
    <div className="w-96 space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">프로젝트 상세 정보</h3>
      <div className="grid gap-1.5">
        <Label>
          프로젝트 개요 <span className="text-ls-red">*</span>
        </Label>
        <Textarea placeholder="프로젝트의 목적과 범위를 설명하세요" rows={3} />
      </div>
      <div className="grid gap-1.5">
        <Label>기대 효과</Label>
        <Textarea placeholder="예상되는 효과를 기술하세요" rows={3} />
      </div>
      <div className="grid gap-1.5">
        <Label>비고</Label>
        <Textarea placeholder="기타 참고사항" rows={2} />
      </div>
    </div>
  ),
};

/** 댓글/메모 입력 */
export const CommentInput: Story = {
  render: () => (
    <div className="w-96 rounded-lg border p-4">
      <Textarea placeholder="댓글을 입력하세요..." rows={3} className="mb-2" />
      <div className="flex justify-end">
        <button className="rounded-md bg-ssoo-primary px-4 py-2 text-sm text-white">
          등록
        </button>
      </div>
    </div>
  ),
};

/** 크기 비교 */
export const SizeComparison: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">rows=2 (기본)</Label>
        <Textarea placeholder="rows=2" rows={2} className="w-80" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">rows=4</Label>
        <Textarea placeholder="rows=4" rows={4} className="w-80" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">rows=6</Label>
        <Textarea placeholder="rows=6" rows={6} className="w-80" />
      </div>
    </div>
  ),
};

/** Resize 옵션 */
export const ResizeOptions: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">resize: none (기본)</Label>
        <Textarea placeholder="크기 조절 불가" className="w-80 resize-none" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">resize: vertical</Label>
        <Textarea placeholder="세로만 조절" className="w-80 resize-y" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">resize: both</Label>
        <Textarea placeholder="자유롭게 조절" className="w-80 resize" />
      </div>
    </div>
  ),
};
