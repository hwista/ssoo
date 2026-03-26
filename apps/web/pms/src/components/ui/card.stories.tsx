import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Badge } from './badge';

/**
 * Card 컴포넌트는 관련 콘텐츠를 그룹화하는 컨테이너입니다.
 *
 * ## 구성 요소
 * - `Card`: 컨테이너
 * - `CardHeader`: 상단 영역 (제목, 설명)
 * - `CardTitle`: 제목
 * - `CardDescription`: 부제목/설명
 * - `CardContent`: 본문 콘텐츠
 * - `CardFooter`: 하단 액션 영역
 */
const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 카드 */
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>카드 제목</CardTitle>
        <CardDescription>카드에 대한 설명입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>카드 본문 내용이 들어갑니다.</p>
      </CardContent>
    </Card>
  ),
};

/** 헤더만 있는 카드 */
export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>알림</CardTitle>
        <CardDescription>새로운 알림이 있습니다.</CardDescription>
      </CardHeader>
    </Card>
  ),
};

/** Footer 포함 카드 */
export const WithFooter: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>작업 확인</CardTitle>
        <CardDescription>이 작업을 진행하시겠습니까?</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          이 작업은 되돌릴 수 없습니다.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">취소</Button>
        <Button>확인</Button>
      </CardFooter>
    </Card>
  ),
};

// ============================================================================
// 실제 사용 예시
// ============================================================================

/** 프로젝트 카드 */
export const ProjectCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>고객사 ERP 구축</CardTitle>
            <CardDescription>2026.01 ~ 2026.12</CardDescription>
          </div>
          <Badge variant="default">진행중</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">PM</span>
            <span>홍길동</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">투입인원</span>
            <span>15명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">진척률</span>
            <span>45%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          상세보기
        </Button>
      </CardFooter>
    </Card>
  ),
};

/** 통계 카드 */
export const StatCard: Story = {
  render: () => (
    <Card className="w-48">
      <CardHeader className="pb-2">
        <CardDescription>총 프로젝트</CardDescription>
        <CardTitle className="text-3xl">128</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          <span className="text-green-600">+12%</span> 전월 대비
        </p>
      </CardContent>
    </Card>
  ),
};

/** 통계 카드 그리드 */
export const StatCardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>총 프로젝트</CardDescription>
          <CardTitle className="text-2xl">128</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>진행중</CardDescription>
          <CardTitle className="text-2xl text-blue-600">42</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>완료</CardDescription>
          <CardTitle className="text-2xl text-green-600">78</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>지연</CardDescription>
          <CardTitle className="text-2xl text-red-600">8</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
};

/** 폼 카드 */
export const FormCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>계정 정보를 입력해주세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">이메일</label>
          <input
            type="email"
            placeholder="example@company.com"
            className="flex h-control-h w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">비밀번호</label>
          <input
            type="password"
            placeholder="비밀번호"
            className="flex h-control-h w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">로그인</Button>
      </CardFooter>
    </Card>
  ),
};

/** 프로젝트 리스트 카드 */
export const ProjectListCard: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      {[
        { name: '고객사 ERP 구축', status: '진행중', pm: '홍길동' },
        { name: '시스템 유지보수', status: '대기', pm: '김철수' },
        { name: '인프라 점검', status: '완료', pm: '이영희' },
      ].map((project, i) => (
        <Card key={i} className="cursor-pointer transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{project.name}</CardTitle>
              <Badge
                variant={
                  project.status === '진행중'
                    ? 'default'
                    : project.status === '대기'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {project.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">PM: {project.pm}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
