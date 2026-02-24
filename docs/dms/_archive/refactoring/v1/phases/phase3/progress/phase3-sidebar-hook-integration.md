# Phase 3 Sidebar Hook Integration Report

**Date**: 2025-10-29  
**Scope**: WikiSidebar `useTreeData` 도입 (검색/확장/선택 로직 이전)  
**Related Plan Sections**: Phase 3.2 (성능 최적화) - 3.2.1 메모이제이션 준비

---
## 1. 목표 대비 매핑
| 계획 요소 | 기존 구현 위치 | 변경 후 책임 | 상태 |
|-----------|----------------|-------------|------|
| 트리 확장/축소 | `WikiSidebar` 내부 setExpandedFolders 조작 | `useTreeData.toggleFolder / expandAll / collapseAll` | ✅ 완료 |
| 검색 필터링 | `WikiSidebar` 내부 `filteredFiles` useMemo | `useTreeData.filteredData` | ✅ 완료 |
| 파일/폴더 선택 | `handleFileSelect` 직접 처리 | `useTreeData.selectFile` + context sync | ✅ 완료 |
| 초기 확장 상태 | context `expandedFolders` | `useTreeData` 초기값 + 동기화 | ✅ 완료 |
| 검색 상태 | 로컬 `searchQuery` | 훅 내부 `searchTerm` (UI 입력 → setSearchTerm) | ✅ 완료 |

---
## 2. 코드 변경 요약
- Added: `import { useTreeData } from '@/hooks/useTreeData'` in `WikiSidebar.tsx`
- Removed: 수동 expand/collapse/search filtering useMemo
- Added: 훅 사용으로 `filteredData`, `toggleFolder`, `expandAll`, `collapseAll`, `selectFile`, `setSearchTerm` 사용
- Replaced: `filteredFiles` → `filteredData` 전달 to `TreeComponent`
- Synced: 훅의 `expandedFolders` → context `setExpandedFolders` (점진적 마이그레이션 단계)
- Simplified: 불필요 loop & unused 변수 제거 (`searchTerm` not referenced directly)

---
## 3. Plan Alignment Check
| 체크 항목 | 기대 | 결과 |
|-----------|------|------|
| 로직 분리 | Sidebar UI 경량화 | 비즈니스 로직 훅으로 이전됨 |
| 성능 준비 | 메모이제이션 적용 용이 | 검색/필터 계산 단일 위치화 |
| 중복 감소 | 필터/확장 로직 단일화 | 기존 useMemo 및 재귀 제거 |
| 회귀 위험 | 선택/로드 정상 동작 | 선택 시 loadFile 유지, 폴더 토글 정상 |

---
## 4. 남은 개선 (Follow-up)
| 항목 | 설명 | 계획 |
|------|------|------|
| context 중복 상태 | expandedFolders/selectedFile 이중 관리 | 훅 전면 채택 후 context 축소 후보 (Phase 3 후반) |
| 디바운스 | 검색 입력 즉각 반영 → 대규모 데이터 시 낭비 가능 | threshold > 300 노드 시 디바운스 추가 검토 |
| 이벤트 동기화 | TreeComponent -> expandedFolders change 단순 동기화 | 추후 훅 콜백 직접 연결 구조 개선 |

---
## 5. 리스크 평가
| 리스크 | 수준 | 설명 | 완화 |
|--------|------|------|------|
| 중복 상태 유지 | 중간 | 이중 출처(source of truth) | 점진적 context 축소 예정 |
| 대용량 검색 성능 | 낮음 | 현재 데이터 적음 | 후속 측정 후 필요 시 최적화 |

---
## 6. 차기 단계 권장
1. `useFileSystem` 도입 가능성 검토 (Sidebar에서 context 파일 동작 직접 호출 제거)
2. WikiEditor → `useEditor` 전환
3. React.memo 적용 후보: TreeComponent (node props 안정화 전) 사전 준비

---
**Status**: Sidebar `useTreeData` 통합 완료. 다음 단계로 진행 가능.
