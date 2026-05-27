# DMS 런칭 준비 핸드오프 — 검색/권한 게이트 closeout

> 작성: 2026-05-27 08:30 KST
> 갱신: 2026-05-27 10:24 KST
> 범위: DMS 단독 런칭 준비. PMS/CMS 통합 수용성은 이 문서 범위가 아닙니다.

---

## 1. 현재 결론

이번 슬라이스는 DMS 검색/AI 요약/검색 기록/인기 검색어/권한 요청 UX를 런칭 직전 기준으로 정리하고, 이어서 권한 없는 검색 결과의 원문 스니펫 노출, 잠긴 문서 화면/사이드카 표현, Search/Ask 차단 소스 요약, 권한 워크플로 회귀 검증까지 보안 기준에 맞게 닫은 상태입니다.

현재 완료로 볼 수 있는 범위:

- 검색 결과의 AI 요약 표시: 완료
- 서버 Docker 런타임 AI 요약 환경 반영: 완료
- AI 검색 사이드카 상단 제목 제거: 완료
- DB 기반 검색 기록/내 자주 검색/인기 검색어: 완료
- 인기 검색어 런칭 위생 정책: 완료
- 권한 없는 검색 결과 원문 스니펫 redaction: 완료
- 권한 없는 문서 클릭 시 기존 문서 화면으로 진입: 완료
- 서버 preview-only 응답: 완료
- 본문 잠금 overlay: 완료
- 문서 화면 헤더 좌측 권한 요청 CTA: 완료
- 사이드카 민감 섹션 잠금: 완료. 별도 잠금 UI가 아니라 기존 섹션 컴포넌트를 재사용하고 접힘 아이콘 위치에 자물쇠를 표시합니다.
- Search/Ask 차단 소스 수와 제외 사유 요약: 완료
- 권한 요청 생성/승인/거절/grant 회수/소유권 이전 live HTTP 회귀 검증: 완료
- DB 기반 검색 기록 모델 정식 migration 산출물: 완료
- 빌드/접근 검증/Docker 반영: 완료

런칭 전 남은 핵심 리스크:

- 검색/권한 게이트 기준의 핵심 잔여는 닫혔습니다.
- 최종 연속 게이트와 Docker 재빌드 반영은 통과했습니다.
- 남은 작업은 브라우저 런칭 스모크와 운영 seed/계정/document root freeze 확인입니다.

---

## 2. 기능/화면별 현황

| 영역 | 현재 상태 | 런칭 판단 | 비고 |
|------|-----------|-----------|------|
| AI 검색 결과 요약 | 검색 결과에 AI 요약 표시 | 완료 | 권한 없는 결과도 AI 요약은 유지 |
| 검색 결과 권한 표시 | 읽을 수 없는 문서도 발견/요청 가능 상태로 표시 | 완료 | 원문 발췌는 서버 응답 단계에서 안전 문구로 대체 |
| 검색 결과 스니펫 | unreadable 결과의 excerpt/snippets/totalSnippetCount redaction | 완료 | snippets 빈 배열, snippet count 0, 안전 문구 적용 |
| AI 검색 사이드카 | 내 자주 검색/인기 검색어/검색 기록 표시 | 완료 | 상단 패널 제목 제거, 섹션 중심 UI |
| 내 자주 검색 | 로그인 사용자 기준 DB 저장/조회 | 완료 | 브라우저 저장소 초기화 후 유지 확인 |
| 검색 기록 | 로그인 사용자 기준 DB 저장/조회 | 완료 | 기기/세션을 넘어 같은 계정이면 유지되는 구조 |
| 인기 검색어 | 전체 사용자 집계, 최소 2회/2명 이상 기준 | 완료 | 검증/테스트 검색어 저장 차단 + 기존 오염 row 정리 |
| 권한 요청 진입 | 검색 결과 즉시 팝업 대신 문서 화면 진입 | 완료 | 잠긴 문서 화면에서 CTA 제공 |
| 잠긴 문서 본문 | 서버가 잘라 내려준 상단 일부만 표시 | 완료 | 전체 원문을 클라이언트에 내려주지 않음 |
| 권한 요청 CTA | 문서 헤더 좌측에 배치 | 완료 | 본문 중앙 자물쇠는 클릭 CTA가 아닌 안내 affordance |
| 사이드카 잠금 | 기존 사이드카 섹션 재사용 + 접힌 잠금 상태 | 완료 | 새 placeholder UI 제거, 민감 섹션은 펼쳐지지 않음 |
| Search/Ask 차단 소스 요약 | 전체 차단 수와 사유를 응답/UI에 표시 | 완료 | 검색 화면과 어시스턴트 대화 모두 표시 |
| 권한 회귀 검증 | 요청 생성/승인/거절/grant 회수/소유권 이전 자동 검증 | 완료 | live HTTP access gate에 편입 |
| 검색 기록 DB migration | 검색 기록 테이블 정식 배포 산출물 | 완료 | runtime fallback과 별도 migration 추가 |
| Docker 런타임 | server/dms 재빌드 및 healthy 확인 | 완료 | server, dms healthy, DMS root 200 |

---

## 3. 이번 작업에서 구현/정리된 내용

### 3.1 AI 요약과 검색 결과

- 원문 열람 권한이 없는 문서라도 검색 결과에 포함된 경우 AI 요약은 표시되도록 정리했습니다.
- 서버 Docker 런타임에 AI provider 환경이 반영되지 않아 요약이 0건이던 문제를 환경 반영과 재빌드로 해결했습니다.
- 일반 OpenAI provider/package/compose 임의 변경은 롤백했고, 기존 Azure OpenAI runtime 설정을 유지했습니다.

### 3.2 검색 결과 redaction

- 권한 없는 검색 결과는 원문성 높은 발췌와 스니펫을 서버 응답 단계에서 제거합니다.
- unreadable 결과의 `excerpt`는 안전 문구로 대체하고, `snippets`는 빈 배열, `totalSnippetCount`는 0으로 고정합니다.
- AI 요약은 사용자 요구대로 유지합니다.
- 테스트로 unreadable 결과 redaction contract를 고정했습니다.

### 3.3 AI 검색 사이드카와 검색 기록

- AI 검색 사이드카의 불필요한 전체 제목을 제거했습니다.
- 검색 기록 저장소를 브라우저 저장소에서 DB 기준으로 전환했습니다.
- “내 자주 검색”, “인기 검색어”, “검색 기록”을 동시에 표시합니다.
- 인기 검색어는 다음 조건을 만족해야만 노출됩니다.
  - 검증/테스트 검색어 저장 차단
  - popular 집계에서도 검증/테스트 패턴 제외
  - 전체 검색 횟수 2회 이상
  - 서로 다른 사용자 2명 이상
- 현재 실제 popular가 비어 있을 수 있는데, 기준 충족 데이터가 없으면 정상입니다.

### 3.4 잠긴 문서 미리보기

- 권한 없는 문서를 클릭하면 즉시 권한 요청 팝업을 띄우지 않고 기존 문서 화면을 엽니다.
- 서버가 허용한 상단 일부 preview-only 미리보기만 표시합니다.
- 이미지, 첨부, 표 성격의 라인은 미리보기에서 제외하도록 필터링했습니다.
- 나머지 원문은 클라이언트로 내려주지 않습니다.
- 마크다운이 아닌 권한 없는 파일은 미리보기를 만들지 않고 기존처럼 차단합니다.
- 본문 하단은 실제 원문이 아닌 placeholder/faux text와 mask gradient로 잠김 상태를 표현합니다.

### 3.5 문서 헤더와 사이드카 UX

- 권한 요청 CTA는 본문 중앙이 아니라 문서 페이지 헤더 좌측에 배치했습니다.
- 본문 중앙 자물쇠/문구는 클릭 버튼이 아니라 잠긴 본문 안내로만 남겼습니다.
- 사이드카는 별도 잠금 카드/placeholder를 만들지 않고 기존 섹션 컴포넌트를 그대로 사용합니다.
- 잠긴 상태의 민감 섹션은 접힌 상태로 유지되고, 우측 접기/펼치기 아이콘 위치에 자물쇠가 표시됩니다.
- 잠긴 섹션 본문은 렌더링하지 않으며 펼쳐지지 않습니다.

### 3.6 차단 소스 요약과 권한 회귀 검증

- Search 응답은 unreadable 결과 수를 차단 소스 요약으로 함께 반환합니다.
- Ask 비스트리밍 응답과 스트리밍 이벤트도 같은 차단 소스 요약을 전달합니다.
- 검색 화면과 어시스턴트 대화는 “권한 때문에 제외된 문서 수”와 사유를 표시합니다.
- live access gate는 요청 생성, 승인, 거절, grant 반영, grant 회수, 소유권 이전/복귀를 검증합니다.
- 검색 기록 테이블은 배포 migration 산출물을 추가해 런타임 자동 생성 fallback에만 의존하지 않도록 했습니다.

---

## 4. 검증 결과

완료된 검증:

- 검색 redaction focused test: 통과
- 잠긴 문서 미리보기 서버 테스트: 통과
- 서버 빌드: 통과
- DMS 웹 빌드: 통과
- DMS 접근 권한 검증: 통과
- Codex preflight: 통과
- Docker server/dms 재빌드: 완료
- 서버 health: 정상
- DMS 웹 응답: 정상
- server/dms 컨테이너 상태: healthy
- GitLab workspace sync merge 후 서버/DMS 웹 빌드: 통과
- GitLab workspace sync merge 후 Codex preflight: 통과
- 브라우저 로그인 후 AI 검색 결과 클릭: 문서 탭 진입 확인
- 잠긴 문서 화면 표시: 확인
- 권한 요청 CTA → 권한 요청 다이얼로그: 확인
- 권한 없는 문서 열기 API 응답: 전체 원문 대신 locked preview 응답 확인
- Search/Ask 차단 소스 요약 focused test: 통과
- 권한 회귀 검증 스크립트 문법 검사: 통과
- 공용 타입 빌드: 통과
- 권한 워크플로 회귀를 포함한 DMS access live gate: 통과
- 검색 기록 DB 테이블 런타임 존재 확인: 통과
- Docker server/dms 재빌드와 HTTP 200 health 확인: 통과

최근 실행한 대표 게이트:

```bash
pnpm --filter @ssoo/types build
pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/path-and-search.helpers.spec.ts --runInBand
pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/file-crud.service.spec.ts --runInBand
pnpm run build:server
pnpm run build:web-dms
pnpm run verify:access-dms:raw
pnpm run codex:preflight
pnpm --filter server build
pnpm --filter web-dms build
DOCKER_CONFIG=/tmp/ssoo-docker-config docker compose up -d --build server dms
curl -I -fsS http://localhost:3001/
```

---

## 5. 정량 진척률

DMS 단독 런칭 준비 관점의 현황:

| 묶음 | 진척률 | 판단 |
|------|--------|------|
| 검색 결과 AI 요약 | 100% | 완료 |
| AI 검색 사이드카 정리 | 100% | 완료 |
| DB 기반 검색 기록 | 100% | 완료 |
| 인기 검색어 런칭 위생 | 100% | 완료 |
| 검색 결과 원문 redaction | 100% | 완료 |
| 권한 요청 UX 기본 흐름 | 98% | 핵심 흐름 완료. 전체 회귀 자동화는 후속 |
| 잠긴 문서 미리보기 | 100% | 서버 preview-only + 기존 문서 화면 UX 완료 |
| 사이드카 잠금 표현 | 100% | 기존 섹션 재사용 방식으로 완료 |
| Search/Ask 차단 소스 요약 | 100% | API/UI 반영 완료 |
| 권한 회귀 자동화 | 100% | live HTTP gate 편입 완료 |
| 검색 기록 DB migration | 100% | 배포 migration 산출물 추가 |
| 런타임 반영 | 100% | Docker 반영 및 health 완료 |
| 런칭 보안 잔여 | 96% | 검색/권한 핵심 잔여는 닫힘. 최종 스모크만 남음 |

종합: 약 98% 완료.

단, “즉시 런칭” 선언 전에는 브라우저 스모크와 운영 seed/계정/document root freeze 확인을 완료해야 합니다.

---

## 6. 바로 이어서 할 다음 작업

### 1순위: 브라우저 런칭 스모크

목표:

- 로그인, AI 검색, 잠긴 문서 진입, 권한 요청 CTA, 승인/거절/회수 경로를 실제 브라우저 런타임에서 확인합니다.

참고로 이미 통과한 서버/런타임 게이트:

```bash
pnpm run build:server
pnpm run build:web-dms
pnpm run verify:access-dms:raw
pnpm run codex:dms-guard
pnpm run codex:preflight
DOCKER_CONFIG=/tmp/ssoo-docker-config docker compose up -d --build server dms
```

### 2순위: 운영 freeze

목표:

- 런칭 seed/계정/문서 root 상태를 동결하고, 운영자가 볼 잔여 리스크를 문서화합니다.

---

## 7. 재진입 절차

1. 저장소 상태 확인

```bash
cd /home/a0122024330/src/ssoo
git status --short --branch
git log --oneline --decorate -8
```

2. 이 문서와 관련 문서 확인

```bash
sed -n '1,260p' docs/dms/planning/2026-05-20-launch-closeout-handoff.md
sed -n '1,140p' docs/dms/planning/backlog.md
sed -n '1,90p' docs/dms/planning/roadmap.md
```

3. 먼저 할 일

- 브라우저 런칭 스모크
- 운영 freeze 확인
- 원격 push 상태 확인: GitHub는 `main`, GitLab workspace는 `development` 기준

---

## 8. 주의사항

- 전체 원문을 클라이언트로 내려주고 CSS blur로 숨기는 방식은 금지입니다.
- 권한 없는 문서의 문서 화면은 반드시 서버 preview-only 응답을 기준으로 표시해야 합니다.
- 검색 결과 카드도 권한 없는 결과에 원문 기반 발췌/스니펫을 노출하면 안 됩니다.
- 잠긴 사이드카 섹션은 새 UI가 아니라 기존 섹션 컴포넌트의 잠김 상태로 표현해야 합니다.
- 검증/테스트 검색어는 인기 검색어/검색 기록에 저장하지 않는 현재 정책을 유지해야 합니다.
- PMS/CMS 범위로 확장하지 말고 DMS 단독 런칭 기준으로 이어가야 합니다.
- Docker 반영 없이 “완료”로 닫지 않습니다.
- Search/Ask 차단 소스 요약과 권한 회귀 자동화는 완료 항목이므로 다시 백로그로 되돌리지 않습니다. 실패가 재현되면 regression bug로 별도 등록합니다.

---

## Changelog

- 2026-05-27: unreadable 검색 결과 redaction, 기존 문서 화면 기반 locked preview, 헤더 좌측 권한 요청 CTA, 기존 사이드카 섹션 재사용 잠금 표현, Docker 반영 상태를 런칭 핸드오프 기준으로 현행화했습니다.
- 2026-05-27: Search/Ask 차단 소스 수/사유 요약, 권한 워크플로 live HTTP 회귀 검증, DB 검색 기록 migration 산출물을 완료 범위에 추가했습니다.
- 2026-05-27: GitLab workspace `development`의 추가 하드닝 변경분을 로컬 작업과 병합하고, 병합 후 서버/DMS 웹 빌드와 Codex preflight 통과 상태를 문서화했습니다.
- 2026-05-20: DMS AI 검색 기록/인기 검색어, 잠긴 문서 미리보기, 권한 요청 진입점, 남은 검색 결과 노출 정책을 런칭 핸드오프 기준으로 정리했습니다.
