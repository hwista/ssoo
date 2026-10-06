# 온보딩·공유 권한 작업 재개 지점

> 2026-10-06 · 온보딩 로컬 Docker 배포·DB 이전·실사용 인계 완료

## 현재 결론

온보딩/승인·앱별 조직 경계·DMS/SNS 공유 및 알림 재검사의 구현을 실제 일회용 DB로 검증했다. 19 migrations/90 triggers/schema drift 0과 populated restore, CRM/PMS 조직 경계·DMS 업무 문서·SNS 공유 시나리오가 통과했다. 두 계정 브라우저와 실제 SSE/WebSocket, 알림 읽음 이력, 회수·만료 및 AI 원본 재검사를 확인했다. 발견한 DMS 신청 상태·요청 창 갱신과 SNS 중복 key를 수정했다. 상세 범위·한계는 [온보딩 구현 기록의 복구 후 검증](2026-10-01-onboarding-implementation.md#2026-10-02-복구-후-실제-db공유-통합-검증)에 있다.

복구 세션이 환경 정상화를 완료한 뒤 “계속 진행하자” 요청으로 재개했다. 2026-10-02에는 온보딩 코드·migration을 기존 Docker/업무 DB에 배포하지 않았다. 이후 승인된 클렌징과 2026-10-06 로컬 Docker 배포를 아래 기록대로 완료했다. 공유 작업트리의 CRM 업무 기능과 배포 파일은 다른 세션의 작업이며 계속 보존한다. 아래 중단 당시 절차와 보관본은 이력으로 유지한다.

## 남은 작업량과 완료 기준

| 묶음 | 남은 내용 | 완료 기준 |
|---|---|---|
| 1. 실제 DB 검증 | 완료 | 19 migrations/90 triggers/drift 0, populated restore와 실제 공유 fixture 통과 |
| 2. 실제 앱 인수 | 실제 승인/열람/회수·만료, 알림/SSE/WebSocket·AI 원본 검사 확인 | 기존 DMS 제목·요약·인용 발견 정책은 유지. 외부 AI 생성과 이미 읽은 본문의 즉시 원격 삭제는 보장 범위에서 제외 |
| 3. 미완성 흐름 정리 및 최종 회귀 | 완료: 일반 셀프 가입 별도 범위 명시, 과거 자료 전환 제외, 발견 결함 수정, 최종 플랫폼 검사 통과 | 서버+5앱 production build, 98 suites/742 tests, 최종 preflight·문서·변경 범위 lint 통과. 증거: `output/playwright/onboarding-resume-20261002/final-checks.json` |

업무 오류 조합 전수를 늘리는 작업이 아니라 오류 발생·처리가 공용 템플릿으로 연결되는지 검사한다. 첫 preflight에서 요청 창의 직접 alert를 지적했으며 현재 소스는 공용 `SsooErrorNotice`를 사용하고 후속 preflight를 통과했다.

미완성 흐름을 숨기지 않는다:
- **일반 셀프 회원가입**: 현재 `AuthPolicyService`는 셀프 가입을 지원하지 않으며 Microsoft 가입 신청/관리자 생성을 안내한다. 이번 단계는 ID 생성 이후의 공통 온보딩을 연결했다. 일반 셀프 가입 진입 자체의 출시까지 포함할 경우 별도 구현·인수가 필요하다. 기존 설계에서 말한 장래 셀프 가입과 이번 온보딩 완료를 구분한다.
- **과거 자료 전환 제외**: 사용자는 과거 업무 자료가 사용자 작성·테스트 데이터가 아니라 에이전트 생성 자료라고 정정하고 클렌징을 명시 승인했다. 과거 자료를 보존하거나 신규 계약으로 이관할 요구는 없다. 이 전환을 온보딩 미완성 과제에 포함했던 해석을 철회한다. 신규 자료는 승인된 업무 조직으로 생성한다.

## 2026-10-02 승인된 과거 자료 클렌징

- 대상은 현재 로컬 Docker PostgreSQL의 `localhost:5432/ssoo_dev`다. CRM 영업기회 9건·계약 9건·고객 11건·사업계획 1건, PMS 프로젝트 6건은 seed 출처를 확인했다. 연결된 상세·청구·원가·업무 이력, PMS 알림 1,966건, CRM/PMS AI 검색 객체 18건과 관련 색인도 정리했다.
- CRM에서 생성했던 DMS 문서 3건은 실제 파일이 이미 없었다. 해당 문서의 DB 원장·이력·공유 기록만 제거했다. 다른 DMS 문서 159건, SNS 게시물, PMS 자산·고객 기준정보와 템플릿은 이번 업무 자료 클렌징 범위 밖으로 보존했다.
- 삭제 전 대상 행은 이력·색인을 포함해 19,477건이었다. 삭제 trigger가 만든 이력까지 같은 transaction에서 정리했으며 실제 DELETE 합계는 22,617건이다. 참조 순서대로 DELETE했고 스키마·시퀀스 초기화나 migration 적용은 하지 않았다.
- 시험 실행 후 rollback, 실제 실행 직전 DB fingerprint 일치, 전체 `pg_dump` 백업 및 archive 목록 검사, 단일 transaction 적용, 새 연결에서 대상 잔여 0건을 확인했다. 백업의 실제 복원 리허설은 이번 클렌징에서 수행하지 않았다. 보존 대상 63개 테이블 및 선택 대상 밖 행의 내용 hash가 실행 전후 동일했다. 계정 11개·조직 13개·역할 4개·권한 54개·사업연도 3개·DMS 템플릿 74개가 유지됐고 `/api/health`가 정상 응답했다.
- 증거·실행 스크립트·비공개 로컬 백업은 Git 제외 경로 `output/checkpoints/onboarding-cleansing-20261002/`에 있다. `plan.json`, `dry-run.json`, `apply.json`, `postcheck.json`, `backup.json`, `before.dump`를 사용한다. 백업은 자격정보를 포함할 수 있으므로 공유/커밋하지 않는다.
- 일반 배포의 기존 DB seed 정책은 `upgrade`로 유지한다. 검증용 demo seed 파일은 보존하지만 이 DB에 `apply_all_seeds.sql`을 다시 적용하면 데모 자료가 돌아오므로 실행하지 않는다. 온보딩 코드 배포 및 다른 세션의 격리 DB·컨테이너 정리는 이 작업에 포함하지 않았다.

## 로컬 Docker 배포 완료 — 2026-10-06

사용자가 복제 DB 검증 후 로컬 Docker 배포와 직접 테스트 인계를 승인했다. 현재 원본 `ssoo_dev`는 migration 이력이 없는 pre-baseline DB이며, legacy AI 컬럼과 중복 제약이 섞여 있어 자동 baseline resolve나 생성된 schema diff SQL을 적용하지 않았다.

대신 클렌징 후 백업을 복원한 원본 복제본과, 실제 launch migration 14개로 초기화한 새 후보 DB를 사용했다. 기존 220개 테이블의 정본 컬럼을 대상 타입으로 변환해 행 수·내용 hash를 대조하고 외래키 154개와 시퀀스 113개를 검증했다. 기존 AI 구조에서 정본에 없는 컬럼의 원본 행은 후보 DB의 `migration_archive.legacy_rows`에도 보존했다. 기존 DB와 전체 백업도 유지한다. 이후 남은 온보딩 migration을 실제 실행해 기존 계정 11개에 참여 상태 11건·서비스 이용권 44건 및 같은 수의 이전 이력을 만들었다. 최종 runtime verifier는 19 migrations·90 triggers·schema drift 0을 통과했다.

2026-10-06 재개 시 현재 원본의 221개 application 테이블이 복제 당시와 동일함을 재확인했다. 배포 소스 fingerprint는 `a3f472f229958aba87363fd57e01929dae62b1d336300466920a9b63ccfe450d`이며 별도 사본에서 플랫폼 검사를 통과했다(서버+5앱 production build, 98 suites/743 tests). `output/checkpoints/onboarding-local-deploy-20261002/`에 비공개 백업·연결 설정·이관 스크립트·`transfer.json`·`candidate-runtime.log`·`live-source-recheck.json`·`source-manifest.json`을 보존한다. `ssoo-onboarding-rehearsal-20261006` Docker 프로젝트에는 후보 DB dump와 문서/Git/ingest/storage 복사본을 복원했다. 격리 DB 초기화 2회와 전체 runtime 24검사, 신규 계정 온보딩 API 15검사, 두 브라우저의 실제 조직·서비스 신청/승인 9검사를 통과한 뒤 로컬 배포를 교체했다.


- 배포 식별자는 `onboarding-20261006-a3f472f22995`이고 API/웹의 source identity는 `local-a3f472f229958aba`다. 혼합 작업트리의 실제 소스를 고정한 사본이며 Git 커밋으로 오인하지 않는다. 빌드 이후 추가된 공통코드·Admin 코드 관리·CRM 원가 관련 소스 6개는 포함하지 않았다. 경로와 비교 결과는 `source-recheck.json`에 있으며 해당 변경은 현재 작업트리에 보존했다.
- 기존 앱을 중지한 뒤 원본 221개 테이블의 hash 일치를 다시 확인하고 전체 DB와 DMS runtime 파일을 백업했다. 원본 DB는 `ssoo_before_onboarding_20261006`으로 보관하고 검증된 후보 DB를 `ssoo_dev`로 전환했다. 테스트 데이터는 별도 Docker 복제본에서만 만들었으며 배포 DB에는 들어가지 않았다.
- 최종 로컬 DB는 19 migrations·90 triggers·schema drift 0이다. 사용자 11개·조직 13개·역할 4개·권한 54개·DMS 문서 159개·템플릿 74개를 확인했고 기존 로그인 ID·비밀번호 hash·계정 상태는 원본과 같다. 참여 상태 11건·서비스 이용권 44건이 있으며 클렌징한 CRM 영업기회/계약/고객/계획 및 PMS 프로젝트는 0건이다. demo seed를 재실행하지 않았다.
- 최종 로컬 서버+5앱 runtime 24검사와 실제 localhost 브라우저 6검사가 통과했다. 브라우저는 기존 관리자 세션 복원, 5앱 온보딩/승인함, CRM 업무 화면을 확인했다. 격리 브라우저의 API 주소만 실제 복제 서버로 연결했으며 응답을 모의하지 않았다. 최종 localhost 브라우저는 주소 보정 없이 검증했다. 기존 계정의 비밀번호를 변경하지 않았고 신규 계정의 실제 비밀번호 로그인은 격리 환경에서 확인했다.
- 로컬 DMS 역할은 `dev`를 유지한다. `.env`의 DB 초기화는 `strict`/`upgrade`로 고정하고 7개 검증 이미지를 로컬 `latest`로 연결했다. 이전 이미지도 `before-onboarding-20261006` 태그와 `compose.rollback.json`으로 보관했다. 원격 push·외부 배포는 하지 않았다.
- `before-cutover.dump`, `before-cutover-runtime/`, `previous-images.json`, `compose.live.json`, `compose.rollback.json`, `release.json`, `cutover.json`, `live-smoke.json`, `live-data-checks.json`, `live-browser-checks.json`, `cleanup.json`이 근거다. 백업·환경 설정·검증용 자격정보는 Git 제외 비공개 경로에만 둔다. 복구가 필요하면 사용자 테스트 이후 추가된 데이터를 먼저 백업하고 원본 DB/파일/이미지를 함께 복원한다.
- 이번 작업 소유의 격리 Docker 프로젝트·볼륨 및 임시 DB 3개를 정리했다. 원본 보관 DB와 백업은 유지하고 다른 프로젝트 컨테이너 ID가 바뀌지 않았음을 확인했다. 검증용 관리자 세션은 폐기했다.

실사용 테스트 진입:

1. Admin `http://localhost:3000`에서 기존 관리자 계정으로 신규 계정을 생성한다. 일반 셀프 회원가입은 별도 범위다.
2. 신규 계정으로 CRM `http://localhost:3001` 등에 로그인하여 조직 소속을 신청한다.
3. 관리자는 `http://localhost:3000/?onboarding=1`의 담당 신청 승인함에서 소속 신청을 승인한다.
4. 신규 계정이 사용할 서비스를 신청하고 관리자가 해당 이용권을 승인한다. 상태를 새로고침하면 승인된 앱으로 진입할 수 있다.
5. 승인된 업무 조직으로 CRM/PMS 업무를 생성한다. PMS는 `http://localhost:3002`, DMS는 `http://localhost:3003`, SNS는 `http://localhost:3004`다.

## 확정된 설계와 유지 조건

- 관리자 생성/가입 승인 후 공통 온보딩에서 조직 소속·신규 조직 생성·서비스 이용을 각각 신청하고 권한자가 승인한다. ID 생성만으로 업무 서비스 사용 권한을 부여하지 않는다.
- Admin은 플랫폼 관리자 권한이다. PMS/CRM은 승인된 업무 조직 문맥으로 업무를 처리한다.
- DMS/SNS의 소유자는 개인이며 개인/조직/전체 공개를 사용한다. 업무에서 발생한 문서는 개인 소유자를 유지하고 출처 업무 조직으로 공개한다.
- 플랫폼은 그룹사 등을 포함할 수 있는 도입 조직의 울타리다. `전체`를 익명 오픈 인터넷 공개로 해석하지 않는다. 개인은 사용자만 열람한다는 범위이며 회사 밖 독립 개인 데이터라는 뜻이 아니다.
- 개별 공유는 기존 공개 범위에 승인된 사용자 권한을 추가한다. SNS followers와 기존 DMS legacy-open/명시적 migration 호환은 임의 삭제하지 않는다.
- 원문 권한 회수 후 알림에는 원문 정보 없이 상태와 읽음 이력을 남긴다. 오류·재시도·수동 복구 동선을 없애지 않는다.

## 보존 위치와 Git 기준

- 작업 디렉터리: `/home/a0122024330/src/ssoo`
- 재개 진입: 이 문서 → 루트 `HANDOFF.md` 온보딩 섹션 → 구현 대장.
- 체크포인트: `output/checkpoints/onboarding-20261002-wsl-resume/`
- `manifest.json`: 캡처 시각, branch/HEAD, 변경 파일 경로·SHA-256, 제외/삭제 경로, 보관본 해시.
- `working-tree-changes.tar.gz`: 변경된 추적 파일과 미추적 파일의 현재 내용. **다른 세션의 변경도 섞인 공유 작업트리 보존본**이며 이 세션만의 커밋이나 병합 단위가 아니다. `.git`, 의존성, 빌드 캐시, 환경 비밀 파일, DB 데이터는 포함하지 않는다.
- `git-status.txt`, `deleted-paths.txt`: 당시 변경/삭제 현황. 인덱스·브랜치·커밋은 변경하지 않았다.
- `logs/`: `/tmp`의 최근 알림/공유 검증 로그를 비밀값 패턴 마스킹 후 보존한다. 비밀 연결 URL이 든 `/tmp/ssoo-onboarding-fixture.json`은 복사하지 않는다.
- 브라우저 증거는 기존 `output/playwright/notification-scope-20261002/`와 `output/playwright/onboarding-20261001/`에 있다. 모의 API harness 재생성 스크립트도 체크포인트에 보존한다.
- 이 보관본도 같은 WSL 파일시스템 안에 있다. 정상 재시작을 위한 재개 자료이며 WSL 배포판 삭제/디스크 손실에 대비한 외부 백업은 아니다. 복구 세션이 배포판 재생성 등을 하게 되면 먼저 별도 저장소로 보존해야 한다.

## 정상화 이후 재개 순서

1. 복구 세션의 정상화 완료를 확인한다. 이 문서와 HEAD/manifest를 읽고 현재 `git status`를 비교한다. 다른 세션의 이후 변경이 있을 수 있으므로 보관본을 현재 트리에 통째로 덮어쓰거나 `git reset/clean/stash`하지 않는다. 파일 소실이 있을 때만 보관본을 별도 디렉터리에 풀어 필요한 차이를 검토한다.
2. AGENTS 참조 순서와 `ssoo-doc-aware-dev`를 적용하고 `pnpm run codex:preflight`를 실행한다. 서버·database/types의 현재 빌드를 준비한다. Docker/DB 상태 확인 및 대상 연결은 복구 세션 결과를 이용하고 서비스 전체 재시작을 중복 실행하지 않는다.
3. 로컬 테스트 DB 연결의 `.env`를 확인한 뒤 아래 일회용 DB 검증을 순서대로 실행한다. 비밀값을 문서/채팅에 출력하지 않는다. 스크립트는 별도 DB를 만들며 실제 업무 DB에 수동 migration/db push하지 않는다.

```bash
node --env-file=.env packages/database/scripts/verify-launch-baseline.mjs
node --env-file=.env packages/database/scripts/verify-onboarding.mjs --browser-fixture
```

4. 두 번째 명령에 연결된 `verify-sharing.mjs`가 성공한 다음 생성된 격리 DB로 API와 DMS/SNS를 띄운다. `/tmp/ssoo-onboarding-fixture.json`은 새로 생성된 것을 사용하며 재시작 전 파일을 신뢰하지 않는다. 기존 브라우저 세션/포트에 기대지 말고 연결을 새로 만든다.
5. 두 계정 인수와 실제 SSE/WebSocket·검색/AI의 권한 회수를 검증한다. 알림 정책 단위 검사는 `notification-object-policy.service.spec.ts`, `document-notification-policy.service.spec.ts`, `post-notification-policy.service.spec.ts`, `sns/post/post-access.service.spec.ts`다. 모의 브라우저 결과는 `checks.json`의 한계를 유지한다.
6. 발견 결함과 미완성 경계를 정리한 뒤 변경에 맞는 회귀·`pnpm run codex:platform-guard`·문서 검증을 수행한다. 실제 검증 완료와 배포 허용을 구분해 복구/배포 세션에 인계한다.
7. 이번에 생성한 임시 DB/프로세스만 종료·정리하고 증거에 기록한다. 과거 오류 실행의 잔여 DB는 이름과 소유 작업을 확인한 뒤 정리한다. 다른 세션의 DB/컨테이너를 일괄 삭제하지 않는다.

## 프로세스와 미정리 자원

2026-10-02 재개 실행: browser fixture `ssoo_onboarding_verify_17162_muqfoo18`는 삭제 후 부재 확인 완료. 재개 작업이 띄운 API 4140·DMS 3143·SNS 3144 및 브라우저는 종료했다. `output/playwright/onboarding-resume-20261002/cleanup.json`을 근거로 한다. 다른 세션의 DB/컨테이너와 과거 소유 불명 자원은 건드리지 않았다. 아래 목록은 중단 당시 이력이다.

- 알림 검증 브라우저 `notification-scope` 및 임시 HTTP `127.0.0.1:3544`는 이전 턴에서 종료했다. 이 세션이 유지해야 할 브라우저/API 프로세스는 없다.
- 이전 성공 CRM fixture `ssoo_onboarding_verify_7153_mup9959h`는 삭제 확인까지 완료했다.
- 이후 공유 검증의 PostgreSQL I/O 오류 시 `finally` 정리가 실패했다. 남은 일회용 DB의 정확한 목록과 삭제 여부는 정상화 후 확인해야 한다. 성공한 과거 정리 기록을 적용하지 않는다.
- 복구/배포 세션의 `/tmp/ssoo-gate-rehearsal-p1qhqx_b/` 및 관련 임시 DB/컨테이너는 그 세션 소유다. 여기서 삭제하거나 배포 HANDOFF 섹션을 수정하지 않는다.

## 재개 요청 예시

> `docs/common/explanation/architecture/2026-10-02-onboarding-wsl-resume.md`부터 읽고 온보딩·공유 권한 작업을 이어가. WSL 복구는 완료됐으니 실제 DB 격리 검증부터 진행해. 병렬 CRM/배포 변경을 보존해.

## Changelog

| 날짜 | 내용 |
|---|---|
| 2026-10-06 | 클렌징 후 기존 DB를 정본 migration 이력으로 이전하고 로컬 Docker 서버+5앱 배포 완료. 계정·권한·문서 보존, 격리 승인 흐름 및 실제 localhost 검증·복구 자료·소유 임시 자원 정리 기록 |
| 2026-10-02 | 사용자 작성 자료라는 잘못된 설명과 과거 자료 전환 잔여 과제를 정정. 명시 승인에 따라 로컬 CRM/PMS 데모 업무 자료·연결 이력·색인 및 잔존 DMS 3건 정리, 계정·조직·기준정보 보존 검증 |
| 2026-10-02 | 복구 후 실제 DB·복원·두 계정 공유/조직 공개·SSE/WebSocket·만료/AI 원본 검사 완료. 발견 결함 수정 후 서버+5앱 빌드/98 suites/742 tests, preflight·문서 검사 통과. 검증용 DB/프로세스 정리, Docker 미반영 |
| 2026-10-02 | WSL 정상화 대기 지점, 3개 잔여 묶음, 검증 한계·설계·보관본·재개 순서·임시 자원 기록 |
