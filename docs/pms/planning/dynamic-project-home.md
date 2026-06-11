# PMS Dynamic Project Home Definition

> 기준일: 2026-06-10
> 범위: PMS 고정 홈 탭(`/home`)의 동적 구성 정의

## 1. 원칙

PMS 홈은 역할별로 별도 화면을 만드는 기능이 아니다. 홈은 "내가 지금 권한을 가진 프로젝트들"을 기준으로, 각 프로젝트에서 내가 어떤 관계인지에 따라 필요한 신호를 동적으로 조합하는 프로젝트 중심 운영 요약이다.

따라서 홈의 기준은 다음 순서로 잡는다.

1. 사용자가 볼 수 있는 프로젝트 집합
2. 각 프로젝트에서 사용자의 관계/권한
3. 각 관계에서 지금 알아야 할 업무 신호
4. 신호의 긴급도와 행동 가능성
5. 화면 섹션의 노출/정렬/축약

즉, 사용자의 고정 직책이 아니라 현재 프로젝트 권한과 업무 상태가 홈 구성을 결정한다.

## 2. 홈이 해석해야 하는 관계

한 사용자는 동시에 여러 관계를 가질 수 있다.

| 관계 | 판정 기준 예시 | 홈에서의 의미 |
| --- | --- | --- |
| 프로젝트 PM | `roles.isProjectOwner`, `currentOwnerUserId`, `features.canAdvanceStage`, owner-level capability | 프로젝트 운영 책임자. 일정, 이슈, 산출물, 종료조건, 멤버 배정 신호가 중요하다. |
| 프로젝트 멤버 | `roles.isProjectMember`, `memberAccessLevels`, `phaseOwnerRoleCodes`, task/deliverable assignment | 내가 해야 할 작업, 산출물, 요청, 마감, 피드백이 중요하다. |
| PMO/조직 관리자 | `roles.isOwnerOrganizationMember`, 조직 리더/관리 capability, cross-project capability | 여러 프로젝트의 병목, 미배정, 정체, 단계별 흐름, 종료 누락이 중요하다. |
| 참조/열람자 | `features.canViewProject` only 또는 낮은 capability | 최근 변경, 상태 확인, 알림 정도만 필요하다. |

중요한 점은 "PM이면 PM 홈"이 아니라, A 프로젝트에서는 PM, B 프로젝트에서는 멤버, C 프로젝트에서는 PMO 관점일 수 있다는 것이다. 홈은 이 혼합 상태를 한 화면에서 자연스럽게 정리해야 한다.

## 3. 동적 구성 모델

홈은 고정된 카드 목록이 아니라 `HomeSignal` 목록을 만든 뒤, 이를 섹션에 배치한다.

```ts
type HomeRelation = 'pm' | 'member' | 'pmo' | 'viewer';

type HomeSignalKind =
  | 'my-task-due'
  | 'my-deliverable-due'
  | 'my-review-request'
  | 'project-stale'
  | 'project-unowned'
  | 'project-risk-open'
  | 'project-issue-blocking'
  | 'milestone-delayed'
  | 'deliverable-approval-pending'
  | 'closeout-blocked'
  | 'stage-transition-ready'
  | 'recent-change';

type HomeSignal = {
  projectId: string;
  projectName: string;
  relation: HomeRelation;
  kind: HomeSignalKind;
  severity: 'critical' | 'warning' | 'normal' | 'info';
  reason: string;
  nextActionLabel: string;
  targetPath: string;
  sortWeight: number;
};
```

화면은 프로젝트를 먼저 나열하지 않는다. 먼저 `HomeSignal`을 만들고, 이 신호가 프로젝트 상세/업무 큐/문서/종료조건으로 드릴다운되게 한다.

## 4. 역할별 기본 신호

### 4.1 PM 관계 프로젝트

PM으로 보는 프로젝트에서는 다음 신호를 우선한다.

| 우선 | 신호 | 화면 표현 |
| --- | --- | --- |
| 1 | 막힌 이슈/리스크 | "차단 이슈 2건" |
| 2 | 지연 마일스톤/작업 | "마일스톤 1건 지연" |
| 3 | 산출물 미승인/미제출 | "산출물 승인 대기 3건" |
| 4 | 종료조건 미충족 | "종료 조건 2개 미완료" |
| 5 | 멤버 미배정/담당 공백 | "담당 미지정" |
| 6 | 단계 전환 가능/필요 | "수행 종료 가능" 또는 "전환 확인 필요" |

PM 관계에서는 "지금 내가 운영자로서 결정하거나 밀어야 하는 것"만 상단에 올린다.

### 4.2 멤버 관계 프로젝트

멤버로 보는 프로젝트에서는 다음 신호를 우선한다.

| 우선 | 신호 | 화면 표현 |
| --- | --- | --- |
| 1 | 내 작업 오늘/이번 주 마감 | "오늘 마감 작업 1건" |
| 2 | 내 산출물 제출/수정 요청 | "산출물 수정 요청" |
| 3 | 내가 응답해야 하는 이슈/코멘트 | "응답 필요한 이슈 2건" |
| 4 | 내가 phase owner인 영역의 지연 | "내 담당 단계 지연" |
| 5 | 최근 변경 중 내 업무 영향 | "요구사항 변경 확인 필요" |

멤버 관계에서는 전체 프로젝트 운영 지표보다 "내가 해야 할 일"이 먼저다.

### 4.3 PMO/관리 관계 프로젝트

PMO/관리 관점에서는 개별 업무보다 포트폴리오 병목과 예외를 우선한다.

| 우선 | 신호 | 화면 표현 |
| --- | --- | --- |
| 1 | 담당자 없는 프로젝트 | "담당 미지정 3건" |
| 2 | 장기 정체 프로젝트 | "7일 이상 정체 4건" |
| 3 | 단계별 병목 | "제안 단계 체류 증가" |
| 4 | 종료/전환 누락 | "종료 후보 2건" |
| 5 | 조직 소유 프로젝트 리스크 | "우리 조직 프로젝트 위험 5건" |
| 6 | PM별 과부하/공백 | "PM 1명 과부하" |

PMO 관계에서는 프로젝트 하나의 세부 작업보다 "어디가 막혔는지"를 먼저 보여준다.

### 4.4 참조/열람 관계 프로젝트

참조 관계에서는 과한 운영 카드가 노출되면 안 된다.

| 우선 | 신호 | 화면 표현 |
| --- | --- | --- |
| 1 | 최근 주요 변경 | "최근 변경" |
| 2 | 상태 변경 | "수행 단계 진입" |
| 3 | 공유된 알림 | "공유 알림" |

참조자는 홈을 어지럽히지 않도록 낮은 우선순위로 축약한다.

## 5. 혼합형 우선순위

혼합형 사용자는 여러 관계의 신호가 동시에 들어온다. 이때 홈은 관계별 섹션을 무조건 나누지 않고, 우선순위 기반으로 섞되 이유를 표시한다.

예시:

1. `[멤버] 통합 포털 리뉴얼 · 오늘 마감 작업 1건`
2. `[PM] LS ERP 고도화 · 종료 조건 2개 미완료`
3. `[PMO] 우리 조직 프로젝트 · 담당 미지정 3건`
4. `[PM] 데이터 레이크 구축 · 산출물 승인 대기 2건`
5. `[참조] CRM 마이그레이션 · 수행 단계 진입`

정렬 기준은 다음을 기본값으로 둔다.

1. 내가 직접 해야 하는 일
2. 내가 책임자로 unblock 해야 하는 일
3. 조직/PMO 관점에서 누락되면 위험한 일
4. 최근 변경/참조 정보

## 6. 화면 섹션 정의

현재 홈 레이아웃은 유지하되 각 섹션을 동적으로 구성한다.

### 6.1 업무 브리핑

- 최대 3줄.
- 역할 이름을 설명하지 않고, 이유와 행동을 말한다.
- 예: "내 작업 2건이 오늘 마감이고, PM으로 맡은 프로젝트 1건은 종료 조건이 막혀 있습니다."

### 6.2 지금 봐야 할 것

현재 "지금 봐야 할 프로젝트"를 향후 "지금 봐야 할 것"에 가깝게 확장한다.

각 row는 다음을 갖는다.

- 프로젝트명
- 관계 배지: PM / 멤버 / PMO / 참조
- 신호 배지: 마감 / 지연 / 승인 / 종료 / 담당 / 변경
- 한 줄 이유
- 다음 액션

### 6.3 내 액션

멤버 또는 PM으로 직접 처리할 작업이 있을 때만 노출한다.

- 내 작업
- 내 산출물
- 내 리뷰/확인 요청
- 내 이슈 응답

직접 처리할 것이 없으면 숨긴다.

### 6.4 운영 흐름

PMO 또는 PM 관계가 있을 때 더 강조한다.

- 요청/제안/수행/종료 분포
- 정체/미지정/종료 후보 집계
- 조직 소유 프로젝트 필터

멤버만 있는 사용자는 축약하거나 하단으로 보낸다.

### 6.5 최근 움직임

항상 보일 수 있지만 낮은 우선순위다.

- 직접 액션/위험 신호가 많으면 접힌 형태로 둔다.
- 참조 관계 프로젝트는 여기에 주로 들어온다.

## 7. 과노출 방지 규칙

1. 홈 첫 화면은 "최대 7개 주요 신호"만 보여준다.
2. 같은 프로젝트에서 여러 신호가 있으면 대표 신호 1개 + 부가 카운트로 축약한다.
3. 멤버에게 PMO성 통계는 기본 축약한다.
4. PMO에게 개별 멤버 작업 목록은 기본 노출하지 않는다.
5. 참조 프로젝트는 critical 신호가 아니면 최근 움직임에만 둔다.
6. 설명문구는 제거하고, 데이터/행동 문장만 쓴다.

## 8. API/데이터 필요 사항

현재 홈은 `useProjectList` 기반이라 프로젝트 상태 중심이다. 동적 홈을 위해서는 홈 전용 집계가 필요하다.

개념 endpoint:

```http
GET /api/pms/home/summary
```

현재 SSOO API 라우팅은 PMS controller path를 `/api` 아래에 직접 노출하므로 구현 라우트는 다음과 같다.

```http
GET /api/home/summary
```

응답 개념:

```ts
type PmsHomeSummary = {
  generatedAt: string;
  relationCounts: {
    pm: number;
    member: number;
    pmo: number;
    viewer: number;
  };
  metrics: {
    directActions: number;
    attention: number;
    closeout: number;
    stale: number;
    actionableProjects: number;
    readOnlyProjects: number;
  };
  briefing: string[];
  signals: HomeSignal[]; // requiredCapability + allowedActions + primaryAction 포함
  flow: Array<{ statusCode: string; count: number }>;
  recentChanges: Array<{ projectId: string; title: string; changedAt: string; primaryAction?: HomeAction }>;
  accessProjects: Array<{
    projectId: string;
    relation: 'pm' | 'member' | 'pmo' | 'viewer';
    features: PmsProjectAccessFeatures;
    allowedActions: HomeAction[];
    primaryAction?: HomeAction;
  }>;
};
```

초기 구현은 서버 endpoint 없이 프론트에서 기존 API를 조합해도 되지만, 최종적으로는 서버 집계가 맞다. 이유는 권한 해석, 프로젝트 멤버십, 작업/산출물/이슈/종료조건 집계가 서버 정책과 함께 계산되어야 하기 때문이다.

홈의 동적 노출 기준은 다음으로 고정한다.

- `relation`은 PM/member/PMO/viewer 관계 배지와 신호 우선순위 분류에 사용한다.
- 실제 버튼/기능 노출은 `features`에서 산출한 `allowedActions`만 사용한다.
- signal은 `requiredCapability`를 가질 수 있으며, 해당 capability가 없으면 홈에서는 mutating action 대신 `view-project`만 노출한다.
- `primaryAction.targetTab`은 상세 화면의 management tab 초기 선택에 사용한다.

## 9. 구현 순서 제안

### Slice 1: 프론트 신호 모델 도입

- `DashboardPage` 내부의 `AttentionItem`을 `HomeSignal`로 확장한다.
- 관계 배지를 추가한다.
- 현재 데이터로 가능한 신호만 먼저 만든다.
  - PM 추정: `currentOwnerUserId`
  - PMO 추정: owner organization 프로젝트 집계는 아직 보류
  - 멤버 신호: 아직 없음, 빈 상태 처리

### Slice 2: 서버 home summary endpoint

- 로그인 사용자 기준 프로젝트 access snapshot을 집계한다.
- project/member/task/milestone/issue/deliverable/close condition에서 홈 신호를 생성한다.
- `/api/home/summary`를 추가한다.
- `PmsHomeSummary` 공유 타입을 `@ssoo/types/pms` 기준으로 고정한다.

### Slice 3: 동적 섹션 렌더링

- `HomeSignal` 기반으로 업무 브리핑/지금 봐야 할 것/내 액션/운영 흐름/최근 움직임을 동적 노출한다.
- 혼합형 우선순위 정렬을 적용한다.
- `allowedActions` 기반 권한별 업무 섹션을 추가한다.
- 홈에서 작업/컨트롤/산출물/종료조건 action을 누르면 프로젝트 상세의 해당 management tab으로 바로 진입한다.

### Slice 4: 사용자화

- 섹션 접기/순서/숨김을 사용자 설정으로 저장한다.
- 단, critical signal은 완전 숨김이 아니라 축약만 허용한다.

## 10. 현재 홈에 대한 판정

현재 구현은 동적 홈의 뼈대로 유지할 수 있다.

유지할 것:

- 홈은 고정 탭이며 사이드바 메뉴가 아니다.
- 카드 + 리스트 혼합형 레이아웃.
- 업무 브리핑, 지금 봐야 할 것, 프로젝트 흐름, 최근 움직임의 큰 구조.
- 설명문구를 최소화하고 신호 중심으로 보여주는 방향.

바꿀 것:

- 프로젝트 리스트 기반 attention을 role-aware/action-aware signal로 교체.
- "지금 봐야 할 프로젝트"를 "지금 봐야 할 것"으로 확장.
- PM/멤버/PMO를 별도 페이지가 아니라 관계 배지와 신호 우선순위로 표현.
- DMS 산출물/문서 신호는 프로젝트 산출물 신호로 합류.

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-11 | Extended the home summary contract with capability-derived `allowedActions`, `primaryAction`, and `accessProjects`; DashboardPage now renders permission-based actions and routes detail tabs through `managementTab`. |
| 2026-06-11 | Implemented the first server-policy home summary slice: shared `PmsHomeSummary`, `GET /api/home/summary`, server relation/signal aggregation, and DashboardPage consumption through `useHomeSummary`. |
| 2026-06-10 | Defined the dynamic project home model, HomeSignal contract, mixed-role prioritization, overexposure rules, and implementation slices. |
