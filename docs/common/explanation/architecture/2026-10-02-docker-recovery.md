# 2026-10-02 WSL·Docker 복구 기록

> 범위: Windows/WSL 로컬 개발 환경. 기존 실행물과 데이터 보존, 저장 공간 회수, 작업 재개 검증.
> 상태: 사용자 Windows 재부팅 후 기존 18개 컨테이너와 DB·웹 서비스 복구 완료. C: 여유 약 139 GB 확보. 현재 개발 작업을 재개할 수 있다. 아래 검증은 기존 실행물 기준이며 병행 소스의 신규 배포 인수와 구분한다.

## 장애와 복구 범위

WSL 재시작 후 Ubuntu는 실행됐지만 Docker Desktop backend는 `0xc0000374`로 반복 종료했다. 최초 확인 당시 `docker-desktop`은 중지 상태였고 Docker API 소켓이 없었다. Windows의 C: 여유 공간은 약 14.6 GB였다. 이전 복구 스크립트는 10:14 KST에 엔진 응답 실패로 종료했으며 기존 서비스 복구·캐시 정리까지 진행하지 못했다.

후속 기동에서 Docker 데이터 디스크의 ext4 복구와 엔진 초기화를 확인했다. Windows 임시 설치 파일 정리 후 기존 18개 컨테이너를 동일 ID로 복구했다. 충돌 감시 도구 분리 후에도 엔진 응답을 확인했으나, 충돌의 단일 근본 원인을 용량 부족 또는 특정 모듈로 단정하지 않는다. 보안 소프트웨어·보안 설정은 변경하지 않았다.

이번 작업은 기존 컨테이너의 환경 복구다. 병행 CRM/온보딩 소스의 신규 빌드·DB migration·배포·원격 push를 수행하지 않는다. 기존 Docker DB는 새 온보딩 기준선 적용 전 상태다.

## 공간 정리와 데이터 보존

- 설치 프로세스 부재와 파일 변경 시각을 확인한 Windows 임시 설치 폴더 `lajwt0ft`, `1mnl1tnc`만 삭제했다. 약 7.14 GB를 회수했다.
- `docker builder prune --all --force`가 128.8 GB의 미사용 빌드 캐시 정리를 보고했다. 캐시의 논리 크기를 C: 회수량으로 계산하지 않는다.
- 완성 이미지 48개, 기존 실행 중 컨테이너 18개와 그 DB 볼륨은 보존 대상이다. 일괄 image/volume/system prune을 사용하지 않는다.
- 실패한 이번 리허설 소유 라벨·볼륨 참조를 확인한 뒤 `ssoo-gate-source-p1qhqx_b-postgres-1`, 전용 `ssoo-gate-source-p1qhqx_b_database`, 해당 빈 네트워크만 삭제했다. 다른 세션의 테스트 DB/컨테이너는 보존했다.
- SSOO PostgreSQL 전체 논리 백업은 `output/local-backups/docker-recovery-20261002/ssoo-cluster.sql.gz`에 권한 `0600`으로 저장했다. dump 성공·gzip 검사를 확인했으며 이번 백업의 별도 restore rehearsal을 수행했다고 주장하지 않는다.
- Docker 파일시스템 TRIM 후 Docker만 종료하고 전용 배포판/데이터 디스크를 분리한다. 파일의 독점 접근 확인을 통과한 뒤 Windows 관리자 권한으로 `compact vdisk`를 실행한다. Ubuntu 종료·배포판 unregister·디스크 포맷은 수행하지 않는다.

Windows 동적 VHD는 내부 파일 삭제만으로 물리 크기가 자동 감소하지 않는다. 압축은 분리 또는 읽기 전용 연결 상태에서 수행한다. [Microsoft compact vdisk 문서](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/compact-vdisk).

2026-10-02 10:52 KST 압축 완료: Docker VHDX `156,365,750,272 → 38,954,598,400` bytes, 실제 `117,411,151,872` bytes 회수. C: 여유 공간 `138,917,068,800` bytes(약 139 GB / 129.4 GiB). DiskPart 종료 코드 0과 성공 메시지를 확인했다. 초기 약 14.6 GB 대비 총 약 124 GB 증가다. Ubuntu VHD에는 추가 압축 여지가 있지만 충분한 C: 공간을 확보했으므로 이번 작업에서 Ubuntu를 종료해 추가 압축하지 않았다.

## 검증과 증거

증거 디렉터리: `output/checkpoints/docker-recovery-20261002/`.

- 압축 전: 기존 18개 ID 모두 running, healthcheck가 있는 17개는 healthy.
- SSOO API health/readiness, Admin/CRM/PMS/DMS/SNS와 BUDD/Lineup 웹 HTTP 200.
- PostgreSQL 4개에서 조회·임시 테이블 쓰기·ROLLBACK 통과, Redis PONG. SSOO 기존 DB는 `ssoo_dev`, 애플리케이션 테이블 조회 수 222개였다. 최신 소스 migration 완료와 구분한다.
- `preflight.log`, `verify-sync.log`: 사전 검사와 규칙 동기화 통과.
- `db-checks.log`, `http-checks.json`, `containers-restored.jsonl`: 압축 전 실제 런타임 증거.
- `images-before.jsonl`, `volumes-before.jsonl`, `failed-rehearsal-cleanup.json`: 보존 기준과 소유 자원 정리 증거.
- `build-cache-prune-all.log`: 캐시 정리 결과.
- Windows 진단/압축 원본: `%LOCALAPPDATA%\Temp\ssoo-docker-recovery-20261002\`. 진단 ZIP은 외부로 업로드하지 않았다.

`compact-result.json`은 최종 디스크 압축 증거다. 초기 UAC 취소와 명령 파일 생성 오류 시에는 압축이 실행되지 않았으며, 연결 중인 디스크도 독점 접근 검사에서 차단했다.

압축 이후 10:52:43 KST 일반 기동에서 backend가 다시 `0xc0000374`로 종료됐다. `final-runtime.log`와 `db-postcompact.log`의 실패는 당시 기록으로 보존한다. 저장 공간 회수만으로 backend 충돌이 해소되지는 않았으며, 이후 전체 Windows 재부팅으로 현재 실행 상태를 복구했다. 충돌의 근본 원인과 영구 재발 방지를 입증한 것은 아니다.

## Windows 전체 재부팅 이후 복구

사용자가 Windows를 직접 재부팅했다. OS의 마지막 부팅 시각은 2026-10-02 11:02:57 KST이며 Docker backend 두 프로세스는 11:03:49/51부터 실행 중이다. 준비했던 RunOnce는 등록하지 않았으며 이 세션에서 재부팅을 다시 실행하지 않았다.

- 재부팅 직후 서버 2개가 WSL bind mount 경로 미준비로 exit 127 상태였다. Ubuntu 준비 후 기존 `ssoo-server`, `ssoo-error-recovery-server`를 시작해 복구했다. 컨테이너를 재생성하지 않았다.
- `final-runtime.json`, `final-runtime-postreboot.log`: 기존 18개 ID 모두 running, healthcheck 17개 healthy. 기존 이미지 48개 보존, 볼륨 21개 유지, 삭제된 볼륨은 앞서 확인한 실패 리허설 소유 1개뿐이다.
- PostgreSQL 4개 조회·임시 쓰기·ROLLBACK 및 Redis PONG을 다시 확인했다(`db-postreboot.json`). 테이블 수는 SSOO 222, 테스트 SSOO 220, BUDD 76, Lineup 84였다. 기존 SQL 백업은 덮어쓰지 않았다.
- API health/readiness와 5앱·BUDD·Lineup 웹 HTTP 200. API readiness의 database/dms 모두 ready. 서버 컨테이너에서 외부 npm registry DNS·TLS·HTTP 200 확인.
- 실제 Chromium에서 `localhost:3000–3004`의 로그인 화면과 아이디 입력란 표시를 확인했다. 5앱 session POST 모두 200, pageerror 0. 증거: `output/playwright/docker-recovery-20261002/postreboot-browser.log`, `postreboot-*.png`. WSL 검사 브라우저는 한글 글꼴이 없어 캡처에 대체 글리프가 보이며 DOM의 한글 문구와 화면 구조를 확인했다. 로그인 이후 업무별 인수는 해당 작업 세션의 잔여 검증이다.
- `windows-postreboot.json`: Windows 부팅·backend 프로세스 시작 시각과 C: 실제 여유 공간 증거. 재부팅 후 점검 중 backend 프로세스 교체나 충돌 재발은 관찰되지 않았다.
- `preflight-postreboot.log`, `verify-sync-postreboot.log`: 사전 검사·엄격 문서 검사와 Codex 규칙 동기화 통과. 최초 문서 Changelog 누락 경고는 수정 후 재검증했다.
- 향후 같은 mount 오류가 있으면 Ubuntu가 준비된 뒤 해당 기존 컨테이너만 `docker start`하고 health를 확인한다. 엔진 자체가 다시 충돌하면 로컬 진단을 이어가며 데이터 VHD를 삭제하거나 보안 프로그램을 임의 중지하지 않는다.

## 다른 작업의 재개 지점

- 온보딩·공유 권한: [재개 문서](2026-10-02-onboarding-wsl-resume.md). 기존 Docker 서비스 전체 재시작 없이 격리 DB 검증부터 재개한다.
- CRM: `output/playwright/crm-business-plan-performance-20261002/restart.md`. fixture 결과와 실제 DB/MDI 통합 인수를 구분한다.
- 배포: [배포 설계](2026-10-01-deployment-design.md) §19. 실패한 리허설을 통과로 바꾸지 않는다. 신규 전체 빌드·배포는 기존 사용자 실행 경계를 따른다.
- 재시작 전 `/tmp` 실행물은 사라졌으므로 세션 소유 스크립트·fixture는 체크포인트/현재 소스로 새로 준비한다. 공유 작업트리에 보관본을 통째로 덮어쓰지 않는다.

## Changelog

- 2026-10-02: 저장 공간 정리·VHD 압축과 실패한 중간 기동 기록, 사용자 Windows 재부팅 후 기존 컨테이너·DB·웹 복구 및 작업 재개 지점을 기록했다.
