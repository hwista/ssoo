# Phase 3.2 실행 계획: 성능 최적화 & 훅 통합

**작성일**: 2025-10-29  
**목표 기간**: 0.5일  
**핵심 목표**: 기존 컴포넌트에 새 훅 통합 + 렌더링/계산 최적화 + 불필요 상태 제거

---
## 1. 현재 구조 분석 요약
| 컴포넌트 | 문제/기회 | 비고 |
|----------|-----------|------|
| `WikiApp` | 수동 resize 로직 (pointer 이벤트 직접 관리) | `useResize` 훅 도입 후보 |
| `WikiSidebar` | 파일 트리/검색/컨텍스트 메뉴/CRUD 로직 복합 → 훅 미사용 | `useFileSystem`, `useTreeData` 통합 대상 |
| `WikiEditor` | 방대한 상태 & 로직(autosave, 미리보기, 삽입 등) → 커스텀 훅 미사용 | `useEditor`로 전환 + 로컬 상태 축소 |
| `TreeComponent` (예상) | 리렌더 빈도 높을 수 있음 | React.memo + item key 안정화 |

---
## 2. 도입할 훅 매핑
| 기존 책임 | 기존 위치 | 전환 대상 훅 | 통합 후 제거할 상태 |
|-----------|-----------|--------------|---------------------|
| 파일 CRUD + 로딩 | `WikiSidebar` (context 경유) | `useFileSystem` | context 경유 중복 호출/로컬 중복 상태 |
| 트리 확장/검색/선택 | `WikiSidebar` | `useTreeData` | `searchQuery`, `expandedFolders` 직접 관리 로직 일부 |
| 에디터 컨텐츠/히스토리/자동저장 | `WikiEditor` | `useEditor` | `localContent`, `hasUnsavedChanges`, `autoSave*`, 타이머 refs 등 |
| 패널 리사이즈 | `WikiApp` | `useResize` | `sidebarWidth`, `isResizing`, 수동 이벤트 등록 |

---
## 3. 최적화 전략 매트릭스
| 전략 | 적용 위치 | 상세 | 근거 |
|------|-----------|------|------|
| React.memo | `TreeComponent`, `Notification`, `WikiSidebar` 부분 분리 | props 얕은 비교 | 리스트/트리 리렌더 최소화 |
| useMemo | 필터링된 파일, 트리 검색 결과 | `filteredFiles` → 훅 내부로 이동 | 계산 캐시 |
| useCallback | 파일 선택/컨텍스트 메뉴/저장/에디터 조작 | 훅 반환 핸들러 안정화 | 자식 메모 컴포넌트 최적화 |
| 파생 상태 제거 | `WikiEditor` | 파생값: lineCount, charCount → 즉시 계산 | 상태 축소로 리렌더 감소 |
| 가상 스크롤 (조건부) | 파일 트리/검색 결과 > N개 | N=500 이상 시 도입 | 초기 과도 구현 방지 |
| Lazy load | `WikiEditor` / modal-heavy components | dynamic import | 초기 페인트 가볍게 |

---
## 4. 구현 단계 (세부 순서)
1) `useResize` 초안 작성 → `WikiApp` 교체 (기능 동일성 검증)
2) `WikiSidebar` 리팩터링 1차: 파일 로딩/CRUD 경로를 context -> 훅 직접 호출 구조로 옮김
3) `WikiSidebar` 리팩터링 2차: 트리 검색/확장/선택 로직을 `useTreeData`로 이전
4) `WikiEditor`를 `useEditor` 기반으로 전환 (undo/redo/autoSave 직접 대신 훅 API 활용)
5) 메모이제이션(React.memo/useMemo/useCallback) 적용 및 prop 안정성 점검
6) 사이드이펙트/타이머/이벤트 정리 & 누수 점검
7) (조건부) 항목 수 계측 후 virtualization 도입 여부 결정
8) 문서화 & Phase 3.2 완료 보고서 초안 작성

---
## 5. 미세 설계
### 5.1 useResize (초안)
```ts
interface UseResizeOptions { min: number; max: number; initial: number; }
interface UseResizeReturn { size: number; isResizing: boolean; props: { onMouseDown: (e: React.MouseEvent) => void }; }
```
- 내부: pointer 이벤트 → window mousemove/up 등록, cleanup
- 향후 확장: 방향(vertical/horizontal), snapPoints, onChange 콜백

### 5.2 WikiSidebar 통합 흐름
- 기존: context 기반 CRUD + 직접 필터링 + 수동 expandedFolders 관리
- 변경: `const { files, loadFiles, createFile, ... } = useFileSystem()` + `const { treeData, filteredTree, search, expand/collapse } = useTreeData(files)`
- context 중복 책임 축소 (단, 전역 공유 필요한 selectedFile 등은 context 유지 여부 재검토)

### 5.3 WikiEditor 전환
- 기존 auto-save/ref 로직 → `useEditor`가 제공하는 `autoSave`, `history`, `selection` 활용
- 로컬 UI 전용 상태만 유지 (모달 열림/닫힘 등)

---
## 6. 리스크 & 완화
| 리스크 | 설명 | 완화 방안 |
|--------|------|-----------|
| 기능 회귀 | 기존 context 호출 순서 변경으로 부작용 | 단계별 빌드 & 수동 클릭 테스트 후 진행 |
| 참조 무결성 | React.memo 적용 시 불안정 핸들러로 재렌더 | useCallback 의존성 최소화 및 의존 리스트 lint 체크 |
| over-optimization | 불필요한 memo 남발 | 측정(components render log) 기반 적용 |
| 훅 중복 책임 | context vs 훅 경계 모호 | 역할 표 정의 & 완료 보고서에 경계 표기 |

---
## 7. 완료 정의 (DoD)
- 빌드 성공 & 주요 시나리오 수동 테스트: 생성/삭제/이름변경/저장/자동저장
- 불필요했던 로컬/전역 상태 최소 3개 이상 제거
- React DevTools로 트리 렌더 횟수 감소 확인(주관적/로그 기반)
- 새 훅 사용으로 컴포넌트 내부 비즈니스 로직 30%+ 감소 (line diff 근거)
- phase3.2-completion-report.md 작성

---
## 8. 측정 초안 (간단 로그)
- 개발 모드: 각 주요 컴포넌트 useEffect에 `console.count('WikiSidebar render')` 등 삽입 (임시)
- 리팩터 후 감소 확인 → 로그 제거

---
## 9. 산출물
- `hooks/useResize.ts`
- 수정: `WikiApp.tsx`, `WikiSidebar.tsx`, `WikiEditor.tsx`, (필요 시) `TreeComponent.tsx`
- 문서: `phase3.2-completion-report.md`

---
## 10. 다음 단계 선행 조건 체크
- Phase 3.1 완료 보고서 ✅
- 훅 코드 상태 양호 ✅
- 통합 계획 수립 ✅ (본 문서)

이제 순차적으로 구현을 진행한다.
