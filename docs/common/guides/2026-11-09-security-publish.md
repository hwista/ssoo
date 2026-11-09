# 2026-11-09 원격 반영 전 보안 패치

사용자는 누적 개발본의 원격 반영에 앞서 보안 패치와 재검증을 승인했다. Admin 17개 프로그램의 역할·동선 검증은 [기존 인수 기록](../explanation/architecture/2026-11-06-admin-boundary-acceptance.md)에 있으며, 아래는 의존성 변경 이후의 별도 검증이다.

## 변경과 호환성

| 대상 | 적용 버전 | 확인할 계약 |
|---|---|---|
| Next.js / eslint-config-next | 15.5.28 | 서버 및 5개 웹 앱 production build, 인증·이동 |
| sharp / libvips | 0.35.5 / 8.18.7 | Linux 네이티브 PNG 변환 |
| DOMPurify | 3.4.17 | DMS 문서 표시·HTML 정제 |
| Zod / @hookform/resolvers | 4.6.6 / 5.2.2 | 한글 입력 오류, 폼 변환, 생성 기본값과 부분 수정의 구분 |
| Joi | 18.3.1 | 서버 환경 설정 검증 |
| body-parser / multer / follow-redirects | 2.4.0 / 2.5.0 / 1.16.2 | 서버·업로드·HTTP 의존성 계약 |

Zod 4에서는 `partial()` 안의 생성 기본값이 빈 수정 요청에도 적용될 수 있다. 프로젝트 수정 스키마의 상태·단계는 기본값 없는 optional 스키마로 명시해 기존 값을 덮지 않게 했다. 네 단계 상세 폼은 resolver의 입력과 파싱 결과 타입을 구별한다. 실제 PMS 브라우저에서 Zod의 동적 코드 생성 탐지가 CSP report-only 위반을 남기는 것을 확인해, 공용 스키마 진입점에서 `jitless: true`를 설정했다. CSP는 그대로 유지하고 동적 코드 탐지·생성 없이 파싱하는 회귀 검사를 추가했다. 실제 스키마·resolver 검사는 `pnpm verify:pms-validation`로 재현하며 push guard에서 실행한다.

24시간 release-age 및 설치 스크립트 허용 목록은 유지했다. 기존 postcss 8.5.19와 autoprefixer의 권고 버전 차이는 이번 변경 전에 존재한 peer 경고이며 스타일 의존성을 추가 교체하지 않았다.

## 보안 감사

운영 의존성 `pnpm security:audit` 기준 Critical 2·High 10건에서 **Critical 0·High 0건**으로 변경했다. Moderate 8·Low 1건은 남아 있다. 모든 취약점이 없다는 의미가 아니다.

원본 결과와 네이티브·폼 시험 증거는 로컬 `output/security-publish-20261109/`에 보관한다. 비밀 설정과 생성 산출물은 커밋에 포함하지 않는다.

## 검증 상태

- 실제 sharp/libvips 변환, PMS 스키마 및 resolver 회귀 검사 통과.
- 전체 린트 11개 작업, preflight, 문서 산출물·계약 검사 통과.
- 서버·5앱 production build 및 플랫폼 검사 통과. 서버 115개 묶음·876개 테스트 통과.
- 실제 Chromium에서 DOMPurify 3.4.17의 HTML/SVG 정상 표시 보존과 위험 요소 제거 통과.
- 변경 파일이 모두 존재하는 상태에서 push guard 통과.
- 패치된 Admin 로그인 및 17개 프로그램 PC·모바일 34개 화면 통과. 관련 console/runtime/HTTP 오류 0건. 이동 중 취소된 요청은 오류와 구별해 원본 증거에 보관한다.
- CRM 인증 복원, 대시보드·등록·계약서 본문 배치, 등록 양식 끝까지 스크롤과 모바일 표시 통과.
- DMS 실제 문서의 PC·모바일 제목 17개·표 2개·링크 9개 표시 보존, 관련 오류 0건.
- PMS 요청 등록 화면의 무효 입력 차단·정상 입력 활성화, 모바일 오류·취소 복귀 통과. CSP 위반 및 관련 오류 0건. 요청·제안·수행·전환 폼은 실제 스키마/resolver로 변환 결과를 검증했으며, 이번 보안 패치 검증에서 단계별 업무 저장을 다시 실행한 것은 아니다. 시험 업무 자료는 생성하지 않았다.
- SNS 인증 복원·피드·게시판 이동과 모바일 표시 통과. 관련 오류 0건.
- 기존 로컬 포트에서 서버와 5앱을 교체했고 모두 healthy 상태를 확인했다. 실제 런타임은 Node 22.23.2, 웹 5앱 Next.js 15.5.28이다. PMS CSP 보완 후 타입·린트·push guard와 브라우저를 재검증했다.
- 브라우저 원본은 `output/playwright/security-publish-20261109/`, 실행 버전·명령 기록은 `output/security-publish-20261109/`에 보관한다.
- 원격의 DB 초기화·CRM 세로 스크롤 수정 2개 커밋을 포함한다. DB 재초기화나 원격 운영 배포는 실행하지 않는다.

## 수정 근거

- [Next.js 보안 권고](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
- [sharp 0.35.5 변경](https://sharp.pixelplumbing.com/changelog/v0.35.5/)
- [DOMPurify 3.4.17](https://github.com/cure53/DOMPurify/releases/tag/3.4.17)
- [Zod 4 마이그레이션](https://zod.dev/v4/changelog), [상한 초과 컬렉션의 선제 거부 수정](https://github.com/colinhacks/zod/pull/6652)

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-11-09 | 승인된 보안 패치, Zod/CSP 호환성 보완, 감사 결과 및 서버·5앱 재검증 기록 |
