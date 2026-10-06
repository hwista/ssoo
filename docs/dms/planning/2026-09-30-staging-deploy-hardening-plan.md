# 준운영 배포 파이프라인 재발 방지 실행 계획

> 2026-10-01 후속: 아래는 9/30 당시 제안 이력이다. 구현 정본은 [플랫폼 배포 설계·활성화 절차](../../common/explanation/architecture/2026-10-01-deployment-design.md)로 이관했다. 현재는 build 이후 실제 백업 clone 리허설, image ID 고정, 5앱 검사, DB 변경 시 보수 시간, DB 변경 없는 경우에 한정한 자동 rollback을 사용한다. 아래 latest 선택·구 db-init rollback·무중단 표현은 새 절차에 적용하지 않는다.

> 작성일: 2026-09-30\
> 상태: 구현 대기 (승인된 방향, 세부 설계는 구현자가 이 문서 기준으로 확정)\
> 대상: GitLab `development` shell runner(`ssoo-shell-runner`, `lsiddms01`) → 준운영 서버 `10.125.12.170` (Admin/CRM/PMS/DMS/SNS `3000~3004`, API `4000`)\
> 기준 커밋: `704ea3b1` (2026-09-30 복구 작업 종료 시점)\
> 작업 환경: WSL `~/dev/LSWIKI-src`에서만 개발·커밋·push한다. Windows checkout은 pnpm hook이 동작하지 않는다.

## 1. 배경: 2026-09-30 장애에서 반복된 실패

마지막 배포 성공(#160, `cbd9d7e0`, 2026-08-06) 이후 DB·compose·설정 검증이 크게 바뀐 커밋 8개가 쌓인 상태에서 배포를 시도했고, 문제를 **배포하면서 하나씩** 발견했다. 파이프라인 한 번(verify→build→deploy)에 약 40분이 걸려 복구에 6시간 이상이 들었고, 그동안 준운영 서버가 내려가 있었다.

| # | 발견 시점 | 문제 | 근본 원인 | 수정 커밋 |
|---|---|---|---|---|
| 1 | #176 verify | Docker 여유 공간 1.4 GiB | SHA/backup image tag 무기한 누적 | `6079b4e9` |
| 2 | #178 build | Buildx `fs.read=/dev/null` entitlement | compose secret 기본값 `/dev/null` | `40bb6521` |
| 3 | #179 deploy | 새 `db-init` exit 3 | compat SQL의 비보호 legacy 컬럼 참조 | `9f8680ae` |
| 4 | #179 rollback | 이전 server도 기동 실패 | 강화된 base compose(`AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS=false`, `DMS_INSTANCE_ENV=""`)를 overlay 없이 사용 | `2b6ca2d6` |
| 5 | 로컬 리허설 | `ranker_code`, `pk_*` 기본키 이름, 이전 history trigger | compat 경로 결함 3건 | `9f8680ae` |
| 6 | #183 deploy | guarded `db push` 거부 | 준운영 DB host `ssoo-postgres` 미허용 | `704ea3b1` |
| 7 | #183 rollback | 이전 server가 계속 unhealthy, 웹 미기동 | 새 compose healthcheck(`/api/health/readiness`)가 이전 image에 없음 | 미수정 → WP-2 |

운영 절차상의 실수도 있었다. GitLab 10.4가 pipeline API `variables`를 무시한다는 사실을 확인하지 않아 dry-run 대신 실제 image 정리가 실행됐고, 진단 출력의 마스킹이 URL userinfo를 다루지 못해 GitLab 계정 비밀번호가 trace에 노출됐다(trace는 삭제, 마스킹 보강 완료).

## 2. 목표와 완료 정의

배포 실패의 원인을 **서비스를 건드리기 전에** 찾고, 실패해도 서비스가 내려가지 않게 한다.

완료 조건(모두 충족해야 완료):

1. WP-1: 1번 표의 3·5·6번 결함을 되돌린 상태의 커밋을 push하면 pipeline이 build 전에 실패하고, 운영 container는 전혀 변경되지 않는다.
2. WP-2: 새 `db-init` 또는 새 server 설정이 실패하는 배포에서 기존 운영 container가 계속 응답한다(3000~3004, `/api/health` 무중단). rollback이 필요한 경우 rollback health가 통과한다.
3. WP-3: `apps/web/dms`만 바꾼 커밋의 build가 dms만 빌드하고 나머지 6개는 provenance 검증 후 태그만 부여한다.
4. WP-4: GitLab UI에서 verify stage가 수동 진단 잡 때문에 미완료처럼 보이지 않는다.
5. 모든 변경은 `pnpm run verify:gitlab-pipeline`, `codex:preflight`, lint를 통과하고 `docs/dms/guides/deployment.md`·changelog에 반영된다.

## 3. 작업 항목

### WP-1. 배포 리허설 stage (최우선)

- 위치: `.gitlab-ci.yml`에 `rehearsal` stage를 `verify`와 `build` 사이에 추가하고, `scripts/ci/run-app-job.sh rehearse`로 실행한다. runtime lock(`/tmp/ssoo-app-runtime.lock`)을 잡는다.
- 배포 중인 SHA 결정: `ssoo-server` container의 image ID와 같은 `app-server:<40hex>` tag, 없으면 last-backup manifest, 둘 다 없으면 실패. `CI_REHEARSAL_BASE_SHA`로 override할 수 있게 한다.
- 일회용 DB: 전용 docker network(`ssoo-rehearsal-$CI_JOB_ID`)에 `pgvector/pgvector:pg17` container를 띄우고 network alias를 **`ssoo-postgres`**, DB 이름 **`ssoo_dev`**로 둔다(준운영과 같은 host/DB 이름이어야 `db push` guard까지 재현된다). 실제 운영 network에는 붙이지 않는다. 종료 시 trap으로 container/network/volume을 제거한다.
- 배포 상태 재현: 배포 중인 SHA의 `app-db-init:<base_sha>` image를 그 DB에 실행한다. image가 없으면 같은 SHA의 `schema.prisma` push + seed + trigger로 대체한다(2026-09-30 로컬 리허설 방식, `docs/common/guides/ai-rag-runtime-runbook.md` DB Init Modes 참조).
- 새 버전 검증: 이 단계에서 `db-init` target만 먼저 빌드해 같은 DB에 **두 번 연속** 실행하고, 두 번 모두 `[db-init] ✅ complete`와 exit 0이어야 통과한다.
- server 설정 검증: `docker compose config`로 확정한 `server.environment`(staging overlay 포함)를 `apps/server/src/config/config.validation.ts` 스키마에 통과시키는 검사를 추가한다(예: ci-verify image에서 실행하는 `scripts/ci/verify-server-config.mjs`). 비밀값은 출력하지 않는다.
- 실패 시: 해당 단계 로그를 trace에 남기고(마스킹 적용) build/deploy가 실행되지 않게 한다.
- 테스트: `automation/tests/ci/gitlab-pipeline-contract.sh`에 fake docker로 base SHA 결정, alias/DB 이름, 2회 실행, 실패 시 build 미실행, cleanup trap을 검증한다.

### WP-2. 무중단 배포 순서와 rollback 보강

- 현재 `docker compose up -d --no-build`는 `db-init`이 끝나기 전에 server와 웹을 먼저 재생성한다. 그래서 `db-init`이 실패하면 서비스가 내려간다.
- 변경: 새 image를 `latest`로 선택한 뒤 먼저 `docker compose run --rm --no-deps db-init`을 실행하고, 성공했을 때만 `up -d --no-build`로 app container를 교체한다. 실패하면 `latest`를 backup manifest로 되돌리고 app container는 건드리지 않는다.
- server 설정 사전 검사: 교체 전에 새 server image로 설정 검증만 하는 일회용 실행을 추가한다(WP-1과 같은 검사를 실제 image로 수행).
- rollback 보강: backup 시점의 `docker compose config` 결과(환경 치환 완료본)를 manifest 옆에 저장하고, rollback은 그 compose 설정으로 이전 image를 올린다. 이전 image에 없는 healthcheck 경로 때문에 rollback이 실패하는 문제(1번 표 7번)를 막는다.
- DB 변경은 되돌릴 수 없다는 기존 원칙을 유지한다. rollback은 image와 compose만 되돌린다.
- 테스트: db-init 실패 시 app container 재생성 0회, rollback compose snapshot 사용, 기존 성공 경로 불변을 contract test로 검증한다.

### WP-3. build 시간 단축

- 서비스별 입력 경로(예: `apps/<svc>/**`, 공유 `packages/**`, `pnpm-lock.yaml`, `docker/<svc>*.Dockerfile`, 루트 설정)를 정의하고, 직전에 빌드된 SHA 대비 입력이 바뀐 서비스만 빌드한다.
- 바뀌지 않은 서비스는 직전 SHA image에 새 SHA tag를 붙이되, image label(`com.ssoo.ci.commit` 등)과 ID로 provenance를 검증하고 trace에 `reused` 사유를 남긴다. 판단이 불확실하면 빌드한다(fail-safe).
- `image-provenance.sh tag-build`의 "7개 모두 SHA tag 존재" 계약과 retention 정책(서비스별 최근 build 3개, backup 2개)을 유지한다.

### WP-4. 정리 항목

- `diagnose_runtime`을 `verify` stage에서 별도 manual stage(`diagnose`)로 옮긴다. 읽기 전용, lock 미사용, 비밀값 마스킹을 유지한다.
- `deployment.md`에 GitLab 10.4 제약을 명시한다: pipeline API `variables` 무시, `-o ci.skip` 미지원(`[ci skip]` 사용), runner는 동시에 job 하나만 실행하므로 대체된 pipeline은 취소한다.
- 기존 실패 `node scripts/verify-pms-launch-readiness.mjs`의 "PMS mobile layout removes desktop sidebar offset"은 이번 범위와 무관한 기존 결함이므로 별도 과제로 등록한다.

### WP-5. 준운영 보안 후속 (운영자 조치 포함)

- 노출된 계정 비밀번호 교체, 서버 `.env`의 `DMS_GIT_BOOTSTRAP_REMOTE_URL`에서 평문 자격증명 제거(새 compose는 사용하지 않음).
- 대화에 노출된 GitLab PAT `LS_WIKI_HJ` 폐기 후 재발급, WSL `~/.git-credentials` 갱신.
- HTTPS 전환 후 `AUTH_SESSION_COOKIE_SECURE=true`, `compose.staging.yaml`의 `AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS` 제거.
- 실제 `AUTH_CONFIG_ENCRYPTION_KEY` 도입. 현재 placeholder 키로 암호화된 데이터가 있는지 먼저 확인하고 재암호화 절차를 정한다.
- DMS 문서 저장소 push용 `DMS_GIT_HTTP_CREDENTIALS_FILE` + `DMS_GIT_HTTP_AUTH_SCOPE` 구성.

## 4. 불변식 (약화 금지)

- exact `CI_COMMIT_SHA` source sync, image provenance 검증, 7개 서비스 backup manifest, 실패한 deploy를 failed로 유지하는 계약.
- 실행 container·volume·DB를 CI가 삭제하지 않는다. image 정리는 retention 정책과 `-f` 없는 삭제만 사용한다.
- trace에 비밀값을 남기지 않는다. 새 출력은 URL userinfo·`*PASSWORD*`/`*SECRET*`/`*TOKEN*`/`*KEY*` fixture로 마스킹을 테스트한 뒤 추가한다.
- 앱 포트 Admin/CRM/PMS/DMS/SNS = `3000/3001/3002/3003/3004`, staging DMS 역할 `prod`(`LSWIKI_DOC`).
- 리허설 DB는 실제 운영 network·volume과 분리한다.

## 5. 실행 순서

1. WP-1 → 결함 되돌림 커밋으로 build 전 차단을 확인한 뒤 원복한다.
2. WP-2 → db-init 실패 fixture로 무중단을 확인한다.
3. WP-4 → 문서·stage 정리.
4. WP-3 → 단일 서비스 변경 커밋으로 재사용 경로를 확인한다.
5. WP-5는 운영자 일정에 맞춰 별도로 진행하고, 코드 변경분만 이 계획에 따라 반영한다.

각 WP는 독립 커밋으로 올리고, push 전에 WSL에서 `pnpm run verify:gitlab-pipeline`과 관련 리허설을 먼저 통과시킨다.

## 6. 참고

- 장애 경과와 환경 정보: 루트 `HANDOFF.md`의 "GitLab staging deploy recovery — 2026-09-30"
- 배포 계약: `docs/dms/guides/deployment.md` "GitLab pipeline 배포 계약"
- db-init 호환 경로: `docs/common/guides/ai-rag-runtime-runbook.md` "DB Init Modes"
- 관련 스크립트: `.gitlab-ci.yml`, `scripts/ci/run-app-job.sh`, `scripts/ci/image-provenance.sh`, `scripts/ci/diagnose-runtime.sh`, `scripts/db-init-entrypoint.sh`, `compose.staging.yaml`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-09-30 | 준운영 배포 장애(#176~#184) 경과와 재발 방지 작업(WP-1~WP-5)을 실행 계획으로 작성 |

### 2026-10-06 GitLab 이력 통합

원격 `4bc0af35`의 선택 빌드와 liveness overlay는 현재 manifest 입력 hash와 core-readiness 분리 계약에 통합했다. DMS 경로/Git 진단은 보존했다. 과거 구현과 현재 적용 기준은 [통합 기록](../../common/explanation/architecture/2026-10-06-repo-local-release.md)을 따른다.
