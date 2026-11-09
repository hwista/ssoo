# Admin 공통 관리 화면 템플릿 전수 적용

> 2026-11-05 · 범위: 공통 관리 17개 프로그램과 연결된 Admin 화면

## 문제와 기준

메뉴 접근성 검증만으로 화면 조립의 일관성을 보장할 수 없었다. 데이터 관리 화면에 설정 recipe를 사용했고, 페이지 제목·경로 순서, 검색·작업 영역, 표와 페이지 이동을 개별 패널에서 다시 조립했다. 승인 위임은 본문에 두 번째 h1이 있었으며 경로가 `admin/roles`로 고정됐다.

기준은 [Content Page Assembly Standard](content-page-assembly-standard.md)와 [플랫폼 프레임](ssoo-frame-system.md)이다. 화면별 새 template를 만들지 않고 `web-shell`의 기존 recipe를 소비한다. 도메인 데이터와 편집·승인·복구·재시도·이력 처리는 Admin에 유지한다.

## 17개 적용표

| 프로그램 | 주소 | 적용 recipe | 본문 및 확인할 동작 |
| --- | --- | --- | --- |
| 회사·조직 관리 | `/organizations` | DataWorkspace | 목록·등록·수정·상태 변경·구성원/이용권/권한 |
| 사용자 관리 | `/users` | DataWorkspace | 검색·등록·수정·활성 변경·관련 소속/이용권 |
| 사용자 소속 관리 | `/memberships` | DataWorkspace | 검색·상태·배치·변경·조직 이동·종료·이력 |
| 계정 상태·복구 | `/accounts` | DataWorkspace | 사용자 검색·계정 운영·잠금/비밀번호/세션 복구 동선 |
| 애플리케이션 기준 | `/applications` | DataWorkspace | 5앱 기준표·접속 경로·이용권 연결 |
| 서비스 이용권 관리 | `/service-grants` | DataWorkspace | 사용자·상태·앱 조건·부여·변경·회수·이력 |
| 역할·기능 권한 | `/roles` | Workspace | 역할 선택·기능 검색·사유·저장·영향 사용자·기능 명세 |
| 조직 공통 권한 | `/organization-permissions` | DataWorkspace | 대상·상태 조건·권한 추가/변경/회수·이력 |
| 사용자 권한 예외 | `/user-permissions` | DataWorkspace, 예외 조회는 Workspace | 대상·허용/차단·기간·예외 내역·이력 |
| 유효 권한 진단 | `/access-diagnosis` | Workspace | 사용자 선택·이용 자격·정책 판정 근거 |
| 승인 담당자·위임 | `/approval-authorities` | Workspace | 담당자 목록·추가·범위/기간 변경·회수·신청 처리 연결 |
| 공통 신청 처리 | `/approvals` | Workspace | 조직/서비스·가입 신청 전환·조건·승인/반려 사유 |
| 공통 변경 이력 | `/operation-history` | DataWorkspace, 감사 이벤트는 Workspace | 기간·대상 조건·동일 조회 시점 페이지 이동·전후 비교·원본 연결 |
| 공통코드 관리 | `/codes` | DataWorkspace | 유형·상태 조건·추가·수정·상태·삭제 사유·참조/이력 |
| 인증 정책 | `/auth` | Settings | 정책 조회·저장·메일/가입 신청 연결 |
| 인증 메일 운영 | `/email-operations` | Workspace | 연결 설정·시험 발송·수신함·발송 상태·수동 실행·전송 기록 |
| AI 실행 운영 | `/ai-operations` | Workspace | 연결 설정·준비 상태·색인 대상·작업 실행·재시도 |

대시보드와 내 소속·서비스 이용은 Workspace를 사용한다. 사용자 관리의 기존 호환 표시도 Workspace 안에서 통계·필터·계정 작업을 보존한다. 최초 관리자 설정 및 공용 로그인/프로필/계정 설정은 각 인증·공용 surface의 기존 책임을 유지한다.

## 공용 구현

- Workspace는 선택적인 제목·설명·header actions와 페이지 색인을 기존 ContentPageTemplate 슬롯으로 조립한다. `scrollBody`는 폼/운영 본문의 내부 스크롤을 제공한다. 기존 소비처는 기본값을 유지한다.
- DataWorkspace는 같은 제목·설명·header actions를 전달한다. 도메인 검색 컨트롤은 `filterSlot`, 조회 안내는 `statusSlot`으로 주입한다.
- 제목을 선언한 데이터 화면은 모바일에서 검색 조건을 기본 접힘으로 시작한다. 펼친 조건은 최대 28dvh 안에서 스크롤되어 목록을 밀어내지 않는다. 접기/펼치기는 사용자가 제어한다.
- 공통 목록은 DataGrid를 사용한다. Admin은 `fitViewport`를 선택해 페이지 크기만큼 최소 높이를 강제하지 않고 본문만 스크롤한다. 열 최소 폭과 작업 영역을 보존해 좁은 화면에서 글자를 한 글자씩 줄바꿈하지 않는다.
- 페이지 이동은 조회 중 비활성화할 수 있다. 이력은 기존 snapshot 시점을 유지해 페이지 이동하고 새로고침 시 기준 시점을 갱신한다.
- 제목은 공용 PageHeader 한 곳에서 생성한다. `wrapContent`를 사용하는 관리 화면은 좁은 화면에서도 설명·작업 버튼이 줄바꿈된다.
- 메뉴와 경로는 같은 navigation 정의를 사용한다. 개별 경로 문자열이나 기본 ‘설정’ 경로로 관리 프로그램을 표시하지 않는다.
- 소속·이용권·공통 권한·이력의 목록 및 편집 로직은 독립 화면과 사용자/조직 상세에서 공유한다. 조회·변경 API와 권한 규칙은 변경하지 않는다.

## 검증 계약

`verify-admin-program-navigation.mjs`는 17개 메뉴 목록과 일치하는 recipe 목록을 검사한다. JSX AST로 실제 recipe 사용, 로컬 h1 부재, 운영 화면의 Settings 오용 방지와 메뉴 기반 한글 경로를 검사한다. `verify:ssoo-frame`에 연결해 공용 MDI adapter만 사용하고 최종 화면 조립을 빠뜨리는 회귀를 차단한다.

브라우저 증거는 `output/playwright/admin-template-implementation-20261105/`에 기록한다. 17개 전체에서 데스크톱·모바일의 단일 제목, 경로, template 종류, 본문/표 스크롤, 주요 작업의 접근성과 실제 폼·탭·진단·이력 흐름을 확인한다. 정상 조회의 HTTP/proxy/console 오류와 의도된 오류 주입은 구분한다.

## 최종 검증 결과

- 기존 Admin 컨테이너를 재빌드하여 `http://localhost:3000`에 반영했다. 추가 앱 서버나 포트를 만들지 않았다.
- `audit-verified.txt`: 17개 × 데스크톱 1440×1000·모바일 390×844 = 34개 화면 검사 통과. 단일 제목, 한글 경로, 지정 recipe, 본문 공간, 페이지 가로 넘침을 검사하고 전체 스크린샷을 검토했다. 정상 실행 중 HTTP 오류·브라우저 실행 오류·콘솔 오류는 0건이다.
- `flows-verified.txt`: 17개 프로그램의 검색·빈 상태·등록/편집/계정 복구 폼 진입·앱 링크·권한 진단·신청 상세·이력 비교·메일/AI 상세 진입을 모두 통과했다. 이 검증은 화면 전환과 조회 동작에 대한 것으로 실제 승인·회수·복구·외부 발송을 수행했다는 의미는 아니다.
- 모바일에서 검색 조건이 목록 높이를 소진하는 문제를 발견하여 기본 접힘과 펼침 영역 최대 높이를 적용했다. 펼친 이력 기간 조건과 모바일 소속 배치·계정 복구 창도 확인했다.
- 목록 조회에 503 오류를 주입해 공용 오류 안내를 확인하고, 오류 주입 해제 후 ‘다시 시도’로 실제 데이터 조회가 복구되는 것을 확인했다.
- `extras-verified.txt`: 모바일 추가 조건·폼, 사용자 상세 내부 소속/이용권 공용 목록, 오류 재시도, 대시보드·내 소속·서비스 이용·사용자 호환 화면까지 추가 검사 9건을 통과했다.
- 상세창 스크린샷 검토에서 사용자 소속/이용권 표가 팝업의 암시적 grid 열을 확장하는 문제를 발견했다. 기존 조직·이력 상세와 같이 단일 `minmax(0, 1fr)` 열을 지정한 후 재배포했다. `dialog-width.txt`의 데스크톱·모바일 × 소속·이용권 4건에서 팝업 가로 넘침 0과 표 너비를 확인했다.
- Admin lint·타입 검사, web-shell 빌드, 프레임/17개 recipe 회귀, 입력 40개·공용 UI 소비·스타일 경계, 문서·Codex 동기화·preflight 검사를 통과했다.
- `codex:platform-guard`: 서버와 Admin/CRM/PMS/DMS/SNS 검사 통과. 서버 테스트 114 suites / 872 tests 통과. 테스트 종료 시 기존 worker teardown 경고가 출력되어 테스트 성공과 별도로 기록한다.

## Changelog

- 2026-11-05: 17개 전수 적용 기준과 공용 recipe 확장, 연결 패널 재사용·회귀 검증 계약 기록.
