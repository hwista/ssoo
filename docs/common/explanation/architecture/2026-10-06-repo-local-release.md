# 전체 레포 로컬 Docker 갱신과 원격 동기화

> 2026-10-06 · 진행 중. 현재 작업 전체를 검증한 뒤 로컬 Docker에 반영하고 GitHub/GitLab에 동일 커밋을 공유한다.

## 대상과 보존

현재 `launch/rebaseline-20260721`의 CRM 메뉴 검수, 공용 오류/홈/인증, 온보딩·공유 권한, DB 및 CI 배포 변경을 함께 다룬다. GitHub 대상은 동일 브랜치, GitLab 대상은 기존 `development`다. GitLab의 별도 배포 개선 이력도 통합하며 force push를 사용하지 않는다. 원격 환경의 수동 배포 작업 실행은 이번 로컬 반영과 구분한다.

로컬 `ssoo_dev`는 앞선 온보딩 배포에서 19 migrations/90 triggers 기준으로 이전됐다. 원본 보관 DB를 유지하고 demo seed를 재실행하지 않는다. 이번 시작 시 DB archive, DMS runtime, 기존 이미지와 문서 114개 파일 hash를 `output/local-deploy/20261006-repo-refresh/`에 보존했다. 비밀 설정/백업은 Git 제외 `private/`에 제한 권한으로 저장한다. SSOO 외 프로젝트와 다른 검증 컨테이너는 변경 대상이 아니다.

## 공개 전 의존성 검사 복구

초기 production 감사에서 high 15건·critical 3건을 확인했다. Axios 1.20.0, simple-git 4.0.2, Nodemailer 10.0.9, Joi 18.2.9와 Engine.IO/proxy-addr/source-map-js 수정 버전을 반영한다. simple-git 4는 기존 named import와 Git 작업의 호환성을 실제 DMS readiness 및 Git 검사로 재검증한다. 변경 근거는 [공식 simple-git 릴리스](https://github.com/steveukx/git-js/releases)와 감사 보고서다.

감사 응답의 braces 수정 버전 3.0.4는 npm에 발행돼 있지 않아 설치가 실패했다. [공식 권고](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)도 수정 버전 없음을 명시한다. 해당 override는 제거했다. DMS에서 Tailwind와 animate 플러그인은 CSS 빌드 설정에서만 쓰므로 다른 앱처럼 devDependencies로 분류했다. 개발 의존성의 해당 취약점이 해결됐다는 주장은 하지 않는다. production high/critical 기준과 전체 개발 도구 감사는 구분한다.

## 배포 식별자 보완

로컬 Compose에서 PMS/CRM/SNS의 build args에도 `SSOO_RELEASE_SHA`를 전달하도록 맞췄다. 서버와 다섯 앱의 health 응답에서 검증한 소스 식별자를 대조한다.

## 검증과 결과

최종 소스의 lint/preflight/플랫폼 및 push guard, production 감사, 실제 백업 복원·DB 계약, Docker 서버/5앱 readiness와 인증·도메인 조회, 실제 브라우저 인수 결과를 기록한다. 의존성 갱신 후 production 감사는 high/critical 0, moderate 2/low 3으로 통과했다. 진행 중 로그를 통과로 간주하지 않는다. 최종 배포 식별자·원격 커밋·검증 결과는 완료 후 이 문서와 제외 경로의 증거에 반영한다.

## Changelog

- 2026-10-06: 전체 레포 통합·로컬 Docker 갱신·GitHub/GitLab 동기화 작업과 의존성 검사 복구를 시작했다.

## GitLab 배포 이력 통합 (2026-10-06)

GitLab `4bc0af35`까지의 DB 복구·진단·선택 빌드 이력을 병합했다. DB 호환 SQL과 두 번 실행 계약은 동일 구현을 유지한다. 새 DMS runtime 경로 접근과 Git 상태/remote 도달 진단은 프로젝트 label로 찾은 서버에 적용하며 비밀값을 마스킹한다.

기존 원격의 `build-inputs.sh` 선택 빌드는 현재 `release-state.mjs`의 서비스별 입력·secret·base image hash 및 immutable manifest 검증으로 통합한다. 중복된 이전 실행 스크립트는 남기지 않는다. 실제 CI 승격 전 기본값은 `CI_INCREMENTAL_BUILD=false`, `CI_DEPLOY_MODE=plan-only`다. 원격의 liveness overlay가 해결하려던 DMS 장애에 의한 전체 앱 기동 차단은 현재 core-readiness와 앱별 readiness 분리로 해결하며, DB/auth 확인을 생략하지 않는다.

## 실제 로컬 적용에서 발견한 Git 인증 호환 문제

첫 이미지 `347cccc6`의 격리 복원·초기화 2회·API 25개·비밀번호 인증 4개 검사는 통과했다. 실제 로컬 DMS는 Docker secret을 읽는 Git credential helper를 사용하며, simple-git 4의 환경변수 필터가 entrypoint의 `GIT_CONFIG_*` 전달을 차단해 원격 parity/readiness가 실패했다. 원격 push를 보류하고 이전 서버 이미지로 복구해 readiness 정상화를 확인했다. 격리 환경의 file remote는 HTTP credential helper 경로를 검증하지 못했다.

DMS Git client는 entrypoint의 origin·count·key·고정 helper·useHttpPath가 모두 일치할 때만 해당 두 설정을 명시적 command config로 재구성한다. Docker secret 내용은 읽거나 로그에 복사하지 않는다. credential helper 실행 opt-in은 이 고정 계약을 확인한 클라이언트에만 적용하며, 임의 환경변수·다른 unsafe Git 옵션은 계속 차단한다. 실제 Git 설정 전달과 6가지 변조 거부를 포함한 10개 검사를 통과했다.

첫 로컬 교체 후 문서 테이블 지문 차이를 조사했다. 159건의 추가·삭제 및 문서 내용 변화는 없으며, 86건의 `last_scanned_at`, `last_reconciled_at`, `updated_at`만 자동 스캔으로 변경됐다. 이 세 필드의 변경은 원본 지문 차이와 별도로 기록하고, 업무 데이터 보존 판정에 섞어 숨기지 않는다.
