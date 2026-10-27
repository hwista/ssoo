# Docker 및 Windows 공간 관리

> 최종 업데이트: 2026-10-26

## 실행 주체와 완료 기준

레포의 `scripts/storage/`가 정책과 실행 코드를 소유한다. 로컬 `docker:build/up`, `docker:local-test:build/up`, `docker:production:build/up`과 GitLab release job은 정리를 필수 실행한다. CI는 기존 호스트 잠금(`/tmp/ssoo-app-runtime.lock`)을 사용한다. 직접 실행한 Docker 명령과 다른 저장소에는 이 잠금이 자동 적용되지 않는다.

Docker 내부 공간과 Windows C: 여유 공간은 별도 측정한다. 캐시 삭제량을 C: 확보량으로 보고하지 않는다. 정리 실패/용량 미달은 명령 실패이며, 배포가 이미 검증·커밋됐다면 정리 실패만으로 배포 상태를 rollback/recovery-required로 바꾸지 않는다.

## 보존 정책

정본은 `scripts/storage/policy.json`이다.

| 대상 | 정책 |
|------|------|
| 정상 CI 배포 | 현재 정상 배포 + 이전 정상 배포 3개 |
| 미배포 prepared/built/rehearsed | 7일 이후 만료; 배포 시도 기록이 있으면 자동 만료 금지 |
| 검증된 rolled-back 배포 | 7일 이후 이미지 보호 해제 |
| 복구 중·상태 불명·중단된 배포 | 자동 만료 금지 |
| 수동 보호 | 배포 디렉터리의 `retain-images` 파일로 보호 |
| 컨테이너 참조 | 종료된 컨테이너도 포함해 이미지 보호 |
| 새 이미지 | 24시간 유예; 생성 시각 불명도 보호 |
| CI 검증 전용 이미지 (`app-ci-verify:<40자리 SHA>`) | 빌드 성공 후 verify 종료 시 해당 태그 정리; 다음 정리에서도 24시간 유예 제외. 컨테이너·보존 manifest 참조, 배포 태그 공유, 생성 시각 불명은 보호 |
| 빌드 캐시 | 24시간 미사용 캐시 대상으로 8GB 보존 기준의 prune; 강제적인 전체 사용량 상한은 아님 |
| 빌드 최소 여유 공간 | CI 검증 이미지 빌드 전 10GiB(`CI_VERIFY_MIN_FREE_KB`), 일반 빌드/계획 8GiB, 후속 target 3GiB |
| 배포 최소 여유 공간 | 이미 빌드·봉인한 이미지를 실행하므로 `deploymentMinimumFreeGiB`의 3GiB 사용(`CI_DEPLOY_MIN_FREE_KB`로 별도 지정). Docker root/container layer와 release 디렉터리 파일시스템을 백업 전·후 모두 검사 |
| staging 백업 예산 | DB 실제 크기 + DMS runtime 디렉터리 사용량 + 10% 여유(최소 256MiB) + 배포 최소 여유 공간. 백업 저장 파일시스템에서 사전 검사; 추정 실패·백업 후 공간 부족 시 DB 변경·앱 교체 전 중단 |
| Windows C: 목표 여유 공간 | 60GiB; 실제 확보량과 목표 충족 여부 기록 |

CI의 오래된 manifest는 감사 기록으로 유지하고 `retired.json`으로 이미지 보호만 해제한다. 만료된 pipeline은 재배포할 수 없으며 새 pipeline을 만들어야 한다. DB 스키마가 달라지면 이전 이미지 보존만으로 rollback을 보장하지 않는다.

로컬 Compose는 정상 실행 중인 7개 서비스 이미지(DB 초기화는 정상 종료)를 묶어 보호 태그를 만든다. 현재 이미지 조합과 이전 정상 조합 3개를 유지한다. 로컬 기록은 이미지 보존용이며 CI의 환경·백업·복구 증거를 갖춘 release manifest를 대체하지 않는다. 동일 이미지 조합의 반복 실행은 중복 버전으로 세지 않는다.

정리는 SSOO의 관리 태그만 삭제한다. 컨테이너·데이터 볼륨·백업·소스 checkout·검증 기록은 자동 삭제하지 않는다. 캐시는 현재 Docker builder의 공유 자원이므로 다른 프로젝트의 오래된 빌드 캐시도 회수될 수 있다. 기존 CI의 디스크 부족 시 비상 cache prune은 유지한다.

## Docker 사용

### GitLab 러너 공간 진단

`fix/ci-storage-maintenance` 유지보수 브랜치의 `storage_audit` job은 일반 development 파이프라인과 분리해 실행한다. 검증 이미지 빌드와 10GiB 사전 조건 없이 기존 `node:22` 이미지(`--pull never`)로 보존 manifest의 필요한 필드만 읽는다. 공용 호스트 잠금 아래 실제 여유 공간, 모든 이미지 태그·크기, 종료 컨테이너를 포함한 이미지 참조, release별 상태·수동 보호·배포 시도·만료 여부를 출력한다. secret/env/config 본문과 백업 내용은 출력하지 않으며 이미지·컨테이너·볼륨·release 기록을 삭제하지 않는다. SSH 없이 GitLab job trace로 정리 후보를 검토할 수 있다.

2026-10-27 진단 job #532에서 현재 #204, 이전 정상 #196/#201, 복구 #195, 미배포 #213의 보존을 확인했다. 별도 `storage_cleanup_legacy` 수동 job은 `legacy-image-retirement.json`에 고정한 13개 구형 `ssoo-*:latest`/`app-*:latest` 태그와 이미지 ID만 정리한다. 실행 중인 `app-db-init:latest`, 모든 SHA/ci-backup 태그와 CMS/모니터링/DB 이미지는 대상이 아니다. 호스트 잠금 안에서 모든 manifest(만료된 기록 포함)·모든 컨테이너·24시간 유예·추가 태그·감사 당시 ID를 다시 검사하고 불일치하면 삭제 전에 중단한다. 강제 삭제나 prune 없이 태그별 `docker image rm`만 실행하고, 실제 파일시스템 여유 공간 및 컨테이너 ID·이미지·시작 시각·health 불변을 확인한다. 상세 snapshot은 runner의 `releases/maintenance/legacy-<job ID>`에 비공개 보존하며 trace에는 필요한 필드만 출력한다.

```bash
pnpm storage:docker:status
pnpm storage:docker:cleanup
pnpm docker:build
pnpm docker:up
pnpm docker:production:up
```

로컬 보고서는 `~/.local/state/ssoo/storage/<엔진·프로젝트·프로필 해시>/latest-report.json`에 기록한다. `SSOO_STORAGE_STATE_DIR`로 기본 디렉터리를 바꿀 수 있다. 모든 명령은 정상 동작 검증 이후에만 새 이미지 조합을 성공 이력으로 등록한다. `up`은 Compose healthcheck를 기다리며 전체 서비스 검증이 실패하면 성공 이력으로 등록하지 않는다.

CI는 verify/plan 준비, build 완료, deploy 성공 후 정리를 수행한다. release 디렉터리에 `storage-before.txt`, `storage-after.txt`, `storage-status.json`, `retention-decision.json`을 남긴다. 실제 운영 CI에 적용하려면 변경 코드를 해당 원격 브랜치에 반영해야 한다. 로컬 파일 수정만으로 원격 runner가 바뀌지는 않는다.

검증 이미지 빌드가 성공하면 같은 호스트 잠금을 유지한 채 EXIT trap으로 해당 SHA의 검증 태그를 정리한다. 검증 실패와 INT/TERM 종료에도 정리를 시도하고 원래 실패 코드를 유지한다. 검증 성공 뒤 정리만 실패해도 job은 실패한다. 강제 삭제는 하지 않으며, 강제 종료 등으로 남은 이미지는 다음 verify/plan 준비의 정리에서 회수한다. 이미지 태그 삭제 후에도 공유 레이어·빌드 캐시는 남을 수 있으므로 후속 공간 검사와 기존 비상 캐시 정리를 유지한다.

2026-10-26 pipeline #212는 `43872fa6`의 24시간 유예가 직전에 생성한 검증 이미지에도 적용되면서 plan의 8GiB 공간 검사에서 중단됐다(제공된 로그: `free_kb=5411704`, `required_kb=8388608`). 수정 코드를 반영한 새 pipeline으로 verify 종료 정리, plan의 실제 여유 공간과 후속 배포 결과를 확인한다. 기존 #212를 단순 재시도하면 이전 SHA의 정책이 다시 실행된다.

후속 pipeline #213(`0618ad1f`)은 verify·plan·build·db_check가 성공했지만 deploy job #524가 `free_kb=4749308`에서 빌드용 8GiB 검사에 걸렸다. 배포는 새 이미지를 빌드하지 않으므로 별도 3GiB reserve로 분리하고, staging 백업은 위 예산을 별도로 확보한다. 백업 크기는 추정치이며 동시 쓰기까지 보장하지 않으므로 백업 직후 Docker·release 저장소를 다시 검사한다. 백업 실패나 사후 검사 실패에서는 DB와 앱을 변경하지 않는다. `CI_BUILD_MIN_FREE_KB`를 낮추어 배포를 통과시키지 않는다.

2026-10-26 통합 기준은 GitLab `development`의 `1cff17d1`이다. 원격에서 제거한 advisory `ai_review` 작업과 `jq` 설치를 되살리지 않으며, 검증 이미지의 10GiB 사전 공간 검사와 실측 로그를 유지한다. 이 기준의 기존 원격 pipeline #204는 2026-10-08 배포까지 성공했다. 새 자동 정리가 포함된 원격 pipeline 성공 증거와는 구분한다.

## Windows 예약 작업 설치

Windows PowerShell에서 실행한다. 관리자 권한이 필요한 압축 작업은 설치 시 UAC 승인이 필요하다.

```powershell
& '\\wsl.localhost\Ubuntu\home\a0122024330\src\ssoo\scripts\storage\windows\install.ps1' -Elevate
```

설치 시 현재 Windows 사용자의 WSL 등록 정보와 Docker 기본 디스크 위치에서 C:의 VHDX를 탐색한다. 등록된 경로를 `%LOCALAPPDATA%\SSOO\Storage\config.json`에 기록하고 스크립트를 같은 Windows 디렉터리에 복사한다. WSL을 종료해도 Windows 작업이 계속 실행되며, 레포 변경 후에는 설치 명령을 다시 실행해 복사본을 갱신한다. 디스크 이동/새 배포판 추가 시 경로를 재검토해 재설치한다.

| 작업 | 실행 조건 |
|------|----------|
| `SSOO-Storage-Check` | 매일 12:00 및 로그인, 실제 C: 여유 공간 점검 |
| `SSOO-Storage-Reclaim` | 일요일 04:00부터 해당 주 작업이 미완료이면 실행 가능. 매일 04:00 및 로그인 시 재시도 |

PC가 꺼져서 놓친 작업은 `StartWhenAvailable`로 다음 실행 기회에 재시도한다. PC를 깨우지 않는다. 해당 사용자 로그인 상태에서 실행하며, Windows 유휴 조건과 최근 입력 60분 경과를 모두 확인한다. C:가 목표 여유 공간 이상이면 압축을 생략한다. 실패·보류는 주간 완료로 기록하지 않는다.

사용자 승인된 유지보수는 Docker와 WSL의 정상 종료를 포함한다. 모든 실행 중 배포판에서 빌드·배포 잠금과 알려진 빌드 프로세스를 확인하고, Windows 빌드 프로세스도 확인한다. 실행 컨테이너 ID와 배포판 목록을 먼저 저장하고, 일반 WSL 파일시스템 trim → 컨테이너 정상 종료 → Docker Desktop 종료 → WSL 종료 → 등록 VHDX 압축 → Docker·기존 컨테이너·배포판 재시작 순서로 실행한다. Docker는 다른 프로젝트 컨테이너도 포함하므로 유지보수 동안 모두 중단된다. 배포판 재시작은 기존 터미널/편집기 프로세스를 복원한다는 의미가 아니다.

Windows의 `maintenance.json`은 WSL 종료 이후에도 남아 새 SSOO 빌드·배포를 차단한다. 관리 명령 외의 원격 빌드나 다른 프로그램의 모든 작업을 판별할 수는 없다. 잠금 획득 실패, 새 배포판 발견, 사용자의 입력 재개 시 종료 전에 보류한다. 압축 시작 이후에는 중간 종료 대신 복원을 마친다.

압축은 Windows `CompactVirtualDisk` API의 오류 코드를 확인한다. 파일이 다시 사용 중이면 실패하며, `finally`에서 재시작을 시도한다. 실패 시 `recovery.json`을 남기고 다음 유지보수에서 복원을 우선한다. 복원되지 않은 marker를 임의 삭제하지 않는다.

```powershell
$root = Join-Path $env:LOCALAPPDATA 'SSOO\Storage'
& "$root\maintain.ps1" -Mode Check
& "$root\maintain.ps1" -Mode Reclaim -DryRun
& "$root\maintain.ps1" -Mode Recover
Get-ScheduledTask -TaskName 'SSOO-Storage-*'
```

보고서는 같은 디렉터리의 `latest-Check.json`, `latest-Reclaim.json`, `reports/`에 남는다. 실제 C: 전후 bytes, reclaimedBytes, targetMet, 보류/실패 사유를 기록한다. 보고서만 30일 후 정리한다. `compacted`여도 삭제 가능한 블록이 부족하면 목표 여유 공간에 도달하지 않을 수 있으므로 `targetMet`을 함께 확인한다.

## 검증

`pnpm verify:storage`, `pnpm verify:gitlab-pipeline`, `pnpm codex:preflight`, `pnpm codex:platform-guard`를 실행한다. Windows에서는 `automation/tests/storage/windows.test.ps1`로 일정/경로/native 오류 처리를 검증한다. 실제 시스템 종료·압축·복원 검증은 유지보수 시간에 수행하고 생성된 보고서와 복원된 서비스 상태를 확인한다. DryRun이나 단위 테스트를 실제 C: 반환 성공 증거로 취급하지 않는다.

공식 근거: [Docker 캐시 GC](https://docs.docker.com/build/cache/garbage-collection/), [Docker Desktop CLI](https://docs.docker.com/desktop/features/desktop-cli/), [Windows CompactVirtualDisk](https://learn.microsoft.com/en-us/windows/win32/api/virtdisk/nf-virtdisk-compactvirtualdisk).

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-10-27 | 정리 job #534는 healthcheck가 없는 컨테이너의 Docker template 오류로 삭제 전에 중단됨. 선택적 Health 필드를 처리하는 JSON snapshot 비교로 수정하고 회귀 테스트 추가 |
| 2026-10-27 | 진단 #532로 확인한 미참조 legacy 이미지 13개의 ID 고정 수동 정리, 삭제 전 보호 검사와 컨테이너 불변 검증 추가 |
| 2026-10-27 | 빌드 공간이 부족해도 실행 가능한 별도 GitLab storage_audit job과 비밀값을 제외한 읽기 전용 러너 공간/보존 이력 진단 추가 |
| 2026-10-26 | #524 배포 공간 검사 수정: 빌드 8GiB와 배포 3GiB를 분리하고 staging 백업 크기 예산 및 백업 전후 Docker/release 파일시스템 검사를 추가 |
| 2026-10-26 | #212 공간 부족 회귀 수정: verify 종료 정리와 잔여 검증 전용 이미지의 24시간 유예 제외, 컨테이너·복구·배포 이미지 보호 및 실패 코드 회귀 테스트 추가 |
| 2026-10-26 | 로컬·CI 필수 Docker 정리, 배포 묶음 보존·만료, Windows 유휴 유지보수와 놓친 일정 재시도 추가 |
| 2026-10-26 | 최신 GitLab의 AI 리뷰 작업 제거와 검증 이미지 10GiB 검사 위에 자동 정리 변경 통합 |
