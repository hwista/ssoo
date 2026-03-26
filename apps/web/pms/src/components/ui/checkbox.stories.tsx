import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

/**
 * Checkbox 컴포넌트는 다중 선택이 가능한 입력 요소입니다.
 *
 * ## 사용 지침
 * - Label과 함께 사용 권장
 * - 그룹 선택 시 세로 배치
 * - 단일 동의/확인은 가로 배치
 */
const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: '체크 상태',
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
type Story = StoryObj<typeof Checkbox>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 체크박스 */
export const Default: Story = {
  args: {},
};

/** 체크된 상태 */
export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

/** 비활성화 상태 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/** 비활성화 + 체크 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

// ============================================================================
// Label과 함께
// ============================================================================

/** Label과 함께 */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">이용약관에 동의합니다</Label>
    </div>
  ),
};

/** 필수 체크 */
export const Required: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="required" required />
      <Label htmlFor="required">
        개인정보 수집에 동의합니다 <span className="text-ls-red">*</span>
      </Label>
    </div>
  ),
};

// ============================================================================
// 그룹 체크박스
// ============================================================================

/** 세로 그룹 */
export const VerticalGroup: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="option1" defaultChecked />
        <Label htmlFor="option1">옵션 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option2" />
        <Label htmlFor="option2">옵션 2</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option3" />
        <Label htmlFor="option3">옵션 3</Label>
      </div>
    </div>
  ),
};

/** 가로 그룹 */
export const HorizontalGroup: Story = {
  render: () => (
    <div className="flex space-x-6">
      <div className="flex items-center space-x-2">
        <Checkbox id="h1" defaultChecked />
        <Label htmlFor="h1">SI</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="h2" />
        <Label htmlFor="h2">SM</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="h3" />
        <Label htmlFor="h3">컨설팅</Label>
      </div>
    </div>
  ),
};

// ============================================================================
// 실제 사용 예시
// ============================================================================

/** 전체 선택 패턴 */
export const SelectAll: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 border-b pb-2">
        <Checkbox id="all" />
        <Label htmlFor="all" className="font-semibold">
          전체 선택
        </Label>
      </div>
      <div className="ml-4 space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="item1" />
          <Label htmlFor="item1">항목 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="item2" />
          <Label htmlFor="item2">항목 2</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="item3" />
          <Label htmlFor="item3">항목 3</Label>
        </div>
      </div>
    </div>
  ),
};

/** 동의 폼 */
export const AgreementForm: Story = {
  render: () => (
    <div className="w-80 space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">약관 동의</h3>
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox id="agree1" className="mt-0.5" />
          <div>
            <Label htmlFor="agree1">
              이용약관 동의 <span className="text-ls-red">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">서비스 이용약관에 동의합니다.</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox id="agree2" className="mt-0.5" />
          <div>
            <Label htmlFor="agree2">
              개인정보 처리방침 동의 <span className="text-ls-red">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">개인정보 수집 및 이용에 동의합니다.</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox id="agree3" className="mt-0.5" />
          <div>
            <Label htmlFor="agree3">마케팅 수신 동의 (선택)</Label>
            <p className="text-xs text-muted-foreground">프로모션 및 이벤트 정보를 받습니다.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** 테이블 내 체크박스 */
export const InTable: Story = {
  render: () => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="w-10 p-2">
            <Checkbox />
          </th>
          <th className="p-2 text-left">프로젝트명</th>
          <th className="p-2 text-left">PM</th>
        </tr>
      </thead>
      <tbody>
        {['고객사 ERP 구축', '시스템 유지보수', '인프라 점검'].map((name, i) => (
          <tr key={i} className="border-b">
            <td className="p-2 text-center">
              <Checkbox />
            </td>
            <td className="p-2">{name}</td>
            <td className="p-2">홍길동</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
