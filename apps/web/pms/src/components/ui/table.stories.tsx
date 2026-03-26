import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from './table';
import { Badge } from './badge';
import { Checkbox } from './checkbox';
import { Button } from './button';
import { MoreHorizontal } from 'lucide-react';

/**
 * Table 컴포넌트는 데이터를 표 형식으로 표시합니다.
 *
 * ## 구성 요소
 * - `Table`: 테이블 컨테이너
 * - `TableHeader`: 헤더 행 그룹
 * - `TableBody`: 본문 행 그룹
 * - `TableFooter`: 푸터 행 그룹
 * - `TableRow`: 행
 * - `TableHead`: 헤더 셀
 * - `TableCell`: 데이터 셀
 * - `TableCaption`: 테이블 설명
 *
 * ## 사용 지침
 * - TanStack Table과 함께 사용 권장
 * - 셀 내용이 길면 말줄임 처리
 * - 액션 버튼은 마지막 열에 배치
 */
const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Table>;

// 샘플 데이터
const projects = [
  { id: 1, name: '고객사 ERP 구축', pm: '홍길동', status: '진행중', type: 'SI', progress: 45 },
  { id: 2, name: '시스템 유지보수', pm: '김철수', status: '대기', type: 'SM', progress: 0 },
  { id: 3, name: '인프라 점검', pm: '이영희', status: '완료', type: '컨설팅', progress: 100 },
  { id: 4, name: 'ERP 2차 개발', pm: '박민수', status: '지연', type: 'SI', progress: 30 },
  { id: 5, name: '보안 취약점 분석', pm: '최지우', status: '진행중', type: '컨설팅', progress: 60 },
];

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 테이블 */
export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>프로젝트명</TableHead>
          <TableHead>PM</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.slice(0, 3).map((project) => (
          <TableRow key={project.id}>
            <TableCell>{project.name}</TableCell>
            <TableCell>{project.pm}</TableCell>
            <TableCell>{project.type}</TableCell>
            <TableCell>{project.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** Caption 포함 */
export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>2026년 1분기 프로젝트 목록</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>프로젝트명</TableHead>
          <TableHead>PM</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.slice(0, 3).map((project) => (
          <TableRow key={project.id}>
            <TableCell>{project.name}</TableCell>
            <TableCell>{project.pm}</TableCell>
            <TableCell>{project.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

// ============================================================================
// 실제 사용 예시
// ============================================================================

/** 체크박스 + 뱃지 + 액션 */
export const FullFeatureTable: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox />
          </TableHead>
          <TableHead>프로젝트명</TableHead>
          <TableHead>PM</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="text-right">진척률</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <Checkbox />
            </TableCell>
            <TableCell className="font-medium">{project.name}</TableCell>
            <TableCell>{project.pm}</TableCell>
            <TableCell>
              <Badge variant="outline">{project.type}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  project.status === '진행중'
                    ? 'default'
                    : project.status === '대기'
                    ? 'secondary'
                    : project.status === '지연'
                    ? 'destructive'
                    : 'outline'
                }
              >
                {project.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{project.progress}%</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** Footer 포함 (합계) */
export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>항목</TableHead>
          <TableHead className="text-right">수량</TableHead>
          <TableHead className="text-right">단가</TableHead>
          <TableHead className="text-right">금액</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>개발 인력</TableCell>
          <TableCell className="text-right">10 MM</TableCell>
          <TableCell className="text-right">15,000,000</TableCell>
          <TableCell className="text-right">150,000,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>인프라 비용</TableCell>
          <TableCell className="text-right">1 식</TableCell>
          <TableCell className="text-right">30,000,000</TableCell>
          <TableCell className="text-right">30,000,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>라이선스</TableCell>
          <TableCell className="text-right">5 건</TableCell>
          <TableCell className="text-right">2,000,000</TableCell>
          <TableCell className="text-right">10,000,000</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="font-semibold">
            합계
          </TableCell>
          <TableCell className="text-right font-semibold">190,000,000</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

/** 빈 상태 */
export const EmptyState: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>프로젝트명</TableHead>
          <TableHead>PM</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            데이터가 없습니다.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/** 로딩 상태 */
export const Loading: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>프로젝트명</TableHead>
          <TableHead>PM</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map((i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="h-4 w-40 animate-pulse rounded bg-muted"></div>
            </TableCell>
            <TableCell>
              <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
            </TableCell>
            <TableCell>
              <div className="h-5 w-14 animate-pulse rounded bg-muted"></div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** 클릭 가능한 행 */
export const ClickableRows: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>프로젝트명</TableHead>
          <TableHead>PM</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.slice(0, 3).map((project) => (
          <TableRow
            key={project.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => alert(`${project.name} 클릭`)}
          >
            <TableCell className="font-medium">{project.name}</TableCell>
            <TableCell>{project.pm}</TableCell>
            <TableCell>
              <Badge variant="default">{project.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** 고정 열 너비 */
export const FixedWidths: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead className="w-64">프로젝트명</TableHead>
          <TableHead className="w-24">PM</TableHead>
          <TableHead className="w-20">유형</TableHead>
          <TableHead className="w-20">상태</TableHead>
          <TableHead className="w-24 text-right">진척률</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project, i) => (
          <TableRow key={project.id}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="font-medium">{project.name}</TableCell>
            <TableCell>{project.pm}</TableCell>
            <TableCell>{project.type}</TableCell>
            <TableCell>{project.status}</TableCell>
            <TableCell className="text-right">{project.progress}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
