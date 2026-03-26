# 컴포넌트 계층 구조

> 목적: UI 컴포넌트의 책임 경계를 명확히 하고 재사용과 유지보수 비용을 줄입니다.

## 🔗 시각적 컴포넌트 확인

> **컴포넌트의 실제 모습, Props, 사용 예시는 Storybook에서 확인하세요.**
>
> - **[Storybook - UI 컴포넌트 카탈로그](../reference/storybook/index.html)**
>
> 이 문서는 **"왜 이 구조인가"** (설계 원칙/의사결정)만 다룹니다.

---

## 1. 계층 개요

PMS UI는 아래 계층 구조를 기준으로 설계합니다.

```
Level 0: shadcn/ui 원자 컴포넌트
Level 1: UI 기본 컴포넌트
Level 2: 공통 복합 컴포넌트 (common/)
Level 3: 페이지 템플릿 (templates/)
Level 4: 도메인 페이지 (pages/)
```

---

## 2. 레벨별 책임

### Level 0: shadcn/ui 원자 컴포넌트
- 외부 라이브러리 기본 컴포넌트
- 직접 스타일 변경 최소화 (토큰/테마로만 조정)
- 비즈니스 로직 없음

### Level 1: UI 기본 컴포넌트
- 프로젝트 공통 스타일을 적용한 래퍼
- 예: `PrimaryButton`, `FormInput`, `Tag`, `Badge`
- 비즈니스 로직 없음, UI 규칙만 포함

### Level 2: 공통 복합 컴포넌트 (common/)
- 다수의 기본 컴포넌트를 조합한 패턴
- 예: `SearchBar`, `FilterPanel`, `UserSelect`, `DataTable`
- 도메인에 독립적인 범위에서만 구성

### Level 3: 페이지 템플릿 (templates/)
- 레이아웃/구조 표준화
- 예: `ListPageTemplate`, `FormPageTemplate`
- 상태/비즈니스 로직은 주입 받는 형태로 제한

### Level 4: 도메인 페이지 (pages/)
- 실제 화면 단위
- API 호출, 상태 관리, 권한 체크, 라우팅 처리
- 템플릿 + 공통 컴포넌트를 조합해서 구성

---

## 3. 디렉토리 매핑 (PMS 기준)

```
apps/web/pms/src/
  components/
    ui/            # Level 1 - shadcn/ui 래퍼 컴포넌트
    common/        # Level 2 - 공통 복합 컴포넌트
      ├── ConfirmDialog.tsx   # 확인 대화상자
      ├── StateDisplay.tsx    # 상태 표시
      ├── datagrid/           # 데이터그리드 관련
      ├── form/               # 폼 관련
      └── page/               # 페이지 공통
    templates/     # Level 3 - 페이지 템플릿
    pages/         # Level 4 - 도메인 페이지
      ├── home/               # 홈 대시보드
      ├── request/            # 요청 관련
      ├── proposal/           # 제안 관련
      ├── execution/          # 실행 관련
      └── transition/         # 전환 관련
    layout/        # 레이아웃 컴포넌트 (AppLayout, sidebar 등)
```

> 실제 경로는 리팩토링 과정에서 변경될 수 있습니다. 변경 시 본 문서를 업데이트합니다.

---

## 4. 작성 규칙

1. **레벨 역전 금지**: 상위 레벨이 하위 레벨에만 의존
2. **도메인 로직 분리**: Level 2 이하에 도메인 조건/권한 로직 금지
3. **템플릿 불변성 유지**: 템플릿은 구조만 담당, 데이터는 주입
4. **재사용 우선**: 같은 패턴이 2회 이상 등장하면 공통화 검토

---

## 5. 예시 흐름

```
Domain Page (Level 4)
  -> ListPageTemplate (Level 3)
    -> SearchBar, DataTable (Level 2)
      -> Button, Input, Badge (Level 1)
        -> shadcn/ui (Level 0)
```

---

## 6. 관련 문서

### 자동 생성 문서 (컴포넌트 시각화)
- **[Storybook - UI 컴포넌트 카탈로그](../reference/storybook/index.html)** ← 컴포넌트 Props, 예시 확인

### 수동 문서 (설계/표준)
- [README.md](./README.md) - UI 디자인 문서 인덱스
- [page-layouts.md](./page-layouts.md) - 템플릿 레이아웃 기준
- [design-system.md](./design-system.md) - 디자인 토큰/컴포넌트 규칙

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-02 | 디렉토리 매핑 섹션 실제 코드 구조 반영 (components/pages/, common/ 세부구조) |
