# DMS 런칭 준비 핸드오프 — 협업/권한/알림/댓글 closeout

> 작성: 2026-05-29 17:50 KST
> 범위: DMS 단독 런칭 준비. PMS/CMS 통합 수용성은 이 문서 범위가 아닙니다.

---

## 1. 현재 결론

이번 슬라이스는 DMS 런칭 직전 사용자 검증에서 드러난 문서 사이드카, 권한 요청/승인, 알림, 댓글, AI 요약 작성, 링크 라우팅, 협업 soft lock 흐름을 정리한 closeout 입니다.

현재 완료로 볼 수 있는 범위:

- 문서 사이드카 상태/정보/공개 범위/권한/댓글 섹션 정리
- 전역 tooltip 을 browser title 속성 기준으로 정렬
- 알림 패널의 카운트/읽음/안읽음/전체 읽음/문서 대상 자동 읽음 처리
- 권한 섹션에서 소유자의 요청 처리와 grant 관리, 열람자의 내 권한 표시와 쓰기 권한 요청
- 권한 요청/승인/회수 이벤트의 SSE 기반 실시간 반영
- 권한 회수 시 열람 중 문서 즉시 차단, 권한 승인 시 열린 문서 재조회
- AI 요약 새 문서 작성 시 원본 파일 첨부 유지와 내부/외부 링크 라우팅 보정
- 댓글을 문서 metadata 저장 흐름에서 분리해 DB relation 기반 API로 전환
- 댓글 작성/삭제/복원 권한, 문서 소유자/댓글 작성자 알림, 열린 문서 댓글 실시간 갱신
- 댓글 삭제 확인 다이얼로그와 삭제 이력 표시/복원 권한 정리
- 협업 soft lock heartbeat 반복 호출 제거, WebSocket 문서 방 이벤트 기반 반영
- 편집 진입 시 soft lock 서버 검증, 다른 사용자 편집 중일 때 편집 차단
- 잠금 해제 요청/승인/거절 프로세스 도입
- 해제 요청 중복 생성 방지와 새로고침 후 `요청 중`/처리 다이얼로그 복원
- Docker server/dms 재빌드와 health 확인

런칭 전 남은 핵심 리스크:

- 브라우저 기준 연속 스모크가 아직 최종 freeze 산출물로 닫히지 않았습니다.
- 운영 seed, 계정, 문서 root, GitLab/GitHub 배포 브랜치 상태는 최종 런칭 전 한 번 더 동결 확인이 필요합니다.
- 저장소 어댑터와 수집 채널의 고도화 항목은 런칭 핵심 협업/권한 게이트 밖의 후속 P1/P2로 남아 있습니다.

---

## 2. 기능/화면별 현황

| 영역 | 현재 상태 | 런칭 판단 | 비고 |
|------|-----------|-----------|------|
| 문서 사이드카 상태 | 상태/정보/권한/댓글 중심으로 재정렬 | 완료 | 공개 범위는 정보 하위로 통합 |
| 권한 섹션 | 소유자 요청 처리/권한 관리, 열람자 내 권한/쓰기 요청 제공 | 완료 | 권한자 수는 일반 카운트, 처리 요청 수는 알림 뱃지 |
| 권한 실시간 반영 | 승인/회수/요청 생성 SSE로 열린 문서 갱신 | 완료 | 회수 시 즉시 블락, 승인 시 재조회 |
| 알림 패널 | unread count 정합성, 읽음/안읽음/전체 읽음 처리 | 완료 | 문서 대상 알림은 대상 문서 접근 시 자동 읽음 처리 |
| 팝업 배경 dim | 차단형 팝업/알림/AI 챗 패널 톤 공용화 | 완료 | toast/dropdown/tooltip 등 비차단 UI는 제외 |
| AI 요약 새 문서 | 원본 파일 첨부 유지, 이미지/텍스트 컨텍스트 유지 | 완료 | 저장 시 참조 첨부 업로드 흐름 복구 |
| 링크 라우팅 | 내부 문서 경로와 외부 URL 판별 보정 | 완료 | 외부 도메인은 브라우저 새 탭 |
| 댓글 | DB relation 기반 댓글 API로 분리 | 완료 | metadata 저장 diff 대상에서 제외 |
| 댓글 실시간 | 댓글 작성/삭제/복원 알림과 열린 문서 댓글 재조회 | 완료 | 문서 본문/편집 상태는 흔들지 않음 |
| 댓글 삭제 | 공용 확인 다이얼로그, tombstone, 삭제 이력 표시 | 완료 | 복원은 삭제자 본인만 |
| 협업 soft lock | WebSocket 문서 방 이벤트 기반 상태 반영 | 완료 | 5초 heartbeat polling 제거 |
| 편집 진입 | 서버 soft lock 획득 성공 시에만 편집 진입 | 완료 | 잠금 중 문서는 헤더 `해제 요청` |
| 잠금 해제 요청 | 보유자 승인/거절 기반으로만 lock 이동 | 완료 | 요청 중복 방지와 새로고침 복원 포함 |
| 원격 동기화 표시 | 상태 섹션의 원격 동기화 아이콘 복구 | 완료 | publish 상태와 lock 상태를 함께 표시 |

---

## 3. 검증 결과

완료된 검증:

- DMS 웹 빌드: 통과
- 서버 빌드: 통과
- 협업 서비스 단위 테스트: 20개 통과
- DMS guard: 통과
- Codex preflight: 통과
- Docker server/dms 재빌드: 완료
- DMS 웹 응답: HTTP 200
- 서버 health: HTTP 200
- server/dms 컨테이너 상태: healthy

최근 대표 명령:

```bash
pnpm --filter web-dms build
pnpm --filter server build
pnpm --filter server test -- collaboration.service.spec.ts
pnpm run codex:dms-guard
pnpm run codex:preflight
docker compose --profile app-stack up -d --build server dms
curl -I --max-time 10 http://127.0.0.1:3001
curl -I --max-time 10 http://127.0.0.1:4000/api/health
```

사용자 확인 완료:

- 권한 요청자 실시간 알림 수신
- 권한 승인 후 문서 재열람 가능
- 일반 사용자 권한 섹션 표시
- 댓글 실시간 반영
- 협업 lock 상태 실시간 반영

---

## 4. 정량 진척률

| 묶음 | 진척률 | 판단 |
|------|--------|------|
| 사이드카 정보 구조 | 100% | 완료 |
| 권한 요청/승인/회수 UX | 100% | 완료 |
| 권한 실시간 갱신 | 100% | 완료 |
| 알림 패널/읽음 상태 | 100% | 완료 |
| 댓글 DB 분리 | 100% | 완료 |
| 댓글 실시간/삭제 이력 | 100% | 완료 |
| AI 요약 첨부/링크 복구 | 100% | 완료 |
| 협업 soft lock | 100% | 완료 |
| 잠금 해제 요청 lifecycle | 100% | 완료 |
| Docker 반영 | 100% | 완료 |
| 브라우저 런칭 스모크 freeze | 80% | 개별 사용자 검증은 진행됨. 연속 시나리오 문서화 필요 |

종합: 약 97% 완료.

---

## 5. 바로 이어서 할 다음 작업

### 1순위: 최종 브라우저 런칭 스모크

목표:

- 두 계정 이상으로 로그인
- 문서 열람/편집 진입
- soft lock 발생
- 해제 요청 생성
- 보유자 승인/거절
- 요청자 화면/알림/버튼 상태 반영
- 댓글 작성/삭제/복원
- 권한 요청/쓰기 권한 요청/회수
- AI 요약 새 문서 저장과 첨부 확인
- 외부 URL/내부 문서 링크 라우팅 확인

### 2순위: 운영 freeze

목표:

- 런칭 계정과 권한 seed 확인
- DMS markdown root와 storage root 확인
- GitHub `main`, GitLab `development` 원격 상태 확인
- 최종 push 전 `codex:push-guard`와 Docker health 재확인

---

## 6. 재진입 절차

```bash
cd /home/a0122024330/src/ssoo
git status --short --branch
git log --oneline --decorate -8
sed -n '1,240p' docs/dms/planning/2026-05-29-launch-collaboration-handoff.md
sed -n '1,120p' docs/dms/planning/roadmap.md
sed -n '1,150p' docs/dms/planning/backlog.md
```

원격 반영 전 절차:

```bash
pnpm run codex:preflight
pnpm run codex:dms-guard
pnpm run codex:push-guard
pnpm run codex:workspace-sync-from-gitlab
```

GitLab `development`에 새 커밋이 있으면 로컬에서 먼저 병합하고 검증을 다시 통과시킨 뒤 GitHub/GitLab 양쪽에 push 합니다. GitLab history 위에 force-push 하지 않습니다.

---

## 7. 주의사항

- 권한/알림/댓글처럼 특정 문서를 대상으로 하는 이벤트는 SSE 도메인 이벤트를 우선 사용합니다.
- 문서 방 구독, 파일 변경, publish 상태, soft lock 처럼 문서 화면과 상호작용하는 실시간 협업 상태는 WebSocket 경로를 사용합니다.
- soft lock 은 요청자 임의 탈취가 아니라 보유자 승인/거절 기반입니다.
- 해제 요청은 서버 pending state 를 기준으로 판단해야 하며, 클라이언트 메모리만 신뢰하면 안 됩니다.
- 댓글은 문서 저장 diff 대상이 아니며, 문서 metadata 배열 저장으로 되돌리면 안 됩니다.
- 삭제 계열 액션은 공용 확인 다이얼로그를 유지합니다.
- Docker 반영 없이 “완료”로 닫지 않습니다.

---

## Changelog

- 2026-05-29: 협업/권한/알림/댓글 closeout 핸드오프를 작성했습니다.
