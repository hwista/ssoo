# DMS 런칭 협업/실시간 반영 핸드오프

> 작성: 2026-06-02 KST
> 범위: DMS 런칭 직전 문서 권한, 동시 편집, 잠금 해제 요청, 저장 반영, 알림 타게팅, 검증 문서 publish 격리

---

## 1. 현재 결론

DMS 런칭 전 협업/권한/알림 핵심 리스크는 기능 기준으로 대부분 닫혔습니다.

완료된 핵심 범위:

- 문서 소유자와 편집 권한자 모두 동일한 soft lock 규칙 적용
- 누구든 편집 모드에 들어가면 다른 쓰기 가능 사용자에게 즉시 편집 차단 상태 전파
- 편집 잠금 해제 요청/승인/거절 lifecycle 안정화
- 잠금 보유자가 미저장 초안을 가진 상태에서 승인하면 먼저 저장 후 잠금 이전
- 요청자는 잠금을 넘겨받기 전에 최신 본문을 다시 읽어 기존 작성자의 변경사항 보존
- 같은 사용자라도 다른 탭/브라우저는 별도 편집 세션으로 취급
- 저장/메타데이터 변경은 현재 lock 세션만 서버에서 통과
- stale lock/presence 만료 기준을 실제 lock renew 기준으로 정리해 유령 편집 상태 제거
- 비소유 쓰기 권한자는 본문 저장 가능, 메타데이터 변경/삭제는 소유자 또는 관리 권한자로 제한
- 다른 사용자가 현재 활성 문서를 저장하면 안전한 경우 즉시 최신 본문으로 화면 갱신
- 비활성으로 열려만 있는 문서에는 “이 문서를 수정했습니다” 토스트를 띄우지 않음
- 검증용 문서 prefix 는 Git publish 실패 알림 대상에서 제외
- 첫 접속 파일 트리는 초기 동기화 전 빈 목록을 오표시하지 않도록 안정화

남은 런칭 전 확인:

- AI 요약 새 문서 저장과 첨부 유지 확인은 외부 모델/API 설정이 필요해 별도 환경에서 최종 확인해야 합니다.
- 운영 seed, 계정, 문서 root, GitHub `main`, GitLab `development` 원격 상태는 최종 런칭 직전 동결 확인이 필요합니다.

---

## 2. 화면/기능별 상태

| 영역 | 현재 상태 | 런칭 판단 |
|------|-----------|-----------|
| 편집 진입 | soft lock 획득 성공 후에만 편집 모드 진입 | 완료 |
| 편집 차단 | 소유자/편집 권한자 구분 없이 다른 쓰기 가능 사용자 차단 | 완료 |
| 잠금 해제 요청 | 요청 중복 방지, 새로고침 복원, 승인/거절 알림 연결 | 완료 |
| 해제 요청 수신 화면 | 요청 수신 시 client-side error 없이 처리 다이얼로그 유지 | 완료 |
| 승인 전 저장 | 미저장 초안이 있으면 첫 다이얼로그부터 저장 후 허용 | 완료 |
| 잠금 이전 | 요청자 편집 전 최신 본문 재로드 | 완료 |
| 세션 fencing | 사용자+세션 기준 lock 소유 판정, 현재 세션만 저장 가능 | 완료 |
| stale lock | WebSocket 접속 여부가 아니라 lock renew 기준으로 만료 | 완료 |
| 비소유 편집자 저장 | 본문 저장 가능, 메타데이터 플러시 생략 | 완료 |
| 메타데이터 관리 | 소유자/관리 가능 권한자만 변경/삭제 가능 | 완료 |
| 활성 문서 저장 반영 | 다른 사용자 저장 시 안전한 경우 즉시 본문 재로드 | 완료 |
| 비활성 문서 알림 | 열려만 있는 비활성 문서는 수정 토스트 억제 | 완료 |
| 파일 트리 초기화 | 첫 접속/재부팅 후 초기 동기화 전 빈 목록 오표시 방지 | 완료 |
| 검증 문서 publish | local-only prefix 제외, 사라진 미추적 경로 no-op 처리 | 완료 |

---

## 3. 검증 기준선

통과한 검증:

- `pnpm run codex:preflight`
- `pnpm run codex:verify-sync`
- `pnpm run docs:verify`
- `pnpm run codex:dms-guard`
- `docker compose up -d --build server dms`
- DMS HTTP 200
- 서버 health HTTP 200
- server/dms 컨테이너 healthy

집중 브라우저 회귀:

- 비소유 쓰기 권한자의 본문 저장은 메타데이터 403 없이 성공
- 다른 사용자 저장 시 현재 활성 문서는 최신 본문으로 자동 반영
- 비활성으로 열려만 있는 문서는 수정 토스트 억제

서버 회귀:

- collaboration soft lock 서비스 테스트
- 현재 lock 세션 저장 fencing
- stale lock/presence 만료
- 만료된 해제 요청의 기존 보유자 lock 유지
- Git stage pathspec/no-op 처리
- 첫 접속 파일 트리 control-plane 안정화

---

## 4. 재진입 절차

```bash
cd /home/a0122024330/src/ssoo
git status --short --branch
sed -n '1,180p' docs/dms/planning/2026-06-02-launch-collaboration-realtime-handoff.md
sed -n '1,90p' docs/dms/planning/roadmap.md
sed -n '1,60p' docs/dms/planning/backlog.md
```

작업 재개 전 기본 검증:

```bash
pnpm run codex:preflight
pnpm run codex:dms-guard
```

원격 반영 표준:

```bash
pnpm run codex:workspace-sync-from-gitlab
pnpm run codex:push-guard
pnpm run codex:workspace-publish
```

GitLab `development`가 앞서 있으면 먼저 로컬에 병합하고, 병합 후 검증을 다시 실행한 뒤 GitHub/GitLab 양쪽에 반영합니다. force push는 사용하지 않습니다.

---

## 5. 즉시 다음 작업

1. AI 요약 새 문서 저장/첨부 확인
2. 운영 seed와 런칭 계정 권한 freeze
3. 문서 root와 storage root freeze
4. GitHub `main`, GitLab `development` 원격 상태 확인
5. 최종 전체 브라우저 스모크 또는 런칭 체크리스트 서명

---

## 6. 주의사항

- soft lock 은 사용자 단위가 아니라 사용자+편집 세션 단위입니다.
- 편집 가능 버튼은 항상 서버 lock 상태를 기준으로 열려야 합니다.
- 잠금 해제 요청 만료는 요청 상태만 만료시킬 뿐, 보유자 lock 을 임의 해제하면 안 됩니다.
- 비소유 쓰기 권한자는 본문만 저장할 수 있고 메타데이터 projection 을 만들면 안 됩니다.
- 다른 사용자 저장 이벤트는 활성 문서와 비활성 열린 문서를 구분해 처리해야 합니다.
- 로컬 편집/미저장 상태가 있으면 외부 저장 이벤트로 본문을 자동 덮어쓰지 않습니다.
- 검증용 markdown 문서는 운영 Git publish 실패 알림으로 승격되면 안 됩니다.
- Docker 재빌드와 health 확인 없이 런칭 준비 작업을 완료로 닫지 않습니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-02 | 런칭 직전 협업/권한/알림/저장 반영 기준선, 검증 결과, 재진입 절차, 남은 freeze 항목을 별도 핸드오프 문서로 고정 |
