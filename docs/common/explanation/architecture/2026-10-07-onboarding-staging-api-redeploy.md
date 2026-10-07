# 운영 온보딩 조회 실패와 재배포

> 2026-10-07 · 배포 복구 이력 통합과 공개 API 빌드 주소 수정 · 재배포 검증 진행 중

## 원인과 범위

운영 주소 `10.125.12.170`의 Admin은 열리지만 CRM/PMS/DMS/SNS는 `소속·서비스 상태를 확인하지 못했습니다`를 표시했다. 공개 JavaScript의 `getCommonSearchApiBaseUrl`을 직접 대조한 결과 Admin만 `http://10.125.12.170:4000/api`였고 다른 네 앱은 `http://localhost:4000/api`였다. 이는 운영 서버 대신 접속자 PC로 온보딩 상태를 요청하게 한다. 모든 앱 origin의 CORS preflight는 정상이며 서버 health 200, 비인증 `/api/onboarding`은 예상된 401을 반환했다. 관리자 계정의 권한을 변경하는 문제로 취급하지 않는다.

증거는 Git 제외 경로 `output/checkpoints/onboarding-prod-diagnosis-20261007/report.json`이다. 사용자 세션·DB·서버 환경은 진단에서 수정하지 않았다.

## 다른 개발자의 배포 복구 이력

현재 브랜치 `11fb0046` 뒤의 GitLab development 커밋 5개를 검토하고 `c7fc07be`까지 fast-forward 통합했다. 성공한 #196의 실제 서버 identity는 `6968564f`이며 배포 job 465의 완료 로그와 일치한다.

- `8a253c05`: 준운영 전용 staging 배포 경로. 기존 production apply 계약은 유지한다.
- `f21013fd`: 작은 runner의 빌드 cache 용량 부족 대응. 실행 컨테이너와 태그된 복구 이미지를 보존한다.
- `6968564f`: 기존 unmanaged DB의 launch 데이터 이전을 db push보다 먼저 실행하고 호환 제약 shim을 적용한다. 실제 DB 복제본에서 초기화를 두 번 검사하는 `db_check`를 수동 배포 앞에 둔다.
- `d02576e9`, `c7fc07be`: 위 복구와 #196 배포 결과 인계 기록.

현재 준운영 DB는 로컬에서 별도로 이전한 managed DB와 다르다. 운영의 기존 compat 경로, upgrade 정책, 복제 DB 검사와 백업을 유지한다. 기존 복구 코드에서 다루지 않는 새 migration·seed·권한 변경은 이번 수정에 추가하지 않는다. staging의 Docker healthy 판정은 브라우저 요청 주소나 인증된 업무 접근 성공을 보장하지 않는다는 한계를 이번 오류가 드러냈다.

## 수정과 검증 계획

`.gitlab-ci.yml`에 Admin/CRM/PMS/DMS/SNS의 `*_NEXT_PUBLIC_API_URL`을 모두 운영 API로 명시한다. Compose의 각 `build.args.NEXT_PUBLIC_API_URL`에 전달되어 새 Next.js 브라우저 번들에 포함된다. runtime 환경만 변경하거나 재시작하는 것으로는 기존 번들의 localhost 값을 바꿀 수 없다.

기존 pipeline의 verify → AI review → plan → build → db_check → deploy_dev 경로를 사용한다. 로컬 preflight·동기화·platform guard·push guard와 실제 Compose 빌드 입력을 검사한 뒤 게시한다. 배포 후 서버/5앱 identity 및 HTTP, 공개 번들의 실제 API resolver와 CORS를 다시 대조한다. 운영 계정 인증 검증은 실제 확보한 세션 범위에서만 판정하며 비인증 조회를 로그인 성공으로 기록하지 않는다.

진행 증거·비공개 job trace: `output/checkpoints/onboarding-prod-redeploy-20261007/`. 사용자 요청에는 다른 개발자 변경 확인·통합과 문제 해결을 위한 재배포가 포함된다. 이번 확인을 새 배포 성공으로 간주하지 않는다.

## 로컬 검증 결과

preflight, 규칙 동기화, push guard, platform guard를 통과했다. 서버와 5개 웹 앱 production build 및 서버 Jest 100개 suite / 766개 test가 통과했다. CI 변수로 해석한 Compose의 5개 `build.args.NEXT_PUBLIC_API_URL`이 모두 운영 주소와 일치한다. 문서 구조 검사도 통과했다. GitLab 프로젝트 변수 목록은 현재 토큰에 읽기 권한이 없어 확인하지 못했으므로 최종 배포 번들로 실제 적용 값을 검증한다.

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-10-07 | 성공 배포 #196의 복구 커밋 5개 통합, 운영 네 앱의 localhost API 빌드 오류 확인 및 CI 공개 API 입력 수정. 재배포 검증 진행 중 |
