# Changelog

* **web, docs:** 2026-09-23 승인된 공용 로그인 옵션·검색 결과 표현·상단 검색 배치와 문서관리 설정·작은 화면 대화 도구 보완을 현재 작업 기준으로 묶었다. [문서관리 최신 핸드오프](dms/planning/2026-09-23-assistant-history-layout-handoff.md)와 [로컬 Docker 배포 기록](common/explanation/architecture/2026-09-23-local-docker-handoff.md)을 따른다. 기존 개발 데이터 유지, 다섯 서비스 실제 접속 확인 완료. 권한 관리 요약 카드 줄바꿈과 검색창 배경 차이 잔여는 해결로 집계하지 않는다.

* **docs:** 2026-09-18 승인-06 [운영 출시 입력·실행 준비](common/explanation/architecture/2026-09-18-production-launch-inputs.md) 정리. 출시 검사 도구 7종 자체 검사 통과, 실제 설정 파일 부재·미커밋 작업본으로 운영 검사 차단 확인. 제품 변경·배포·신규 승인 0, 21완료·1잔여·운영 증거 0/5 유지.

* **dms, web-shell, docs:** 2026-09-18 승인-15 문서 도식·휴대폰 도구 보완 완료. 네 종류/네 표시 경로·원문/검색·저장/재조회·실패 복구·좁은 화면 도구 배치를 검증했다. 기존 업무 11/11·다섯 웹 빌드·필수 검사 통과. 공용 배치는 문서관리만 선택 적용. [핸드오프](common/explanation/architecture/2026-09-18-document-diagram-handoff.md) 기준 **21완료·1잔여·운영 증거 0/5**.

* **dms, docs:** 2026-09-17 [다이어그램 승인안](dms/planning/2026-09-17-diagram-approval-proposal.md)을 준비했다. 읽기·미리보기·인쇄에서 두 도식이 글로 표시되고 작은 화면 도구가 겹치는 현상을 재확인했다. 제품 미변경·신규 승인 0·추가 완료 0, 20/22 완료·2잔여·운영 증거 0/5 유지.


* **pms, server, database, types, docs:** 2026-09-17 사용자 승인-13 프로젝트 사용 설정 완료. 계정별 네 옵션 4/4, 별도 설정 진입·세 보기·완료 작업 표시·담당자 지정·배정/이슈 알림과 저장 실패 복구 구현. 서버 15/15·실제 요청 21/21·큰 화면/휴대폰·기존 업무 6/6·설치/복원·서버/다섯 웹 빌드 통과. 검증 데이터 정리 완료, 문서관리 계약 보존. [핸드오프](common/explanation/architecture/2026-09-17-project-settings-handoff.md) 기준 **20완료·2잔여·운영 증거 0/5**.

* **docs:** 2026-09-17 승인-13 [프로젝트 사용 설정 적용안](pms/planning/2026-09-17-settings-approval-proposal.md) 준비. 두 화면 크기·직접 진입·새로고침과 네 옵션 반영 누락을 재확인하고 구체적 화면/알림/사용자별 저장 범위를 정리했다. 제품 미변경·신규 0·추가 완료 0, 19완료·3잔여 유지.

* **web-auth, docs:** 2026-09-17 기존 알림 연결 오류를 재현하고 스트림의 이전 본문 길이·압축·전송 정보를 제거했다. 기존 화면·데이터 계약·재시도·파일 다운로드 보존. [검증 기록](common/explanation/architecture/2026-09-17-notification-stream-handoff.md)에 재접속·만료·기존 문서 업무와 통합 검증 결과를 기록한다. 승인 집계 19완료·3잔여·운영 증거 0/5 유지.

* **crm, server, database, types, docs:** 2026-09-17 승인-01 후속 단순 내부 승인 완료. 실제 한 명 지정·요청·본인 승인/반려·철회·이력과 원본/권한 검증. 서버 41/41·실제 요청 19/19·데이터 제약 4/4·두 계정/세 크기·기존 회귀 6/6·설치/복원·서버/다섯 웹 빌드 통과. 문서관리 기존 화면·연동 유지. [핸드오프](common/explanation/architecture/2026-09-17-contract-internal-approval-handoff.md) 기준 19완료·3잔여·운영 증거 0/5.

* **crm, dms, server, docs:** 2026-09-17 사용자 선택 승인-01의 1번 범위 완료. 자동 생성 기록 안내와 역할별 건수·생성 시각 표시, 새 기록 문구를 보정했다. 요청/응답·상태값·기존 기록 보존, 작은 계약 화면의 안내 줄바꿈 확인. 서버 27/27·실제 대조 13/13·세 크기·기존 고객관리 2/2·문서관리 4/4. [핸드오프](common/explanation/architecture/2026-09-17-contract-records-handoff.md) 기준 19완료·3잔여, 실제 담당자별 결재 미구현·운영 증거 0/5. 알림 연결 오류 별도 관찰은 다음 내부 점검 대상으로 기록했다.

* **docs:** 2026-09-17 기존 승인-01의 [계약 승인 처리안](common/explanation/architecture/2026-09-17-contract-approval-review.md)을 구체화했다. 역할별 자동 기록과 실제 담당자별 결재를 구분하고 두 범위의 승인·검증 조건을 정리했다. 제품 미변경·신규 0·추가 완료 0으로 18완료·4잔여·운영 증거 0/5 유지.

* **sns, server, docs:** 2026-09-17 승인된 링크·이미지 첨부 완료. 입력·미리보기·게시·확대·권한과 실패 복구·중복 방지·파일 정리 검증. 서버 44/44·실제 요청 41/41·저장 4/4·세 크기·기존 고객관리/문서관리 6/6. [핸드오프](common/explanation/architecture/2026-09-17-post-attachments-handoff.md) 기준 승인-05 전체 완료, 18완료·4잔여·운영 증거 0/5.

* **sns, server, docs:** 2026-09-17 사용자 승인-05 중 공유 창·복사·게시물 보기·권한/실패 복구 완료. 새 서버/커뮤니티 빌드, 서버 19/19·실제 요청 21/21·세 크기와 계정/탭·기존 영업 2/2·문서 4/4 검증. [핸드오프](common/explanation/architecture/2026-09-17-post-sharing-handoff.md) 기준 공유 완료/첨부 2개 미완료, 전체 17완료·5잔여·운영 증거 0/5.

* **docs, sns:** 2026-09-16 승인-05 [공유·첨부 승인안](sns/planning/2026-09-16-share-attachments-proposal.md) 준비. 현재 미구현과 공유 우선 범위·첨부 후속 승인을 구분. 두 크기의 첨부 버튼 미연결 재현 4/4이며 기능 통과가 아니다. 제품 미변경·신규 0·추가 완료 0, 17완료·5대기·운영 증거 0/5 유지.

* **shared auth, server, testing, docs:** 2026-09-16 승인-22 이전 로그인 유지 토큰 재사용 차단 완료. 전체 토큰 비교·고유 발급·단일 교체와 기존 세션 1회 재로그인, 동시 복원·이동/로그아웃 충돌·문서 다운로드 보완. 서버 42/42·공용 41/41·최종 새 서버/다섯 웹 빌드·실제 브라우저·고객관리 2/2·문서관리 4/4 검증. [핸드오프](common/explanation/architecture/2026-09-16-token-replay-handoff.md) 기준 17완료·5대기·실제 운영 증거 0/5.

* **shared auth, server, types, testing, docs:** 2026-09-16 승인-09 정상 비로그인 처리 완료. 세션 쿠키 부재만 명시적 비로그인으로 구분하고 상태 정리·보호된 파일 거절·기존 오류와 화면을 보존했다. 서버 21/21·공용 상태/중계 26/26·새 서버/다섯 웹 빌드·다섯 서비스 실제 브라우저·고객관리 2/2·문서관리 4/4 통과. 이전 토큰 재사용과 빠른 로그아웃 경쟁은 승인-22 검토안으로 남겼다. [핸드오프](common/explanation/architecture/2026-09-16-anonymous-session-handoff.md) 기준 16완료·6대기·실제 운영 증거 0/5.

* **server, testing, docs:** 2026-09-16 승인-21 답글 원문 일치 검사 완료. 잘못된 원문 4종 거절·저장 0건, 정상 요청/화면 저장과 기존 업무 회귀 통과. 관련 서버 16/16·새 서버 빌드·다섯 웹 빌드 불변. [핸드오프](common/explanation/architecture/2026-09-16-reply-parent-handoff.md) 기준 완료 +1·신규 0, 15완료·6대기·운영 증거 0/5.

* **sns, server, testing, docs:** 2026-09-16 승인-04 댓글 열람·일반 작성·입력 보존·실패 복구·권한 구분과 활성 댓글 집계 완료. 관련 서버 8/8·새 서버/커뮤니티 빌드·브라우저 8묶음·고객관리 2/2·문서관리 4/4 통과. [핸드오프](common/explanation/architecture/2026-09-16-comments-handoff.md) 기준 완료 +1·신규 답글 원문 연결 문제 +1로 총 21항목·14완료·7대기. 운영 증거 0/5 유지.

* **sns, testing, docs:** 2026-09-16 사용자 승인-03 게시판 생성 완료. 입력·취소·중복/실패 재시도·목록 재조회·생성 확인 링크·권한 거절을 연결하고 기존 상세·프로필·문서 업무를 보존했다. 입력 8/8·새 커뮤니티 빌드·실제 브라우저 6묶음·고객관리 2/2·문서 업무 4/4 통과. [핸드오프](common/explanation/architecture/2026-09-16-board-creation-handoff.md) 기준 완료 +1·신규 0으로 13완료·7대기·운영 증거 0/5.

* **web-auth, testing, docs:** 2026-09-16 사용자 승인-20 공용 프로필의 변경 직후 표시 갱신 완료. 관련 조회만 새로 읽고 늦은 응답이 최신 화면을 덮지 않도록 보완했다. 요청 검사 7/7·다섯 새 빌드·15개 실제 브라우저 실행 묶음·고객관리 2/2·문서 업무 4/4 통과. 기존 화면·공개 계약·문서 업무 보존. [핸드오프](common/explanation/architecture/2026-09-16-profile-refresh-handoff.md) 기준 완료 +1·신규 0으로 12완료·8대기·운영 증거 0/5.

* **server, web-auth, docs:** 2026-09-15 사용자 승인-19 공용 프로필의 비활성 상태 반영 완료. 조회·저장 거절, 기술 관계/원본 활성 조건과 재조회 404 후 이전 표시 제거를 적용하고 기존 활성 프로필 저장·문서 업무 계약을 보존했다. 빠른 팔로우 저장 후 표시 잔존은 신규 승인-20으로 분리했다. 다섯 서비스 새 빌드·실제 화면·계정 전환, 서버 15/15·실제 요청 8/8·고객관리 2/2·문서 업무 4/4 통과. [핸드오프](common/explanation/architecture/2026-09-15-profile-state-handoff.md) 기준 완료 +1·신규 1로 11완료·9대기, 실제 운영 증거 0/5.

* **sns, server, docs:** 2026-09-15 승인-02 전문가 검색 완료. 이름·소개·기술 조회, 실제 분류·결과·페이지·프로필 이동·오류 복구·사용자 범위를 검증했다. 기존 응답 필드와 DMS/공용 프로필 구현은 보존한다. 공용 프로필 비활성 상태 문제를 승인-19로 추가했다. [핸드오프](common/explanation/architecture/2026-09-15-expert-search-handoff.md) 기준 완료 +1·신규 +1로 10완료·9대기·운영 증거 0/5.

* **pms, dms, testing, docs:** 2026-09-15 승인-18 검색 직접 접속·로그인 복귀·새로고침/필터 복원과 프로젝트 동일 사용자 탭 보존을 완료했다. 문서관리 기존 루트·빈 입력·문서 업무·권한·서버 계약은 보존한다. 두 앱 새 빌드·보존 검사·관련 회귀 20/20·실제 브라우저를 확인했다. 구현 중 반복 갱신/빈 입력 보정과 요청 제한 실패 원본을 남겼다. [핸드오프](common/explanation/architecture/2026-09-15-search-entry-handoff.md) 기준 완료 +1·추가 0, 9완료·9대기·운영 증거 0/5.

* **admin, pms, sns, dms, testing, docs:** 2026-09-14 사용자 승인-17로 네 서비스 통합 검색의 좁은 작업공간에서 결과를 먼저 표시한다. 기존 공용 선택값 한 줄씩만 지정하고 패널 조작·넓은 배치·문서 업무·검색/저장 계약을 보존했다. 다섯 앱 새 빌드·최종 관련 회귀 15/15·직접 브라우저를 확인했다. 최초 실패와 미해결 검색 주소/복원은 승인-18로 분리했다. [최신 핸드오프](common/explanation/architecture/2026-09-14-service-search-panel-handoff.md) 기준 총 18항목 중 8완료·10대기, 실제 운영 증거 0/5다.

* **crm, web-shell, testing, docs:** 2026-09-14 승인-16으로 고객관리 검색에서 작업공간이 부족하면 결과를 먼저 표시하도록 기존 공용 접기 선택값을 연결했다. 공용 기본값·다른 앱·문서관리 동작을 보존하고 다섯 앱 빌드·고객관리 회귀 7항목·문서관리 관련 회귀 3항목·실제 브라우저를 확인했다. 최초 로그인 제한 실패 1건은 보존하고 별도 재실행 통과를 기록했다. [최신 핸드오프](common/explanation/architecture/2026-09-14-crm-search-panel-handoff.md). 다른 네 서비스 같은 관찰은 승인-17로 추가해 17항목 중 7완료·10대기, 운영 증거 0/5다.

* **crm, testing, docs:** 2026-09-14 사용자 승인-08로 통합 검색 직접 접속·새로고침의 기존 검색 화면 연결을 복구했다. 검색어·필터·탭 구분·한도 처리를 보존하고 새 고객관리 빌드·검색 회귀 2/2·기존 회귀 4/4·두 크기 직접 브라우저를 통과했다. 작은 화면 보조 영역 가림은 별도 승인-16으로 등록했다. [최신 핸드오프](common/explanation/architecture/2026-09-14-crm-search-route-handoff.md) 기준 16항목 중 6완료·10대기, 실제 운영 증거 0/5다. 문서관리·공용 화면·서버 계약은 이번에 변경하지 않았다.

* **crm, testing, docs:** 2026-09-14 사용자 승인 후 열린 탭 16개 한도에서 현재 입력과 화면을 유지하고 안내·주소 복구를 적용했다. 기존 탭 선택·닫기 후 재시도·방문 기록·직접 접속/새로고침을 두 크기로 확인했다. 새 고객관리 빌드, 탭 회귀 2/2와 기존 입력/저장 회귀 2/2 및 직접 브라우저 통과. [최신 핸드오프](common/explanation/architecture/2026-09-14-crm-tab-limit-handoff.md)에 입력 연결 완료 / 탭 한도 문제 완료를 구분하고 총 5완료·10승인 대기로 갱신했다. 문서관리·다른 서비스 제품과 업무 저장 계약은 유지했다.

* **crm, testing, docs:** 2026-09-14 사용자 승인-11 중 영업기회 다중 탭 입력 연결을 보정했다. 기존 화면별 연결을 재사용하며 배치·필수 조건·선택지·저장·확정 잠금을 유지했다. 새 고객관리 빌드와 클릭 36/36·등록 2건·수정 1건·기존 필수 입력을 포함한 두 크기 회귀 2/2를 통과했다. [처리 결과](common/explanation/architecture/2026-09-14-crm-input-binding-handoff.md)와 다음 탭 한도 승인안을 분리했다. 총 4완료·1부분 완료·10대기이며 문서관리 제품·다른 서비스 제품은 이번에 변경하지 않았다.

* **crm, admin, pms, scripts, docs:** 사용자 승인-14로 크기 전환 시 본문 틀을 유지해 미저장 입력·열린 창·태스크 선택 초기화를 보정했다. 새 빌드 반복 전환 24회·실제 등록/재조회 6건·기존 초안 4건·권한 거절 3건 및 기존 필수 입력 회귀 2건을 통과했다. 재발 검사와 [핸드오프](common/explanation/architecture/2026-09-11-launch-approval14-handoff.md)를 추가했다. 기존 화면·저장 계약·DMS 제품을 보존했다. 다중 탭 입력 이름 연결은 승인-11로 남기고 총 4완료·11대기, 운영 출시 증거 0/5다.

* **crm, testing, docs:** 사용자 승인-12에 따라 기본 영업기회 등록의 예상계약기간 뒤에 다음 행동 필수 입력을 추가하고 계열구분의 필수 표시·입력 검사를 맞췄다. 기존 작업공간과 같은 입력·저장 연결을 재사용하며 서버 계약·문서관리 동작은 유지한다. 실제 누락 검사·저장·수정·오류 표시·확정 잠금 회귀를 추가했고 최종 빌드·관련 서버 171건·기존 데이터 표시를 포함한 두 크기 브라우저 4건이 통과했다. 여러 양식 탭을 함께 열어도 이번 두 항목의 이름과 입력이 올바르게 연결되도록 화면별 고유 식별자를 사용한다.

* **crm, testing, docs:** 승인-07에 따라 영업기회·계약 주요 화면이 시험용 이름의 데이터만 표시하던 세 제한을 제거했다. 기존 서버 조회·권한·최신 차수·확정 조건을 보존하고, 일반 식별자의 원장 데이터로 목록·검색·상세·집계·계약서 대상·청구 대상을 확인하는 실제 브라우저 회귀 검사를 추가했다. 새 CRM 빌드·관련 서버 테스트 171건·실행 검사 11건·1440px/390px 회귀가 통과했다. 다른 승인 항목과 DMS 제품 계약은 변경하지 않는다.

* **docs, launch:** 9월 11일 검증 결과와 승인 대장을 14항목으로 동기화했다. 검증 당시 작업본의 통합 45/45·핵심 상태 83/83·DMS 회귀 12/12 통과와 운영 패키지 검사 실패·실제 운영 증거 0/5를 구분한다. 영업관리·관리·프로젝트의 화면 크기 전환 시 미저장 입력 소실은 승인 후 수정 대상이며 제품에는 적용하지 않았다. 최종 결과 정리로 바뀐 세 문서와 이전 검증 작업본을 별도 비교 기록에 남긴다.

* **testing, launch, docs:** DMS 회귀 검사가 이전 검색 문구와 루트 새로고침 뒤 문서 자동 활성화를 전제로 중단되는 점을 재현했다. 검사 세 파일만 현재 공용 검색 이름, 기존 문서 탭의 명시 선택, 검증 전용 기본 주소를 사용하도록 맞춘다. DMS 화면·사용 방식·API는 변경하지 않는다. 기본 영업기회 등록의 필수 항목 불일치도 실제 저장 오류로 재현해 승인 대장에 추가하며, 검사 코드 변경 이후 최종 작업본 검증을 다시 준비한다.

* **crm, docs:** 같은 최소 너비 문제가 영업기회 작업공간 양식에서도 920px 폭으로 재현되어 기본 양식과 작업공간 양식 두 곳에만 폭 보정을 적용했다. 탭 한도 뒤 주소·본문 불일치는 별도 승인 후보로 기록하고, 이후 검사 결과는 작업본 지문을 바꾸지 않는 실행 증거 보고서에 분리한다.

* **crm, launch, docs:** 모바일 영업기회 등록 양식이 내부 표의 최소 너비를 따라 화면 밖으로 늘어나는 현상을 브라우저에서 재현하고, CRM 양식의 최소 너비만 보정했다. 일반 업무 데이터 제외·통합 검색 직접 접속·운영 의존성 검사 실패는 사용자 승인 대장에 분리했으며 DMS 화면·API 계약과 공용 UI는 변경하지 않았다. 새 빌드·브라우저 검증 전이므로 수정 완료 및 출시 가능을 선언하지 않는다.

* **launch, docs:** 2026-09-11 전 서비스 출시 준비 5단계 Ralph 실행 계획과 별도 사용자 승인 대장을 추가했다. DMS 검수 완료 화면·사용 방식·API 계약과 모든 서비스의 사전 승인 경계를 고정하고, CRM의 명백한 미정리 화면만 기존 기능·계약 보존 범위에서 선행 정리한다. 기존 서버는 설정·이미지 변경 없이 재시작해 준비 상태를 복구했으며, 과거 기능 검증과 현재 화면·운영 출시 검증은 구분한다.

* **crm, web-admin, web-dms, docs:** GitLab 의도 보존 통합·양 원격 게시 뒤 기능/운영 회귀 기준선과 사용자가 제기한 UI 실사용성 문제를 분리한 handoff를 추가했다. 기존 strict demo 45/45와 OPS 폐쇄 기록은 회귀 하한선으로 보존하되 UI 다듬기는 미착수 0%로 재분류하고, 원천 17화면과 CRM 확장·Admin/DMS 연결 화면의 전수 결함 원장, 1440×1000·1366×768·390×844 브라우저 flow, Behavior Impact Gate, 순차 `web-ralph` 완료 조건을 고정했다.

* **dms, ci, docker, docs:** GitLab `development`의 WS-021/022와 exact-SHA 배포·rollback·BuildKit 복구 변경을 현재 SSOO 정본에 의도 보존형으로 통합하기 위한 Ralph 계획을 확정했다. 현재 Admin/CRM/PMS/DMS/SNS 포트, Node 22.13+/pnpm 11.13.1, Docker secret/cache/runtime role, CRM strict demo, DMS shell 내 empty/error/retry 동선을 불변식으로 두고 merge commit과 publish 전에 정적·build·server·CI·CRM 45/45·desktop/mobile 브라우저 gate를 모두 통과하도록 차단한다.

* **crm, scripts, docs:** 현재 작업본의 데모 100% 판정을 `verify:crm-current-demo` 단일 strict gate로 재구성했다. 격리 DB의 실제 auth/profile·영업기회/견적·계약/청구·사업계획/실적·원가/보고를 실행하는 core runtime verifier, server/CRM/Admin/DMS live PID와 current build artifact fingerprint를 기록하는 runtime manifest schema 2, SRC 28점·UX 17점의 exact one-to-one executable mapping과 stale/partial/forged 음성 self-test를 추가했다. 기본 `verify:crm-migration-completion`은 더 이상 정적·로컬 PASS만으로 완료를 선언하지 않고 이 strict gate에 위임한다.

* **crm, scripts, docs:** 기존 strict demo 45/45 산정을 재감사해 문서상 폐쇄 원장과 현재 revision 증명을 분리했다. tracked/untracked 실제 파일 경로·형식·실행 비트·내용 SHA-256을 묶는 worktree identity를 추가하고, CRM local report와 target UI/UX manifest를 schema 2로 올려 시작·종료·검증 시점 identity가 다르거나 기존 schema 1 증거이면 fail-closed 처리한다. 기존 S12 17화면·83상태와 BT 실행 기록은 역사 증거로 보존하되 같은 identity의 fresh DB/API/browser runtime report까지 다시 통과하기 전에는 현재 revision 45/45를 선언하지 않는다.

* **crm, scripts, docs:** CRM S15 browser evidence를 schema 3으로 올리고 제출자가 적던 surface `assertions: true`를 금지했다. API evidence의 CRM/DMS snapshot ID·source·ready/0 blocker/0 degraded/유효시간을 검증해 CRM/Admin/DMS 접근성 snapshot의 실제 문구 및 반복 횟수와 결합하고, 두 browser run에서 seller CI endpoint 200 요청과 preview/print의 접근 가능한 CI image를 직접 확인한다. 수동 assertion 위조, CI 요청·image 누락, snapshot identity 불일치, Admin readiness card 누락 음성 fixture를 추가했다.

* **crm, scripts, docs:** CRM S15 final browser evidence를 schema 2로 강화했다. 모든 browser/DMS evidence 파일은 manifest 기준 상대 경로와 real evidence root 안에 있어야 하며 absolute/`..`/symlink 이탈과 파일 재사용을 거부한다. 각 PNG의 IHDR를 desktop 1440×1000 또는 mobile 390×844와 exact 비교하고 두 run의 network log에 CRM/Admin/DMS production origin이 모두 있어야 한다. production quote의 subtotal-discount-total 산식을 검증하고 preview/print snapshot 및 실제 PDF parser·DOCX ZIP/XML에서 법인·고객·영업기회·담당자·금액과 unresolved placeholder 0을 직접 산출한다. path/symlink/viewport/origin/금액 산식/artifact content 음성 self-test를 추가했으며 실제 EXT-01/02와 production evidence가 없어 Goal은 계속 active다.

* **crm, scripts, docs:** 사용자 제공 CRM prototype의 동일 이름 중첩 다운로드 구조를 직접 재현해 `CRM_SOURCE_PROTOTYPE_DIR` 공용 resolver를 추가했다. entry file이 직접 있는 앱 루트 또는 sibling 없는 단일 wrapper만 허용하고 다중 후보·sibling 혼합은 거부한다. capture와 goal-contract가 같은 해석을 사용하며 direct/wrapper/ambiguous negative self-test 및 실제 상위 제공 경로의 45/45 전체 계약 PASS를 확인했다.

* **crm, scripts, ci, docs:** CRM S15의 API 준비 증거와 최종 런칭 증거를 분리했다. `verify:crm-go-live`는 이제 `PASS_LIVE_API_READY`, `finalGoLive: false`, `browserRequired: true`만 기록한다. 새 `verify:crm-go-live:final`은 같은 deployment/release/API evidence와 DMS 5-track FINAL GO에 24시간 이내 서로 다른 fresh Playwright CLI desktop/mobile context의 12개 고유 snapshot/PNG, 실패·overflow 0, logout/session 삭제, 실제 견적 PDF·DMS DOCX/PDF binary·size·SHA-256·seller/CI hash를 결합한 경우만 `CRM-S15-FINAL-GO-LIVE` PASS를 낸다. synthetic/mobile 누락/console error/CI mismatch/DMS NO_GO negative self-test를 preflight와 PR validation에 연결했다. 실제 EXT-01/02와 production evidence는 아직 없어 Goal은 active다.

* **crm, scripts, ci, docs:** CRM S15 외부 입력 인수와 실환경 런칭 판정을 자동화했다. 승인 법인정보·owner·CI PNG/JPEG/GIF/WEBP binary의 MIME/size/SHA-256을 credential 없는 packet으로 고정하고, 기존 production env gate 뒤 live API/database readiness, CRM/Admin/DMS release identity, seller field·CI hash, CRM/DMS owner와 Admin bridge ready/blocker 0을 한 세션에서 확인한 뒤 logout하는 `verify:crm-go-live`를 추가했다. evidence는 `credentialsStored: false`이며 packet의 password/token/secret/API key/connection string key를 fail-closed로 거부한다. in-memory positive/negative self-test를 preflight와 PR validation에 연결했다. 실제 EXT-01/02 값과 production browser 증거는 제공 전이므로 Goal은 active다.

* **crm, database, server, web-admin, web-dms, scripts, docs, instructions:** CRM Phase 2 S12~S14 최종 검증을 폐쇄했다. REF-01 17개 화면·83개 상태의 source/desktop/mobile 구조·interaction·content visual diff와 browser E0, 견적 원천 금액·CI·담당자·인쇄 PDF·DMS DOCX/PDF를 통과해 SRC 28/28, UX 17/17, strict demo 45/45를 달성했다. BT-24 clean/populated/failed migration rollback·exact restore는 launch migration 10개·trigger 82개·drift/residue 0, BT-25는 CRM 23 suite·171 test·4개 production build·5 OpenAPI 문서 458 operation·security high/critical 0, BT-26은 격리 DB/runtime/process 파기 후 residue 0을 기록해 OPS 17/17을 달성했다. 원천 견적 스타일은 metadata가 필수인 좁은 source-fidelity 경계로 보존하고 정적 guard·규칙 정본을 동기화했다. 실제 런칭은 EXT-01 법인값/CI와 EXT-02 production endpoint/credential 적용 전까지 active로 유지한다.

* **web-shell, automation, docker, docs, instructions:** 검색 입력 autofill 무결성 검증을 Admin/CRM/PMS/DMS/SNS 고정 5앱 계약으로 재통합하고 앱 선택·CRM 제외 실행 분기를 제거했다. 제품 차단식은 특정 `admin` 값이나 앱을 판별하지 않는 값-불문 계약으로 유지하고, 계정명·사번형·점 포함 ID·이메일형·한글 후보를 self-test와 Chromium native autofill 실패주입에 분산해 특정 자격증명 값에 결합되지 않음을 검증한다. CRM 15개 입력은 전수 정적 inventory와 공용 shell/대표 계약 GET query·reload 브라우저 흐름으로 나머지 네 앱과 같은 gate에 포함한다. 최신 5앱 production 이미지 build·동시 recreate·health, 자동 Playwright 2 tests, CLI desktop/mobile와 DMS guard를 통과했으며, 당시 전역 preflight에서 분리된 CRM 견적서 스타일 경계 32건은 이후 source-fidelity metadata 예외로 폐쇄했다.

* **web-shell, web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, automation, scripts, ci, docs, instructions:** 검색 입력·autofill 무결성 2차 Ralph 구현을 적용했다. 목적 중립 `Input`은 유지하고 공용 DataWorkspace·PMS page filter의 동적 text renderer와 CRM 계약청구실적 검색까지 포함한 36개 header/sidebar/DataGrid/viewer/화면별 검색·filter·lookup을 `SsooSearchInput`의 stable signature, search semantics, password-manager hint, native autofill state 수용 guard로 이관했다. 공용 로그인/재설정/비밀번호 변경과 Admin 관리 대상 사용자/Client Secret의 credential signature를 분리했으며, 비제어 검색의 URL·탭 소유 `defaultValue` 변경도 DOM과 guard 기준값에 동기화한다. `verify:input-intent`의 AST inventory·raw 우회·빈 signature·예약 credential 충돌·credential contract·문서 수량·브라우저 증거 계약을 build/preflight/push guard/PR validation에 연결하고, 동적 signature는 공용 runtime assertion이 같은 canonical validator로 fail-closed 한다. `test:e2e:input-intent`로 5앱 공용 10필드와 앱별 대표 5필드의 Chromium native autofill 실패주입, 대표 5필드 `390×844` 한글 입력·overflow, 의도적 입력·CRM URL submit/reload를 반복 검증한다. DMS 대표 검색은 루트 셸을 보존하는 홈 `AI 검색` MDI 동선을 사용하며 화면별 query state·GET URL·API·Enter·clear·lookup 동작은 유지한다.

* **docs, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns:** 저장 로그인 자격증명이 검색 입력에 주입되는 결함을 SSOO 전체 플랫폼 관점에서 재분류했다. 공용 검색 의미 계약과 비의도 autofill state 수용 차단을 이중 방어선으로 두고, 5앱의 화면별 검색·필터 로직은 유지하면서 입력 표면만 이관하는 1차 Ralph 설계, 정적 재발 gate, persistent-profile desktop/mobile 브라우저 수용 명세를 정본화했다. 제품 코드 적용은 설계 승인 후 2차 `web-ralph`로 분리했다.

* **scripts, docs, crm:** CRM S12 시작 감사에서 goal-contract가 REF-01 hash와 문서 UX 상태만 확인하고 실제 target source/desktop/mobile 상태 쌍을 강제하지 않던 gap을 폐쇄했다. `CRM_TARGET_UIUX_MANIFEST` 기반 `verify:crm-uiux-parity`와 최종 `:all` gate를 추가해 모든 필수 state의 고유 capture, 구조·interaction·content visual diff, 허용 차이 분류, browser E0 없이는 UX `완료`를 인정하지 않는다. REF-01의 17개 화면·source 필수 상태 81개를 독립 초기화 capture로 확장하고 상태 ID 완전성도 goal-contract에 연결했다. target pair가 없는 현재 UX 수치는 0/17로 유지한다.

* **web-crm, web-dms, server, scripts, docs:** CRM Phase 2 S11 production runtime contract를 폐쇄했다. CRM settings alias와 MDI/sidebar URL sync, persisted stale tab, operation source deep link를 보정하고 DMS settings history의 root home 복귀를 URL-first로 고정했다. 종료 점검에서 드러난 reports server→client query helper RSC 오류는 순수 query 모듈로 분리했다. standard와 승인 mapped origin에서 CRM/Admin/DMS login·API·deep link와 Socket.IO frame 송수신, 미승인 origin fail-closed, desktop/mobile E0를 통과해 `SRC-28`, `OPS-01`, `OPS-10`, `OPS-14`, `BT-17`, `BT-23`을 완료 처리했다.

## [Unreleased]


* **server, dms, tests:** 사용자 승인으로 남은 압축 처리 부품을 제거하고 기존 설치 계열의 메모리 처리 부품으로 교체했다. 문서 읽기·생성의 비동기 완료를 내부 저장 호출에 연결하고 검증 도구도 교체했다. 교체 전 합성 문서의 본문·서식·첨부·오류 결과를 회귀 기준으로 고정했다. 최종 감사 0건·서버 492건·캐시 없는 다섯 서비스/서버 빌드·영업/문서 회귀 16건을 통과했다. 실제 양식 업로드·견적 생성/다운로드·편집 첨부 3형식 및 문서 내부 13개 구성의 동등성을 확인했고 검증 자료를 정리했다. 화면·외부 연동 계약은 유지했으며 승인-10 완료로 총 3완료·12대기다. 운영 환경에는 배포하지 않았다.

* **docs:** 사용자 지적에 따라 승인-10의 완료 판정을 정정했다. 잔여 경고 1건의 취약 부품 제거·교체와 문서 동등성 검증을 입력 보존 작업보다 우선한다. 당시 상태는 2완료·1보완 중·12승인 대기였으며, 이후 위 후속 검증으로 잔여 해결을 완료했다.

* **dependencies, instructions, docs:** 사용자 승인-10으로 설치 가능한 공통 보안 의존성 수정과 아래 검증을 수행했다. 이후 잔여 1건 때문에 전체 완료 판정은 철회했다. 운영 감사 38→중간 1건, 치명·높음 0. 스타일 선택자 6.1.3의 기존 hover 규칙 누락을 6.1.4로 보정하고, 캐시 없는 최종 5앱 빌드·실제 CSS 15규칙·서버 482건·영업/문서 브라우저 16건·대표 화면 24상태·실행 검사 11건을 통과했다. DMS 제품 소스·API 계약과 최종 스타일을 보존했다. 수정 미배포 압축 처리 경고와 기존 다이어그램 글 표시는 별도 잔여/승인-15로 기록한다. 이 시점에 보고한 3/15 완료는 위 정정으로 대체하며 실제 운영 증거 0/5는 미해결이다.

### Documentation

* **database, types, server, web-crm, scripts, docs:** CRM Phase 2 S10 failure/recovery/secret masking을 폐쇄했다. attempt에 stable correlation, actor/time, owner/source link, server retryability와 recovery summary를 추가하고 공용 DB transaction 기본값보다 명시적 workflow correlation을 우선했다. HTTP exception/CRM evidence/DMS config·structured log에 recursive credential redactor를 적용했다. 격리 DB에서 actual failure `#6`→DMS 초안으로 원인 수정→retry `#7`, 원본 실패 보존, same correlation, repeat `409`, artifact hash 불변, duplicate 0을 통과했다. 관리자 8개 surface와 viewer/error/Authorization/OpenAPI/UI marker leak 0, desktop/mobile overflow·console error 0, DB/file residue 0을 확인해 `OPS-06`, `OPS-09`, `OPS-12`, `BT-21`, `BT-22`를 완료 처리했다.

* **types, server, web-crm, web-dms, web-admin, scripts, docs:** CRM Phase 2 S9 readiness consistency를 폐쇄했다. CRM/DMS owner에 공용 snapshot identity, 5초 refresh coalescing, 30초 expiry, 설정·재시도 invalidation과 probe failure `unknown/null` 계약을 적용하고 Admin은 owner snapshot만 exact pass-through하도록 변경했다. cache/invalidation unit test와 owner/API/proxy/Admin exact verifier를 통과했으며, desktop/mobile에서 동일 snapshot ID, expiry, refresh 복구, 실제 server 단절 시 두 owner `admin.bridge.unavailable`·null count, 재기동 복구와 console error/warning 0을 확인해 `OPS-04`, `OPS-13`, `BT-19`를 완료 처리했다.

* **database, types, server, web-admin, web-crm, scripts, docs:** CRM Phase 2 S8 permission/sample/AMS slice를 폐쇄했다. 계약·사업계획·원가/AMS·보고·공급자 설정 14 capability를 공용 permission resolver/guard와 UI snapshot에 연결하고 25개 CRM permission을 Admin live catalog로 전환했다. 격리 DB에서 역할 할당 admin 25/manager 21/user 14/viewer 8, 전체 120건의 seed 2회 불변과 원천 표본 6/7/53·5/44/35/5 fixed hash/2회 reseed, source 6→central 8 functional alias를 검증했다. actual API와 fresh role browser context에서 read/write/confirm/settings allow·deny를 확인했고, AMS 업체·복수 WBS·계획/실적 각 24셀 paste·reload·정산 확정 잠금/해제·cascade 삭제와 residue 0을 통과해 `SRC-24~27`, `OPS-03`을 완료 처리했다. 원천 시각 overlay가 남은 `UX-13~14`는 부분으로 유지했다.

* **web-auth, web-ui, web-shell, database, web-admin, web-crm, scripts, docs:** CRM Phase 2 S7 shared substitution을 폐쇄했다. CRM만 opt-in하는 ID-only 저장과 password visibility, 30분 idle session 연장/만료, profile optional field clear, password 변경 시 타 session revoke, Admin user/code/year allow·deny·중복 검증, seller/CI 저장과 견적·원천 계약·확정 계약 DMS 패킷 소비를 actual DB/API/desktop/mobile로 확인했다. 명시적 audit activity가 공통 fallback에 덮이던 결함을 수정하고 auth visibility control을 공용 Button `authIcon` 44px recipe로 옮겼으며, 기본 `/favicon.ico` 요청을 공용 `/ssot-icon.svg`로 연결해 404를 제거했다. 임시 code/year와 session을 정리하고 seller/profile/password를 원복해 `SRC-01~04`를 완료 처리했으며, 실제 운영 법인값 `EXT-01`과 overlay가 남은 `UX-12/15/16/17`은 별도 유지했다.

* **types, server, web-crm, scripts, docs:** CRM 사업계획대비실적에 additive `source-compatible` 모드를 추가해 원천 `app.bp_rpt.js`와 동일하게 확정 사업계획을 계획, 확정 계약 청구계획을 실적으로 비교한다. 기본 `extended-actual`의 계약 청구실적·직접실적·확정 내부원가/AMS 원가 확장은 그대로 보존했다. server/client가 함께 쓰는 query 정규화는 순수 모듈로 분리해 production 직접 URL·강제 새로고침의 RSC 경계도 닫았고 정적 gate는 두 모드의 서로 다른 fallback/actual 계약을 함께 강제한다. 격리 DB에서 의도적으로 다른 청구계획 913,500,000원/535,700,000원과 청구실적 150,000,000원/111,900,000원을 두 API/UI 모드가 정확히 분리했고 desktop/mobile E0로 `SRC-22`를 폐쇄했다. 시각 overlay와 전체 state pair가 남은 `UX-10`은 완료로 올리지 않았다.

* **types, server, web-crm, scripts, docs:** CRM 원천 dashboard/list 호환 분모를 additive하게 이식했다. 최신 영업기회 group과 확정 최신차수를 분리해 확정 매출·이익·이익률, 원천 4상태와 최근 5건을 제공하고, 목록에 고객명 기본 정렬·원천 상태 filter·매출/이익/이익률 정렬·12개 원천 column·inline 이전차수 탐색을 연결했다. source exact DB/API, target unit/build, desktop/mobile production browser로 `SRC-05~07`을 폐쇄했으며 기존 SSOO pipeline/queue/정합 지표는 보존했다. 원천 대비 content overlay와 전체 state pair가 남은 `UX-01~02`는 완료로 올리지 않았다.

* **database, types, server, web-crm, web-dms, docs:** 원천 데모의 확정 최신 영업기회 기반 DOCX 계약서 생성을 별도 흐름으로 이식했다. CRM은 원천 순서 그대로 한글 22개 변수 snapshot과 handoff 원장을 저장하고, DMS는 용도별 active DOCX binary·버전·검토 기록·render·artifact storage를 소유한다. 실제 DB/API에서 admin allow/viewer deny, 저장·재조회, 동일 idempotency key 차단과 DB 불변성을 확인하고, desktop/mobile production browser에서 초안·생성·재다운로드, 치환값 22개·미해결 placeholder 0, console/network failure 0, 390px overflow 0을 검증했다. 기존 contract DMS packet, quote workflow, seller 설정 surface는 보존했으며 실제 법인값·CI는 외부 배포 입력으로 분리했다.

* **server, web-crm, docs:** 원천 영업기회의 계약 회수와 연결 계약 회수 후 확정 해제를 단일 transaction으로 이식했다. opportunity-contract 관계와 affected row를 검증하고 확정 계약 soft-delete, 확정 유지 또는 `proposal` 복구, repeat idempotency, 차수 추가·재전환 복원과 audit activity를 실제 DB/API allow·deny·failure에서 확인했다. desktop/mobile CRM action은 201과 기대 상태를 반환했고, 모바일 상세 action이 52px grid row 아래에서 클릭되지 않던 결함은 기존 화면을 보존한 responsive row 배치로 수정해 실제 hit target, overflow 0, console/runtime error 0과 production build로 검증했다.

* **database, types, server, web-crm, docs:** 원천 계약의 고객 담당자와 사용자 FK 담당자를 nullable `client_contact`/`owner_user_id`로 additive하게 이식했다. 공용 활성 사용자 검증과 canonical 담당자 snapshot을 계약 저장·재조회, PMS/DMS preview와 문서 변수에 연결하고, master/history migration의 deterministic backfill, FK set-null, 이전 app-style insert 호환을 clean+populated DB에서 검증했다. 실제 API의 admin allow/viewer deny/invalid owner와 desktop/mobile 저장·재조회, console/runtime error 0까지 확인했다.

* **server, web-crm, docs:** CRM reports preview/confirm DTO의 optional query/body validation을 global whitelist와 일치시키고 사업년도 범위, region enum, 문자열 길이와 number transform을 명시했다. `/reports?year=2026` 실제 API 200과 desktop/mobile 렌더, console 0으로 기존 400 runtime defect를 폐쇄했다.

* **server, web-admin, web-dms, database, docker, scripts, docs:** DMS 프로덕션 Go-live를 릴리즈 아티팩트/Git SHA, 공개 endpoint/TLS, PostgreSQL+세 runtime root backup→isolated restore, DMS/Admin 브라우저 Ralph의 네 fail-closed 트랙으로 고정했다. server/DMS/Admin에 release SHA를 bake하고 통합 `verify:dms-go-live` report로 판정하며, AI/RAG provider는 `exempted_external_provider`로만 명시적 런칭 예외 처리해 다른 실패를 면제하지 않는다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 공용 로그인 credential submit 중 카드를 유지해 `401` 서버 오류 문구가 화면에서 유실되지 않도록 하고, 성공 navigation을 단일 callback으로 정리했다. protected app bootstrap은 React Strict Mode effect replay에서도 진행 중 blocking auth check의 완료 처리를 이어받아 `/me` 성공 후 domain access hydrate가 멈추지 않도록 보정했으며 `verify:auth-commonization`에 회귀 계약을 추가했다.

* **server, web-dms, database, types, scripts, docker, docs:** DMS SharePoint 저장소 지원을 폐기했다. 저장소 provider 계약은 Local/NAS로 축소하고 Local을 기본값으로 고정했으며 NAS는 실제 mount/gateway 구성 전까지 비활성으로 둔다. 레거시 system/personal 설정을 정규화하는 launch migration, 기본 저장소 root startup 읽기/쓰기 검증, 기본 업로드의 `local://` 출력 및 폐기 provider `400` 거부, 검증 자산의 정확한 local 파일 cleanup을 추가했다.

* **server, api, ci, docs:** Common/PMS/SNS/DMS/CRM 정적 OpenAPI를 실제 하위 컨트롤러까지 생성하고 다섯 도메인의 canonical operation 합집합이 런타임 395개 operation과 일치하도록 정렬했다. 핵심 health/auth/profile/PMS/SNS/DMS/CRM 응답 envelope와 DTO schema를 보강하고, 빈 schema·미해결 ref·중복 operation/operationId·runtime/static drift를 `verify:openapi-contract`와 PR access verification에서 fail-closed로 검사한다.

* **database, security, ci, docs, instructions:** 새 DB를 `prisma/launch-migrations`에서 재현하고 기존 pre-baseline DB는 비파괴 호환 경로로 유지하는 launch baseline 운영 규칙을 문서화했다. CI는 저장소 `.nvmrc`와 `packageManager`를 사용하고 production dependency audit, 문서 검증, CRM 타입 검사·조건부 빌드, launch migration deploy/status를 필수 검증에 포함한다.

* **web-dms, docs, instructions:** DMS 문서 목록 hydrate 계약과 에이전트 작업 게이트를 보강했다. 문서 0건은 오류가 아닌 empty state로 처리하고, 파일 트리 오류 상태에는 `문서 목록 다시 불러오기` retry control을 노출하며, `check:document-hydration-contract`가 retry/empty 계약과 Behavior Impact Gate 문서화를 검증한다.

* **docs/common, docs/dms, docs/crm, docs/pms:** legacy `dms_document_embeddings` 전환 기준을 확정했다. `docs/common/guides/ai-rag-runtime-runbook.md`는 provider-ready workflow green, legacy/common retrieval 비교, rollback, `parallel read/write -> common default -> legacy read disable -> archival/drop` 순서를 기준으로 삼고, provider-ready 증거 전에는 DMS legacy 삭제와 CRM full/SNS residual/Admin adapter production rollout을 금지하도록 정렬했다. PMS와 CRM opportunity는 RDB projection adapter를 먼저 시작하되 vector/RAG production readiness는 같은 provider-ready 증거에 묶는다.

* **docs/common, docs/dms:** AI/RAG runtime smoke runbook을 추가했다. `docs/common/guides/ai-rag-runtime-runbook.md`는 provider-unavailable/ready smoke, legacy local DB repair, `DB_INIT_PRISMA_PUSH_MODE=auto|force|skip` 기준, `prisma db push --accept-data-loss` 금지 원칙을 정본화한다.

* **docs/common, docs/dms, docs/pms, docs/crm:** AI/RAG 설계 점검 결과를 로드맵과 백로그에 반영했다. 도메인 RDB를 원천 정본으로 두고 common AI projection/pgvector/vector retrieval/audit 계층을 얹는 방향을 고정했으며, embedding model 미지정 상태의 provider unavailable fallback, DMS vector/RAG capability gate, DMS runtime smoke 선행 조건, CRM/PMS adapter 후속 확장 순서를 문서화했다.

* **docs/common:** 현 AI/RAG workstream의 LangChain/LangGraph 도입 결정을 고정했다. `AI-RAG-10A`, DMS reference path hardening, CRM/PMS/SNS/Admin adapter expansion 범위에서는 LangChain/LangGraph를 병행 도입하지 않고, custom pipeline + AI SDK provider/model boundary + PostgreSQL pgvector 기준으로 구현한다.

### Features

* **security, dependencies, web:** Next.js가 optional image runtime으로 요청하는 취약한 `sharp <0.35.0`을 `0.35.3`으로 override하고, 더 이상 필요한 install hook이 없는 구버전 `allowBuilds` 예외를 제거했다. Production audit, Admin/CRM/PMS/DMS/SNS build와 Linux native image 변환 smoke를 공개 전 검증 기준으로 고정했다.
* **security, dependencies, server, web, dms, ci:** `adm-zip`을 0.6.0으로 올려 production audit high 취약점을 제거하고 서버 lint의 암묵적 `--fix`를 읽기 전용 검사와 명시적 `lint:fix`로 분리했다. Admin/CRM/PMS/DMS/SNS는 기존 Next 규칙을 보존한 ESLint 9 flat config와 `eslint src`로 전환해 deprecated `next lint`를 제거했고, `pnpm security:audit`와 전체 workspace lint를 다시 통과시켰다.
* **database, docker, ci:** Prisma 6 launch migration config와 재현 가능한 `0_launch_baseline`, Prisma가 표현하지 못하는 JSON·PMS 값 범위 CHECK/부분 고유 인덱스/CRM 계약 히스토리 트리거 migration, 일회용 DB parity verifier, zero-drift 확인 전에는 기존 DB baseline resolve를 거부하는 보호 스크립트를 추가했다. raw SQL seed와 Prisma가 같은 감사 컬럼 계약을 쓰도록 109개 `updatedAt` 필드에 DB `now()` 기본값을 정렬했으며, verifier는 빈 DB deploy/status, master seed 35개, source 78개 + migration-managed 1개 trigger, schema parity를 확인한다. `db-init`은 fresh/launch-managed DB에서 migrate deploy를 사용하고 기존 pre-baseline volume만 보호된 legacy compat 경로를 유지한다.

* **security, dependencies, server, web, docker, dms, instructions, docs:** Node.js 22.13+/Docker Node.js 22 LTS와 pnpm 11.13.1을 기준으로 고정하고 24시간 release-age strict gate, package/version 단위 install-script `allowBuilds`, 관측형 `pnpm security:audit`를 공급망 기준으로 추가했다. NestJS 11, Next 15.5 보안 패치, Axios, DOMPurify, Mermaid, simple-git과 advisory transitive dependency를 갱신하고 서버 spreadsheet extraction을 SheetJS 공식 0.20.3 tarball로 전환했다. DMS/PMS의 미사용 `xlsx`는 제거했으며 production 910 dependencies audit 전 등급 0, peer dependency 0, 서버 build와 44 suite/358 test 통과를 확인했다. JWT 11의 엄격한 타입 계약에 맞춰 JWT secret lookup도 `getOrThrow` fail-closed 경계로 고정했다.
* **docker, security, web, docs:** 로컬 `compose.yaml + compose.local.yaml`과 프로덕션 `compose.yaml + compose.production.yaml`을 분리했다. 프로덕션 gate는 placeholder/중복 auth secret, 비보안 cookie/origin, 잘못된 내부 DB URL, 상대 DMS 저장 경로와 비보안 Git remote를 값 노출 없이 거부하고, DB 포트를 비공개로 두며 앱 포트를 loopback에 bind한다. 다섯 Next.js Docker build에는 전체 교차 앱 공개 URL을 주입해 공개 환경의 localhost fallback을 차단했다. 7개 이미지 build는 전체 workspace manifest를 먼저 고정한 filtered install, TLS 검증을 유지하는 승인 PEM CA BuildKit secret, 잠금형 pnpm store와 lockfile-keyed verification metadata cache를 사용해 pnpm 11 pre-run 상태와 최초 공급망 검증을 유지하며, runtime secret은 server/db-init에만 mount한다. verifier는 각 build의 manifest/secret/cache 및 프로덕션 CA 파일 계약을 검사한다.
* **database, docker, scripts:** trigger 설치 완료 검증을 `trg_*_h` 이름 73개만 표시하던 부분 집합에서 common/PMS/DMS/CRM/SNS의 non-internal trigger 전체로 확장했다. 현재 source trigger contract 78개와 migration-managed CRM contract trigger를 합친 DB 총 79개를 구분하며, TypeScript installer는 source contract 누락·비활성화·파일 적용 실패를 exit 1로 처리한다.
* **codex, web, docs:** push guard의 shared browser package 영향 매핑을 보강했다. `packages/types`, `packages/web-auth`, `packages/web-shell`, `packages/web-ui`가 바뀌면 Admin/CRM/PMS/DMS/SNS 5개 production build를 모두 실행해 공용 셸·인증·UI 변경이 일부 앱 빌드만으로 통과하지 않게 한다.
* **scripts, docs:** CRM 데모 이식 완료 기준을 사용자 제공 데모 실행 소스와 DB 스키마의 SSOO CRM 이식/로컬 재현성으로 재정렬했다. 기본 `verify:crm-migration-completion`은 `verify:crm-launch`와 `verify:crm-local`만 blocking으로 판단하고, 외부 ERP/API provider execution report, CRM AI/RAG provider-ready runtime report, 보호 발표자료 reflection report와 반영 marker 제거는 `verify:crm-migration-completion:with-extensions` 또는 `--require-extensions` 확장 readiness에서만 blocking으로 판단한다.
* **scripts, docs:** CRM migration input inspector를 추가했다. `inspect:crm-migration-inputs`는 completion env, report path, `.runtime` Office 후보, DMS sidecar source metadata를 진단하며, `protectedSourceCandidateSummary`로 같은 SHA-256 후보를 중복 그룹화하고 `requiredExternalInputs`로 남은 외부 입력 요청을 구조화한다. RMS 보호 Office 후보는 경로 복원 단서로만 취급하고 완료 증거로 간주하지 않는다.
* **scripts, docs:** CRM migration completion evidence bundle preparer를 추가했다. `prepare:crm-migration-evidence`는 report template 3종, `crm-migration-input-inspection` JSON/Markdown, `crm-migration-required-external-inputs` JSON/Markdown request packet, env template, README, manifest를 생성하고 self-test에서 draft report가 verifier를 통과하지 못하는지, input inspection이 diagnostic-only로 남는지, required inputs가 request-only로 남는지 확인한다.
* **scripts, docs:** CRM local build/test verification gate를 추가했다. `verify:crm-local`은 `verify:crm-launch`, CRM 관련 server Jest suite, DMS/PMS CRM boundary test, `pnpm build:web-crm` production build를 실행하며, `verify:crm-migration-completion`은 이 로컬 gate도 완료 판정에 포함한다.
* **scripts, docs:** CRM migration evidence bundle manifest와 README에 `verify:crm-local -- --report-path=crm-local-verification-report.json` 실행 단계를 추가해 completion audit 전 로컬 build/test evidence 생성 경로를 고정했다.
* **scripts, docs:** CRM migration required external input request packet을 보강했다. 각 `requiredExternalInputs` 항목은 completion audit의 `completionCheckId`와 자료별 `verificationCommand`를 포함해 외부 provider/protected-source 증거 수집 후 통과시켜야 할 verifier를 명시한다.
* **scripts, docs:** CRM migration evidence bundle verifier를 추가했다. `verify:crm-migration-evidence-bundle`은 prepared bundle의 로컬 검증 report와 외부 evidence report 3종이 각 verifier를 통과하는지 제출 전 확인하며, `verify:crm-migration-completion`을 대체하지 않는다.
* **scripts, docs:** CRM migration evidence bundle preparer에 로컬 검증 report 포함 옵션을 추가했다. `prepare:crm-migration-evidence -- --local-verification-report-path=<report.json>`는 통과한 `verify:crm-local` JSON을 bundle 내부 `crm-local-verification-report.json`으로 복사하고 manifest에 포함 여부를 기록한다.
* **scripts, docs:** CRM local evidence bundle preparer를 추가했다. `prepare:crm-local-evidence-bundle`은 로컬 검증 report 생성 또는 기존 report 복사, migration evidence bundle 준비, 선택적으로 제공된 `--accounting-payment-report-path`, `--crm-ai-rag-report-path`, `--protected-source-reflection-report-path` passed report 적용, bundle verifier 실행을 한 번에 수행하고 남은 외부 evidence report가 draft뿐이면 `local-ready-pending-external` 상태를 wrapper report에 기록한다.
* **scripts, docs:** CRM completion report verifier와 `verify:crm-migration-completion`의 확장 readiness evidence 판정을 강화했다. 회계·지급, CRM AI/RAG, 보호자료 reflection report verifier는 synthetic/self-test evidence marker를 기본 거부해 verifier self-test용 JSON이 provider/protected-source 증거로 오인되지 않게 한다.
* **scripts, docs:** CRM migration completion audit 실패 출력과 JSON report에 diagnostic-only input inspection을 포함했다. `verify:crm-migration-completion`은 실패 시 로컬 후보 경로와 남은 외부 입력 요청을 함께 남기지만, 이 진단 snapshot은 완료 증거로 취급하지 않는다.
* **scripts, docs:** CRM 완료 evidence report 3종에 draft JSON template 출력을 추가했다. `verify:crm-accounting-payment-provider-report:template`, `verify:crm-ai-rag-runtime-report:template`, `verify:crm-protected-source-reflection-report:template`는 작성 양식만 출력하며, `status: draft`라 그대로 완료 증거가 될 수 없다.
* **scripts, docs:** CRM launch readiness 문서 assertion을 완료 전 미완료 문구 강제에서 완료 판정 evidence 계약 확인으로 조정했다. 실제 완료 여부는 `verify:crm-migration-completion`의 report evidence와 marker 제거가 판단한다.
* **scripts, docs:** CRM launch readiness 정적 gate를 추가했다. `verify:crm-launch`는 CRM 웹 surface, Next API proxy, 서버 모듈/테스트, CRM DB migration/seed/trigger, PMS/DMS 경계, 완료 판정 evidence 계약 문서화를 함께 점검하며, 통과해도 실제 외부 ERP/API 반영, SSOO 공통 AI/RAG provider-ready runtime artifact, 보호된 발표자료 반영을 완료로 간주하지 않는다.
* **scripts, docs:** CRM 회계·지급 외부 ERP/API 실행 report verifier를 추가했다. `verify:crm-accounting-payment-provider-report`는 `external-api` 실행 report에서 전표, 지급 요청, 지급 실행, 외부 시스템 sync evidence와 운영 대조 `matched`/`reconciled` 상태를 검증하며, placeholder evidence path를 허용하지 않는다.
* **scripts, docs:** CRM AI/RAG provider-ready runtime report verifier를 추가했다. `verify:crm-ai-rag-runtime-report`는 CRM opportunity/customer/activity report의 indexed object, embedding, retrieval audit evidence가 provider-ready 상태인지 검증한다.
* **scripts, docs:** CRM 보호 발표자료 reflection report verifier를 추가했다. `verify:crm-protected-source-reflection-report`는 해제본 파일 SHA-256, 텍스트 추출, CRM README/backlog/PRD 반영 대상, 미매핑 0건을 검증한다.
* **scripts, docs:** CRM 데모 이식 완료 감사 gate를 추가했다. `verify:crm-migration-completion`은 기본적으로 `verify:crm-launch`와 `verify:crm-local`을 묶어 사용자 제공 데모 실행 소스와 DB 스키마의 SSOO CRM 이식/로컬 재현성을 검사한다. 외부 회계·지급 provider-ready precheck, provider execution report, CRM AI/RAG provider-ready precheck/runtime report, 보호 발표자료 reflection report와 미반영 marker 제거는 명시적 확장 readiness로 분리했다.
* **scripts, docs:** CRM 회계·지급 외부 ERP/API provider 환경 precheck를 추가했다. `verify:crm-accounting-payment-provider:ready-precheck`는 `CRM_ACCOUNTING_PAYMENT_API_URL` 또는 `CRM_ACCOUNTING_PAYMENT_API_BASE_URL` 기반 endpoint readiness와 필수 evidence step 계약을 점검하지만, 실제 전표·지급 반영이나 운영 대조 증거를 완료로 간주하지 않는다.
* **server, types, docs:** CRM 원가/AMS 회계·지급 실행에 provider-gated 외부 ERP/API mode를 추가했다. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execute`는 기본 `demo` mode에서 기존 CRM demo evidence를 생성하고, `mode: external-api`와 `CRM_ACCOUNTING_PAYMENT_API_URL` 또는 `CRM_ACCOUNTING_PAYMENT_API_BASE_URL`이 설정된 경우 active handoff snapshot을 외부 회계·지급 API로 전송한 뒤 API가 반환한 전표/지급/sync evidence를 CRM handoff snapshot에 기록한다. 이 경로는 outbound 계약이며 실환경 ERP/API 반영 완료 증거는 provider 실행 결과와 운영 대조가 필요하다.

* **server, web-crm, types, scripts, docs:** CRM 계약 DMS 문서 패킷의 공급자 CI 참조 검증을 추가했다. `ciStorageRef`를 DMS working tree 또는 `local://`/`nas://` storage adapter 참조로 확인하고, `/contracts` 첨부 카드가 `referenceStatus`와 사유를 표시하며 누락/잘못된 참조는 DMS 초안 readiness를 차단한다. CI 파일 업로드와 템플릿 관리는 계속 DMS 경계에 둔다.

* **server, web-dms, types, scripts, docs:** CRM 계약 DMS 결재선 정책 편집 UI를 추가했다. `system.crmContractApprovalRoute` 설정과 `DmsCrmContractApprovalRoutePolicy` 공유 타입을 추가하고, DMS 설정의 `CRM 계약 결재선`에서 route key/name, policy version, organization scope, required roles를 저장한다. DMS 계약 lifecycle 실행은 이 설정을 읽어 승인 route, 승인자 matrix, 결재선 원장 evidence를 생성한다.

* **server, web-dms, dms, types, scripts, docs:** CRM 계약 DMS 산출 정책 UI를 추가했다. `system.crmContractExportPolicy` 설정과 `DmsCrmContractExportPolicy` 공유 타입을 추가하고, DMS 설정의 `CRM 계약 산출 정책`에서 policy key/version, organization scope, markdown record root, Word/PDF storage artifact root를 저장한다. DMS 계약 lifecycle 실행은 이 설정을 읽어 `export-policy.md` governance evidence를 만들고, markdown evidence와 DOCX/PDF artifact를 `root/organizationScope/contractCode` 경로로 산출한다.

* **server, web-dms, types, scripts, docs:** CRM 견적 템플릿 검토 확정 UI를 추가했다. DMS 템플릿 metadata에 `reviewConfirmation`을 저장하고, `POST /dms/templates/:id/review-confirmation` 및 `/api/templates/:id/review-confirmation` proxy로 DMS 설정의 관리자 템플릿 목록에서 `crm-quote-v1` 검토 확정을 기록한다. CRM은 견적 Word/PDF 생성 runtime을 직접 소유하지 않으며, 실제 외부 ERP/API와 SSOO 공통 AI/RAG provider-backed runtime 검증은 별도 확장 readiness다.

* **server, web-crm, dms, types, scripts, docs:** CRM 견적 DMS lifecycle artifact 실행 1차를 추가했다. `POST /crm/opportunities/:id/quote-dms-document-lifecycle-execution`은 DMS `crm-quote-v1` 템플릿과 active 견적 markdown handoff를 입력으로 template-version snapshot, template-review record, DOCX, PDF artifact를 만들고 active `crm.crm_quote_dms_handoff_m` lifecycle snapshot에 evidence를 기록한다. CRM은 견적 Word/PDF 생성 runtime을 직접 소유하지 않으며, 템플릿 검토 확정은 DMS 설정의 `crm-quote-v1` reviewConfirmation으로 기록한다.

* **server, web-crm, types, scripts, docs:** CRM 견적 DMS lifecycle execution evidence 수신 계약을 추가했다. `POST /crm/opportunities/:id/quote-dms-document-execution-evidence`는 외부 DMS 실행 결과가 만든 견적 템플릿 검토, DOCX, PDF evidence path를 active `crm.crm_quote_dms_handoff_m` snapshot의 lifecycle step에 `completed`로 기록하고, `/opportunities` 견적 패널은 DMS 견적 lifecycle 상태와 evidence path를 읽기 전용으로 표시한다.

* **server, dms, web-crm, types, scripts, docs:** CRM 견적 DMS template registry evidence를 추가했다. DMS 기본 시스템 템플릿에 `crm-quote-v1` 견적서 markdown 템플릿을 등록하고, `/crm/opportunities/:id/quote-preview`와 `/opportunities` DMS 견적 초안 패널이 active template 이름, 상태, source path를 표시한다. 이 evidence는 견적 초안 handoff 이후 DMS quote lifecycle artifact 실행의 입력이며, DMS 설정의 관리자 템플릿 목록에서 검토 확정 상태를 관리한다.

* **server, web-crm, database, types, scripts, docs:** CRM 견적 DMS markdown 초안 handoff를 추가했다. `POST /crm/opportunities/:id/quote-dms-document-draft`는 영업기회 견적 preview를 markdown 초안으로 렌더링해 DMS 파일 서비스에 저장하고 `crm.crm_quote_dms_handoff_m` handoff snapshot 원장에 문서/변수/saved path를 기록한다. `/opportunities`는 DMS 견적 초안 readiness, 최신 handoff, 저장/갱신 버튼을 표시하며, CRM 직접 Word/PDF 생성은 수행하지 않는다.

* **web-crm, scripts, docs:** CRM 계약 DMS governance evidence 표시를 추가했다. `/contracts` DMS 문서 패킷 패널은 lifecycle 실행 후 `dmsExecution.governance`의 템플릿 버전, 템플릿 변경 원장, 첨부 확정 원장, 결재선 원장, 승인자 matrix를 읽기 전용 evidence로 표시하며, CRM은 DMS 결재선/첨부/문서 정본을 편집하지 않는다.

* **server, web-crm, dms, types, scripts, docs:** CRM 계약 DMS attachment finalization ledger evidence를 추가했다. `POST /dms/crm-contract-lifecycle/executions`는 CRM handoff의 공급자 CI/청구계획 별첨 evidence를 `attachment-finalization-ledger.md` artifact와 `dmsExecution.governance.attachmentFinalizationLedger`에 확정 원장으로 보존하고, `attachment-confirmation` lifecycle step은 이 확정 원장을 evidence path로 수신한다. 운영 조직 기준 export 정책은 DMS 설정의 `CRM 계약 산출 정책`과 `export-policy.md` evidence로 연결됐다.

* **server, web-crm, dms, types, scripts, docs:** CRM 계약 DMS approval route ledger sync evidence를 추가했다. `POST /dms/crm-contract-lifecycle/executions`는 승인 route policy와 다자 승인 workflow를 `approval-route-ledger.md` artifact와 `dmsExecution.governance.approvalRouteLedger`에 동기화하고, 공용 사용자/조직 directory snapshot의 sync status와 resolved actor 수를 함께 남긴다. 운영 조직 기준 export 정책은 DMS 설정의 `CRM 계약 산출 정책`과 `export-policy.md` evidence로 연결됐다.

* **server, web-crm, types, scripts, docs:** CRM 원가/AMS 회계·지급 데모 실행 evidence 생성을 추가했다. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execute`는 active handoff snapshot의 확정 내부원가/AMS 정산 line을 기반으로 전표, 지급 요청, 지급 실행, 외부 동기화 demo artifact evidence를 생성하고 기존 execution evidence 수신 계약으로 `execution_evidence_snapshot`에 기록한다. 이 흐름은 CRM demo runner 증빙이며 실제 ERP/API 반영은 외부 회계·지급 시스템 경계다.

* **server, web-crm, dms, types, scripts, docs:** CRM 계약 DMS template change request ledger evidence를 추가했다. `POST /dms/crm-contract-lifecycle/executions`는 active 템플릿 재사용 판단을 `template-change-request-ledger.md` artifact와 `dmsExecution.governance.templateChangeRequestLedger`에 남기며, 변경 요청이 필요 없으면 `closed-without-change` 원장 entry로 닫는다. 운영 조직 기준 export 정책은 DMS 설정의 `CRM 계약 산출 정책`과 `export-policy.md` evidence로 연결됐다.

* **server, web-crm, dms, types, scripts, docs:** CRM 계약 DMS approval route가 공용 사용자/조직 directory snapshot을 보존하도록 보강했다. `POST /dms/crm-contract-lifecycle/executions`는 `common.cm_user_m`, `common.cm_user_org_r`, `common.cm_organization_m`을 조회해 `directorySyncStatus`, `directorySource`, `directorySyncedAt`, `resolvedActors`를 `dmsExecution.governance.approvalRoute`와 `approval-route.md` evidence에 남기고, 공용 사용자와 조직이 확인되면 `externalDirectorySynced=true`로 표시한다. 운영 조직 기준 export 정책은 DMS 설정의 `CRM 계약 산출 정책`과 `export-policy.md` evidence로 연결됐다.

* **server, web-crm, dms, types, scripts, docs:** CRM 계약 DMS lifecycle governance evidence를 추가했다. `POST /dms/crm-contract-lifecycle/executions`는 active `crm-contract-v1` 템플릿 버전 snapshot, export policy record, active 템플릿 재사용/변경 검토 record, 첨부 확정 원장, 승인 route policy record, 다자 승인 workflow record, 결재선 원장 동기화 record를 `template-version.md`, `export-policy.md`, `template-change-review.md`, `attachment-finalization-ledger.md`, `approval-route.md`, `approval-workflow.md`, `approval-route-ledger.md` artifact로 생성하고, CRM `POST /crm/contracts/:id/dms-document-lifecycle-execution` 응답은 `dmsExecution.governance`의 `templateVersion`, `exportPolicy`, `templateChangeReview`, `attachmentFinalizationLedger`, `approvalRoute`, `approvalRouteLedger`, `approvalActors`와 artifact 목록을 그대로 노출한다.

* **server, web-crm, dms, types, scripts, docs:** CRM 계약 DMS lifecycle artifact 실행 1차를 추가했다. `POST /crm/contracts/:id/dms-document-lifecycle-execution`은 DMS `crm-contract-v1` 템플릿과 CRM handoff markdown 초안을 입력으로 `POST /dms/crm-contract-lifecycle/executions` DMS 서비스를 호출하고, 템플릿 변경 검토 기록, 템플릿 검토 기록, 첨부 확인/확정 원장, DOCX, PDF, 승인 기록, 승인 route policy artifact, 결재선 원장 동기화 artifact를 생성한 뒤 CRM handoff snapshot에 evidence를 반영한다. 실제 외부 ERP/API 반영은 계속 후속이다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS 회계·지급 실행 evidence 수신 계약을 추가했다. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execution-evidence`는 외부 회계·지급 시스템이 만든 전표/지급 evidence path를 active handoff snapshot의 `execution_evidence_snapshot`에 기록하고 이전 active row는 `replaced`로 남긴다. `/cost-plan`은 최신 handoff의 evidence path를 표시하며, 실제 ERP/API 반영 자체는 계속 외부 회계·지급 시스템 경계다.

* **server, web-crm, types, scripts, docs:** CRM 계약 DMS lifecycle 실행 evidence 수신 계약을 추가했다. `/crm/contracts/:id/dms-document-execution-evidence`는 DMS가 생성한 Word/PDF/승인 등 실행 결과 evidence path를 active handoff snapshot의 lifecycle step에 `completed`로 기록하고, `/contracts` preview reload 시 해당 completed evidence를 유지한다. 이 계약은 DMS 실행 결과를 CRM 원장에 반영하는 수신 경계이며 Word/PDF 생성기나 승인 워크플로 자체는 계속 DMS 소유다.

* **server, web-crm, types, scripts, docs:** CRM 계약 DMS 문서 패킷의 첨부 evidence를 명시했다. 공급자 CI `ciStorageRef`와 청구계획 별첨 후보를 attachment evidence path로 내려주고, `/contracts` DMS 문서 패킷 패널과 lifecycle snapshot이 해당 경로를 표시한다. DMS lifecycle 실행은 해당 evidence를 첨부 확정 원장으로 보존하며, 승인 route와 산출 경로 정책은 DMS 설정이 소유한다.

* **server, dms, scripts, docs:** CRM 계약 DMS lifecycle이 실제 DMS 템플릿 registry 증거를 읽도록 연결했다. DMS 기본 시스템 템플릿에 `crm-contract-v1` 계약서 markdown 템플릿을 추가하고, `/crm/contracts/:id/dms-document-preview`는 active 템플릿 source path를 `DMS 템플릿 검토` lifecycle evidence로 표시한다. 템플릿 변경 승인과 조직 승인 라우팅은 계속 DMS 후속 경계다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS Preview에 회계·지급 handoff snapshot을 추가했다. `/api/crm/cost-plan/accounting-payment-preview`는 확정 내부원가와 AMS 정산 확정 row만 모아 handoff 후보와 최신 snapshot을 표시하고, `POST /api/crm/cost-plan/accounting-payment-handoff`는 현재 필터 기준 line snapshot을 `crm.crm_cost_plan_accounting_handoff_m`에 저장한다. 이 snapshot은 CRM 증빙이며 실제 ERP/API 반영은 외부 회계·지급 시스템 경계다.

* **server, types, scripts, docs:** CRM AI/RAG runtime evidence gate를 추가했다. `verify:crm-ai-rag-runtime*`는 CRM opportunity/customer/activity를 실제 API로 선택하고, opportunity 공용 job과 customer/activity controlled backfill을 queue/run한 뒤 common AI object/chunk/ACL/index state/retrieval audit를 검증한다. 공용 검색 entity type에 `activity`를 추가해 CRM customer activity retrieval filter도 정식 경로로 닫았다. SSOO 공통 AI/RAG provider-backed runtime 품질 검증은 별도 ready 실행 증거가 필요하다.

* **server, web-crm, types, scripts, docs:** CRM 계약 DMS handoff에 문서 lifecycle checklist를 추가했다. `/crm/contracts/:id/dms-document-preview`와 `/contracts`는 CRM markdown 초안, DMS 템플릿 검토, 첨부 확인, Word 산출, PDF 저장, 승인 단계를 소유자/상태/증거 경로와 함께 표시하고, `POST /crm/contracts/:id/dms-document-draft`는 같은 lifecycle snapshot을 markdown 초안과 `crm.crm_contract_dms_handoff_m` handoff evidence에 남긴다. 실제 템플릿 검토, 첨부 확정, Word/PDF export, 승인은 계속 DMS 실행 범위다.

* **server, web-crm, database, types, scripts, docs:** CRM 계약 DMS 초안 저장 후 handoff snapshot 원장을 남기도록 보강했다. `POST /crm/contracts/:id/dms-document-draft`는 DMS markdown 초안 저장 성공 후 `crm.crm_contract_dms_handoff_m`에 문서/변수/첨부 snapshot과 saved path를 기록하고, `/crm/contracts/:id/dms-document-preview`와 `/contracts`는 최신 handoff id/status/savedAt을 재조회해 표시한다. Word/PDF 산출, 템플릿 검토, 첨부/승인은 계속 DMS 후속 범위다.

* **server, web-crm, database, types, scripts, docs:** CRM 보고 Preview 확정 snapshot 원장을 추가했다. `POST /crm/reports/confirm`은 현재 `/reports` 필터의 pipeline/계약대비실적 집계를 `crm.crm_report_confirmation_m`에 summary/monthly trend/drilldown/확인 항목 snapshot으로 저장하고, `/reports`는 최신 확정 상태와 `POST /crm/reports/confirmations/:id/reopen` 확정 해제를 표시한다. 이 확정은 CRM 보고 snapshot만 닫으며 회계 전표, PMS 수행 KPI, DMS 문서 저장 확정은 잔여다.

* **server, web-crm, database, types, scripts, docs:** CRM 사업계획대비실적에 월별 직접 실적 입력을 추가했다. `POST /crm/business-plan/performance-actual/monthly`는 사업년도/사업구분/계열/담당자/국내외/WBS 기준 12개월 매출·원가 실적을 `crm.crm_business_plan_performance_actual_d` 별도 원장에 저장하고, `/business-plan-performance`는 이를 `manual-actual` source row로 합산한다. 이 입력은 계약/원가/회계 정본을 덮어쓰지 않으며 회계/지급 반영은 잔여다.

* **server, web-crm, types, scripts, docs:** CRM 사업계획대비실적 Preview가 확정 AMS 외부원가와 같은 WBS의 계약 성과 외부원가를 중복 계산하지 않도록 조정했다. 같은 WBS에 정산 확정된 AMS row가 있으면 계약 월별 성과 row의 외부원가 계획/실적을 제외하고, summary와 `/business-plan-performance`에 조정 WBS 수와 제외 금액을 표시한다. 이 중복 조정 slice 당시에는 회계/지급 반영과 직접 실적 입력 write UI를 잔여로 두었다.

* **server, web-crm, types, scripts, docs:** CRM 계약 DMS 문서 패킷을 DMS markdown 초안 저장까지 확장했다. `POST /crm/contracts/:id/dms-document-draft`는 준비 완료 계약 preview를 markdown으로 렌더링해 DMS `FileCrudService.write`에 저장하고, 계약 `dms_link_status_code`를 `draft-created`로 표시한다. preview는 deterministic draft path와 저장된 draft path를 반환하므로 `/contracts`는 재조회 후에도 DMS 초안 저장 경로와 갱신 버튼을 표시한다. Word/PDF 산출과 템플릿 검토/첨부/승인은 DMS 후속으로 남긴다.

* **server, web-crm, types, scripts, docs:** CRM 사업계획대비실적 Preview가 확정 내부원가/AMS 외부원가 입력을 별도 `confirmed-cost` source row로 읽어 계획/실적 원가와 손익 차이에 합산하도록 보강했다. 이 slice 당시에는 회계/지급 반영과 계약 외부원가 중복 조정을 잔여로 두었다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS Preview에 AMS 외부원가 월별 입력 정산 확정/해제를 추가했다. `POST /crm/cost-plan/ams/external-cost/monthly/:id/confirm`과 `/reopen`은 저장된 업체-WBS 월별 외부원가 계획·실적 입력을 `crm_cost_plan_ams_external_monthly_d.status_code/confirmed/confirmed_at` 기준으로 잠그거나 해제하고, `/cost-plan`은 AMS 정산 확정 건수, 입력 상태, 정산 확정/해제 버튼을 표시한다. 회계 전표/지급 정산 연계는 잔여다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS Preview에 내부원가 월별 입력 확정/해제를 추가했다. `POST /crm/cost-plan/internal-cost/monthly/:id/confirm`과 `/reopen`은 저장된 내부원가 계획·실적 입력을 `crm_cost_plan_internal_monthly_d.status_code/confirmed/confirmed_at` 기준으로 잠그거나 해제하고, `/cost-plan`은 확정 건수, 입력 상태, 확정/해제 버튼을 표시한다. 이 내부원가 slice 당시에는 AMS 외부원가 정산 확정과 사업계획/회계 연동을 잔여로 두었다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS Preview에 AMS 외부원가 월별 계획/실적 입력 원장을 추가했다. `POST /crm/cost-plan/ams/external-cost/monthly`은 사업년도/사업구분/계열/담당자/WBS/업체 기준 12개월 외부원가 계획·실적을 `crm_cost_plan_ams_external_monthly_d`에 저장하고, `/cost-plan`은 저장 입력을 preview 합계와 월별 표에 병합한다. 이 입력 slice 당시에는 내부원가 확정과 AMS 외부원가 정산 확정을 잔여로 두었다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS Preview에 AMS 업체-WBS 매핑 저장을 추가했다. `POST /crm/cost-plan/ams/vendor-wbs`는 확정 계약 WBS 기준 업체명과 계약/발주 번호를 `crm_cost_plan_ams_vendor_wbs_r`에 저장하고, `/cost-plan`은 저장된 업체 매핑이 있어야 AMS ready로 계산한다. 이 매핑 slice 당시에는 내부원가 확정과 AMS 외부원가 정산 확정을 잔여로 두었다.

* **server, web-crm, database, types, scripts, docs:** CRM 원가/AMS Preview에 내부원가 월별 계획/실적 입력 원장을 추가했다. `POST /crm/cost-plan/internal-cost/monthly`은 사업년도/사업구분/계열/담당자/WBS 기준 12개월 내부원가 계획·실적을 `crm_cost_plan_internal_monthly_d`에 저장하고, `/cost-plan`은 저장 입력을 preview 합계와 월별 표에 병합한다.

* **server, web-crm, database, types, scripts, docs:** CRM 사업계획 draft line 월별 계획 매출 직접 입력을 추가했다. `POST /crm/business-plan/plans/:id/lines/:lineId/monthly-plan`은 12개월 계획 매출을 `crm_business_plan_line_d.plan_monthly_revenue_amounts`에 저장하고 line/plan 합계를 재계산하며, 확정 사업계획대비실적은 월별 입력값을 우선 사용하고 미입력 line만 월 균등 배분한다. 이 계획 입력 slice 당시에는 실적 직접 편집과 내부원가 확정/AMS 정산 확정을 잔여로 두었다.

* **web-ui, web-shell, scripts, docs:** SSOO custom typography token과 color token이 같이 보존되도록 `@ssoo/web-ui` `cn()` merge 정본을 고정하고, DMS 문서 페이지 header action 리듬(36px control, 12px horizontal padding, 13px medium label)을 Button `pageAction` 역할 size로 공용화했다. `SsooPageHeader`와 data workspace header action은 사용처 recipe 재조합 대신 공용 Button size를 소비하며, gate는 해당 공용 템플릿의 Button height/spacing/typography override 회귀를 차단한다.

* **server, web-pms, types, scripts, docs:** PMS 프로젝트 상세 인수인계 탭에서 준비 완료 CRM 계약 인계 preview를 기존 프로젝트의 계약/대금/accepted handoff 스냅샷으로 명시 반영하는 흐름을 추가했다. CRM 계약 원장 소유권, PMS 신규 프로젝트 자동 생성, 계약/청구 직접 편집은 제외한다.

* **server, web-crm, types, scripts, docs:** CRM 사업계획 전년 이월을 추가했다. `POST /api/crm/business-plan/plans/carry-forward`와 `/business-plan` 차수 패널에서 전년도 확정 차수의 겹치는 연도 line을 새 기준년도 draft로 이월하고 현재 preview 신규 후보를 보강한다. 이 시점에는 내부원가 확정/AMS 정산 확정을 잔여로 두었다.

* **server, web-crm, types, scripts, docs:** CRM 사업계획대비실적 preview가 확정 사업계획 차수 원장을 기준으로 연간 계획 매출을 월 균등 배분하고 확정 계약 월별 실적과 비교하도록 보강했다. 확정 차수가 없을 때는 기존 pipeline 후보와 계약 청구계획 fallback을 유지하며, 이 시점에는 계획/실적 직접 편집과 내부원가/AMS 정산 확정을 잔여로 두었다.

* **web-crm, scripts, docs:** CRM 고객/활동 Workspace가 customer/activity access snapshot을 소비하도록 연결했다. `/api/crm/customers/access`와 `/api/crm/customers/:id/access`를 조회해 고객 등록/수정, 활동 조회/등록 버튼과 입력 상태를 `canCreateCustomer`, `canEditCustomer`, `canViewCustomerActivity`, `canCreateCustomerActivity` 기준으로 제어하고, 권한 확인/거부 상태를 화면에 표시한다. Provider-ready vector evidence는 잔여다.

* **server, database, web-crm, types, scripts, docs:** CRM 고객/활동 API access guard/snapshot 1차를 추가했다. `crm.customer.read/write`, `crm.customer.activity.read/write` permission seed와 `crm.customer` object policy를 추가하고, 기존 `crm.opportunity.read/write` grant는 재시드 전 호환 매핑으로 유지한다. `/crm/customers/access/me`, `/crm/customers/:id/access`, web-crm proxy route, `CrmCustomerFeatureGuard`/decorator, owner-user/name baseline 후 object revoke 우선 테스트를 추가했다. Provider-ready vector evidence는 잔여다.

* **server, types, scripts, docs:** CRM 고객/활동 controlled AI index backfill을 추가했다. `POST /crm/customers/ai-index/backfill`은 system-override/admin 권한에서 customer/activity row를 제한된 batch로 `sourceApp: "crm"`/`entityType: "customer"|"activity"`/`jobType: "backfill"` job에 enqueue하고, `@ssoo/types`는 backfill 요청/응답 계약을 제공한다. `CrmAiIndexAdapter`는 customer/activity ACL snapshot에 owner 후보와 object id를 명시한다. Provider-ready vector evidence는 잔여다.

* **web-crm, docs:** CRM 고객/활동 Workspace 1차를 추가했다. `/customers` 메뉴는 고객 원장 목록 검색/유형 필터/정렬, 고객 상세, 고객 생성/수정, 최근 활동 표시, 활동 등록을 기존 `/api/crm/customers` 원장에 연결했다. 이 시점에는 customer/activity object policy와 provider-ready vector evidence를 후속으로 남겼다.

* **server, web-pms, types, scripts, docs:** PMS 홈이 리뷰 탭에서 수집된 열린 launch feedback 이슈를 별도 피드백 지표와 리뷰 탭 대상 운영 신호로 표시하도록 보강했다. 기존 PMS 전체 보고/PMO/PMR/PRR 자동화는 아직 완료 범위로 보지 않는다.

* **web-pms, scripts, docs:** PMS 런칭 브라우저 QA가 프로젝트 상세 컨트롤 탭에 QA 전용 기존 `Issue` 행을 만들고, 화면의 정식 전환 버튼을 실제 클릭해 정식 이슈 생성과 기존 행 종료 상태를 desktop/mobile 기준으로 확인하도록 확장했다.

* **web-pms, scripts, docs:** PMS 프로젝트 상세 컨트롤 탭의 기존 `Issue` 호환성 인박스에서 유형별로 정식 이슈, 리스크, 변경요청을 생성하고 기존 행을 종료 처리하는 수동 전환 동선을 추가했다. 이는 legacy 테이블 제거 전 1차 cleanup 흐름이며, `verify:pms-launch`가 전환 액션과 정식 mutation 의존성을 확인한다.

* **web-pms, scripts, docs:** PMS 프로젝트 상세 closeout 패널에 현재 단계의 미해결 산출물과 종료조건을 읽기용 처리 큐로 노출하고, 큐 항목 클릭으로 산출물/종료조건/리뷰 관리 탭으로 이동하도록 보강했다. 런칭 브라우저 QA와 `verify:pms-launch`는 처리 큐와 탭 이동 회귀를 확인한다.

* **web-pms, scripts, docs:** PMS 프로젝트 상세 closeout 패널에 산출물, 종료조건, 리뷰/피드백 탭으로 바로 전환하는 조치 바로가기를 추가하고, 런칭 브라우저 QA가 desktop/mobile에서 실제 탭 전환을 확인하도록 확장했다.

* **web-pms, scripts, docs:** PMS 런칭 브라우저 QA가 프로젝트 리뷰 탭에서 실제 피드백 이슈와 리뷰 이벤트를 저장하고, 저장 결과가 피드백 큐와 보고/리뷰 이벤트 목록에 다시 표시되는지 desktop/mobile 기준으로 확인하도록 확장했다.

* **web-pms, scripts, docs:** PMS 런칭 브라우저 QA를 홈/요청 등록 확인에서 홈→프로젝트 상세 리허설로 확장했다. QA는 태스크, 마일스톤, 컨트롤, 산출물, 종료조건, 인수인계, 리뷰 탭을 desktop/mobile에서 실제로 열고 오류·overflow·내부 ID 노출 회귀를 확인하며, 프로젝트 상세 탭 레일은 작은 화면에서 가로 스크롤로 동작하도록 보강했다.

* **web-pms, scripts, docs:** PMS 프로젝트 멤버 역할 선택을 코드 테이블 기반으로 고정했다. 멤버 추가 화면은 `PROJECT_MEMBER_ROLE` 활성 코드만 선택지로 사용하고 정적 역할 fallback을 제거했으며, `verify:pms-launch`는 코드 시드, 화면 의존성, 런타임 코드 API 조회를 함께 검증한다.

* **web-pms, scripts, docs:** PMS 프로젝트 상세에 리뷰 탭을 추가했다. 보고/리뷰 이벤트, 연결 산출물/종료조건 readiness, 열린 이슈/리스크/변경/인수인계 피드백 큐를 기존 PMS 실행 데이터에서 읽기용으로 요약하며, `verify:pms-launch`는 리뷰 탭 정적 surface와 이벤트 rollup 런타임 응답을 함께 검증한다. 기존 PMS 전체 보고/PMO/PMR/PRR 자동화는 아직 런칭 완료 범위로 보지 않는다.

* **scripts, docs:** PMS 런칭 검증을 인증 후 런타임 API smoke로 확장했다. `verify:pms-launch`는 서버/PMS 웹 응답뿐 아니라 관리자 로그인 후 프로젝트 상세, access/readiness, 조직/관계, objective/WBS, 작업, control 객체, 산출물, 종료조건, 인수인계, 계약 스냅샷 조회를 실제 Docker 런타임에서 확인한다.

* **server, database, web-crm, types, docs:** CRM opportunity 매출/원가 라인을 원천 데모식 세부 그리드에 가깝게 확장했다. `crm_opportunity_line_d`는 수량/M-M, 단가, 절사, 이익률, 소속/성명/등급, 내부/외부 구분, 원가-매출 연동 metadata를 보존하고, 서버는 수량×단가 기준으로 합계를 계산하며, CRM 웹 등록/수정 패널은 매출 상품/용역과 원가 상품/내부용역/외부용역 그룹 입력을 제공한다.

* **web-pms, types, scripts, docs:** PMS 프로젝트 상세에 인수인계 탭을 추가했다. 사용자는 프로젝트별 인계 목록을 보고 신규 인계를 등록하며 대기 인계를 수락/반려/취소할 수 있고, 계약/대금 정보는 CRM 정본에서 넘어온 읽기 전용 스냅샷으로만 노출된다.

* **web-auth, scripts, docs/common:** 공용 로그인/비밀번호 재설정 surface가 앱 root `body[data-ssoo-theme]`에서 상속되는 SSOO theme token을 소비하도록 정렬했다. 기존 legacy teal/slate 하드코딩을 제거하고 `verify:auth-commonization`에서 공용 auth surface의 하드코딩 색상 회귀를 차단한다.

* **server, database, web-crm, types, docs:** CRM opportunity 차수 흐름을 추가했다. `crm_opportunity_m`에 `opportunity_group_code`를 두고 목록은 최신 차수 기준으로 집계하며, `GET/POST /crm/opportunities/:id/versions`가 이전 차수 조회와 확정 최신 차수 기반 차수 추가를 제공한다. 일반 수정은 더 이상 formal `versionNo`를 증가시키지 않고, 차수 추가 이벤트는 `opportunity_version_added` AI index job으로 queue된다.

* **server, web-crm, types, docs:** CRM opportunity 생성/수정/확정/해제 1차 흐름을 추가했다. 서버는 `POST/PUT /crm/opportunities`에서 기본정보와 매출/원가 line을 RDB 원장에 저장하고, `POST /crm/opportunities/:id/confirm|reopen`에서 현재 차수 확정 잠금을 토글하며, 저장 후 `sourceApp: "crm"`/`entityType: "opportunity"` AI index job을 queue한다. CRM 웹은 SSOO shell 안에서 영업기회 create/edit/confirm/reopen panel을 제공하고, 견적/계약/DMS/PMS 연결은 계속 후속 상태로 분리한다.

* **server, types, scripts, docs:** AI/RAG 중앙 공용 기반과 service rollout backlog의 진척도를 분리했다. 공용 job 운영 endpoint는 system-override/admin guard를 요구하고, pending job 실행은 `AiIndexWorkerService` boundary를 통과하며, env-gated `AiIndexSchedulerService`와 `/ai-index/jobs/metrics`가 scheduler binding 및 runnable/pending/running/failed/exhausted/retry-waiting queue 상태를 제공한다. `verify:ai-rag-central-foundation:complete`는 provider-ready report 없이는 실패하도록 고정해 100% 완료 주장을 provider-ready runtime evidence에 묶었고, 직접 실행 시에도 `verify:ai-rag-runtime-report --provider-mode=ready`를 재실행해 source coverage/retrieval audit/Ask audit/legacy-common comparison schema를 통과한 artifact만 완료 증거로 인정한다. provider-ready precheck는 Managed Identity를 암묵 credential로 보지 않고 `AZURE_USE_MANAGED_IDENTITY=true`가 명시된 경우에만 인정한다. `record:ai-rag-provider-ready-evidence`는 provider-ready report/summary digest를 roadmap/handoff에 기록한 뒤 central completion gate가 그 기록을 검증하도록 하며, provider-ready workflow는 dry-run evidence block artifact를 생성한다. `complete:ai-rag-central-foundation`은 provider-ready precheck, live smoke, report verification, evidence recording, central completion gate를 한 순서로 묶고, workflow `provider_mode=ready`는 `--docker-runtime --docker-runtime-cleanup --dry-run`으로 같은 runner를 통해 live smoke와 evidence block artifact를 생성한다. 검증 host에서도 같은 Docker runtime mode로 Docker server runtime start, `/api/health` 대기, non-volume cleanup까지 수행할 수 있으며, `--env-file`/`AI_RAG_PROVIDER_READY_ENV_FILE`과 `compose.yaml` Azure OpenAI interpolation으로 provider-ready env file을 smoke runner와 Docker server runtime에 같은 기준으로 전달할 수 있다. `verify:ai-rag-evidence-recorder`와 `verify:ai-rag-central-foundation:flow` self-test는 temp ready report/summary/evidence-block/docs-digest flow를 runtime/central completion verifier에 통과시키고, AI/RAG 변경 시 preflight/push-guard에서 실행된다. Roadmap 기준 전체 platform progress는 77.90%, central common foundation progress는 89.26%로 기록했다.

* **server, scripts, docs:** SNS post AI index adapter와 저장 이벤트 queue hook을 추가했다. `SnsAiIndexAdapter`는 active post row, board/category/tag/count metadata, conservative visibility ACL snapshot을 provider-gated `AiIndexObjectProjection`으로 변환하고, `PostService`는 post create/update/delete 후 `sourceApp: "sns"`/`entityType: "post"` job을 queue한다. Runtime source coverage는 이제 DMS/CRM/PMS/SNS를 `registered`, Admin을 `missing_adapter`로 검증한다. `AI-RAG-08C`는 board/comment projection, controlled backfill, provider-ready vector evidence가 남은 partial 상태다.

* **server, database, web-crm, types, scripts, docs:** CRM customer/activity 원장과 AI projection 1차를 추가했다. `crm.crm_customer_m`/`crm.crm_customer_activity_d`와 history trigger, opportunity row 기반 migration/seed backfill, `/crm/customers`와 `/crm/customers/:id/activities`, web-crm proxy route, 공용 검색 고객 결과를 추가했고, `CrmAiIndexAdapter`가 opportunity/customer/activity를 provider-gated `AiIndexObjectProjection`으로 변환한다. `CustomerService`는 customer create/update와 activity create 후 `sourceApp: "crm"`/`entityType: "customer"|"activity"` job을 queue한다. 이 시점의 `AI-RAG-08A`는 controlled backfill endpoint, customer/activity object policy refinement, provider-ready vector evidence가 남은 partial 상태였다.

* **server, database, scripts, docs:** CRM opportunity RDB ledger와 AI index adapter를 추가했다. `crm.crm_opportunity_m`/`crm.crm_opportunity_line_d`와 history trigger/seed를 도입하고, CRM opportunity service를 fixture 대신 RDB read model로 전환했으며, `CrmAiIndexAdapter`가 opportunity와 매출/원가 line을 provider-gated `AiIndexObjectProjection`으로 변환한다. `AI-RAG-08A`는 customer/activity projection, controlled backfill, provider-ready vector evidence가 남은 partial 상태다.

* **server, types, scripts, docs:** PMS task controlled AI index backfill endpoint를 추가했다. `POST /projects/:projectId/tasks/ai-index/backfill`은 `canManageTasks` 프로젝트 capability 범위에서 active task row를 제한된 batch로 `sourceApp: "pms"`/`entityType: "task"`/`jobType: "backfill"` job에 enqueue하고, `@ssoo/types`는 task backfill 요청/응답 계약을 제공한다. `AI-RAG-08B`의 남은 PMS 기준은 provider-ready vector/RAG evidence다.

* **server, scripts, docs:** PMS task RDB projection과 저장 이벤트 AI index queue hook을 추가했다. `PmsAiIndexAdapter`는 task row, WBS, assignee, project/member/org ACL snapshot을 `entityType: "task"` projection으로 변환하고, `TaskService`는 task create/update/delete 후 `sourceApp: "pms"`/`entityType: "task"` job을 queue한다. Provider-ready vector/RAG evidence는 `AI-RAG-08B` 잔여로 남긴다.

* **server, types, scripts, docs:** PMS project controlled AI index backfill endpoint를 추가했다. `POST /projects/ai-index/backfill`은 system-override/admin 권한에서 active project row를 제한된 batch로 `sourceApp: "pms"`/`entityType: "project"`/`jobType: "backfill"` job에 enqueue하고, `@ssoo/types`는 backfill 요청/응답 계약을 제공한다. Provider-ready vector/RAG evidence는 `AI-RAG-08B` 잔여로 남긴다.

* **server, scripts, docs:** PMS project 저장 지점을 공용 AI index job queue에 연결했다. `ProjectService`는 project create/update/delete, request/proposal/execution/transition detail upsert, stage transition 후 `sourceApp: "pms"`/`entityType: "project"` job을 queue하고, queue 실패는 PMS 도메인 저장 실패로 전파하지 않는다. Provider-ready vector/RAG evidence는 `AI-RAG-08B` 잔여로 남긴다.

* **server, scripts, docs:** PMS project RDB AI index adapter를 추가했다. `PmsAiIndexAdapter`는 PMS project/detail/status/member/org 데이터를 `AiIndexObjectProjection`으로 변환하고 ACL snapshot, PMS target, provider-gated semantic/vector/RAG capability를 등록한다.

* **server, scripts, docs:** AI/RAG adapter projection runtime validator를 추가했다. `AiIndexingService`는 adapter가 반환한 `AiIndexObjectProjection`을 DB/object/chunk/embedding write 전에 검증하며 source/target drift, ACL search/context eligibility 역전, invalid JSON metadata/snapshot, duplicate/empty chunk를 차단한다.

* **scripts, docs:** AI/RAG runtime smoke report에 planned source coverage evidence를 추가했다. `/ai-index/status` 전체 조회 결과를 `sourceCoverage`로 남기고, `verify:ai-rag-runtime-report`가 registered/missing adapter 상태를 검증한 뒤 Markdown summary를 생성한다.

* **server, types, docs:** `/ai-index/status`가 planned source coverage를 반환하도록 보강했다. 등록된 adapter는 `registrationStatus: "registered"`로 유지하고, 아직 adapter가 없는 planned source는 `registrationStatus: "missing_adapter"`로 노출해 adapter 확장 잔여가 상태 API에서 숨지 않도록 했다.

* **packages/types, docs:** AI/RAG retrieval 타입 계약의 legacy/common 명칭을 명시화했다. 기존 호환 `AiRetrieval*` 계약은 `AiLegacyRetrieval*` alias로 라벨링하고, common RAG retrieval은 `CommonAiRetrieval*` alias를 타입 패키지에서 직접 제공해 web assistant 확장 시 사용할 계약을 고정했다.

* **scripts, ci, docs:** AI/RAG runtime smoke report verifier가 Markdown evidence summary를 생성하도록 보강했다. 수동 runtime workflow는 검증된 JSON report와 함께 `ai-rag-runtime-smoke-${provider_mode}.md` summary artifact를 업로드하며, provider-ready 결과 기록은 이 summary를 기준으로 한다.

* **scripts, ci, docs:** AI/RAG runtime smoke report verifier를 추가했다. `verify:ai-rag-runtime-report`는 smoke JSON의 schema/provider mode/source capability/retrieval audit/Ask audit/legacy-common comparison evidence를 검증하며, 수동 runtime workflow는 artifact 업로드 전에 이 검증을 통과해야 한다.

* **scripts, ci, docs:** AI/RAG runtime smoke의 구조화 report 산출과 GitHub Actions artifact 업로드를 추가했다. `AI_RAG_SMOKE_REPORT_PATH`를 지정하면 provider mode, DMS fixture, retrieval summary, DB row counts, audit counts, legacy/common comparison summary를 JSON으로 남기고, 수동 workflow는 `ai-rag-runtime-smoke-${provider_mode}` artifact로 업로드한다.

* **scripts, docs:** `verify:ai-rag-runtime` provider-ready mode에 legacy/common retrieval 비교를 추가했다. 같은 DMS smoke fixture에 대해 legacy `dms_document_embeddings` chunk와 common retrieval result/context가 모두 query needle을 포함해야 통과한다.

* **ci, scripts, docs:** AI/RAG runtime workflow의 provider mode별 server 환경 주입을 분리했다. `.github/workflows/ai-rag-runtime.yml`은 `provider_mode=ready`에서만 Azure OpenAI secrets를 server `.env`에 쓰고, `provider_mode=unavailable`에서는 placeholder/empty provider env를 주입해 repository secrets 존재 여부와 무관하게 fallback/stale smoke를 검증한다.

* **scripts, ci, docs:** AI/RAG provider-ready runtime smoke의 CI/운영 진입점을 추가했다. `verify:ai-rag-runtime:ready-precheck`, `verify:ai-rag-runtime:ready`, `verify:ai-rag-runtime:unavailable` 스크립트를 분리하고, `.github/workflows/ai-rag-runtime.yml` 수동 workflow가 Azure OpenAI secrets precheck 후 Docker server stack에서 provider-ready 또는 unavailable runtime smoke를 실행하도록 고정했다.

* **scripts, codex, docs:** AI/RAG 정적 guard를 Codex preflight/push-guard에 연결했다. AI/RAG 관련 서버/DB/type/script/docs 경로가 바뀌면 `pnpm run verify:ai-rag-platform`이 자동 실행되며, provider-ready live smoke는 실제 Azure embedding 환경이 필요한 별도 runtime gate로 유지한다.

* **scripts, docs:** `verify:ai-rag-runtime` ready mode에 Azure OpenAI 환경 사전 점검을 추가했다. live ready smoke는 기본적으로 endpoint, embedding deployment, credential 입력이 없거나 placeholder이면 서버 호출 전에 실패하며, dry-run은 provider env readiness와 누락 항목을 출력한다.

* **scripts, docs:** `verify:ai-rag-runtime`의 provider-ready 검증 범위를 보강했다. embedding/context assertion 이후에도 retrieval log header/item audit와 DMS Ask run/run-source audit를 계속 확인해 provider-ready smoke가 vector 생성만으로 통과하지 않도록 했다.

* **scripts, docs:** 강화된 retrieval log item audit 기준을 적용한 상태로 `verify:ai-rag-runtime` provider-unavailable smoke를 로컬 Docker Postgres에서 재통과시켰다. 실행 fixture는 `verify-ai-rag/runtime-smoke-2026-07-02T04-05-56-006Z.md`이며, DMS 저장, common AI job, retrieval query, DMS Ask audit path, DB row 검증을 통과했다.

* **server, scripts, docs:** AI/RAG runtime smoke 기반을 추가했다. DMS `DmsAiIndexAdapter`의 `semantic`/`vector`/`ragContext` capability는 embedding provider readiness를 따르며, `verify:ai-rag-runtime`은 DMS smoke 문서 저장, common AI source/job/retrieval, DMS Ask audit, `common.cm_ai_*` DB row를 provider unavailable/ready mode로 검증한다.

* **server, database, scripts, docs:** AI/RAG provider-unavailable runtime smoke를 Docker Postgres에서 통과시켰다. placeholder embedding deployment 환경에서 DMS 저장 지점이 common object/chunk/state stale projection, retrieval log, DMS Ask conversation/run audit를 남기는 것을 확인했고, runtime smoke는 반복 실행 시 DMS collaboration isolation을 피하도록 고유 fixture path를 사용한다.

* **server, scripts, docs:** 공용 AI model gateway를 추가해 DMS Ask의 chat generation/stream 실행 경계를 `CommonAiIndexModule`로 이동했다. Gateway는 Azure chat provider readiness와 deployment/model metadata를 제공하며, DMS Ask run audit는 provider/model/deployment 값을 gateway status 기준으로 기록한다.

* **server, scripts, docs:** DMS Ask를 공용 AI/RAG retrieval와 conversation/run audit 경로에 연결했다. AskService는 `CommonAiIndexModule`의 retrieval 결과를 기존 DMS Ask `sources`/`citations` 응답 shape로 매핑하고, `retrievalLogId`/context item/source를 conversation message와 run-source audit에 남긴다. 공용 retrieval이 비거나 실패하면 기존 DMS SearchService 기반 legacy vector/keyword 검색으로 fallback한다.

* **web-shell, web-auth, web-dms, scripts, docs:** 완성 settings page recipe를 `SsooSettingsPage`로 `@ssoo/web-shell`에 승격했다. DMS 설정 화면은 `SETTING_SECTIONS`, store/API, validation, JSON/diff/custom slot body만 주입하는 adapter로 축소했고, 공용 계정 설정 route는 `createSsooSettingsPageContentPageElement()`와 `useSsooSettingsPageHeaderActions()`를 통해 같은 settings page template을 소비한다. `verify:ssoo-frame`은 DMS `PageTemplate` 기반 설정 page 조립과 account settings의 settings recipe 우회를 차단한다.

* **server, types, scripts, docs:** 공용 AI/RAG conversation/run service를 추가했다. `CommonAiIndexModule`은 conversation 생성/조회/갱신, message/reference append, model run start/complete, run-source audit를 `/ai-index/conversations/*` API로 제공하고, 모든 conversation read/write는 현재 사용자 owner 범위로 제한한다. `@ssoo/types/common/ai`에는 conversation update 계약을 보강했다.

* **server, scripts, docs:** 공용 AI/RAG retrieval log와 context/citation assembly를 추가했다. `CommonAiIndexModule` retrieval query는 `contextItems`와 `citations`를 응답하고, `common.cm_ai_retrieval_log_m`/item에 request/result/context audit를 transaction으로 남기며, log가 남은 context가 있을 때만 `ragReady` capability를 true로 올린다.

* **server, types, scripts, docs:** 공용 AI/RAG retrieval query service를 추가했다. `CommonAiIndexModule`은 `/ai-index/retrieval/query`에서 query embedding, `cm_ai_embedding_m` vector search, keyword fallback, hybrid ranking, ACL snapshot pre-filter를 수행하고, stale index state나 hash/profile 불일치 embedding은 후보에서 제외한다. 이 06A 단계에서는 context/citation assembly와 retrieval log를 skeleton으로 유지하며 `ragReady`를 false로 뒀다.

* **server, types, scripts, docs:** AI/RAG embedding job safety를 보강했다. 공용 AI index job은 embedding batch size, retry/backoff, max attempt 정책을 metadata로 고정하고, provider unavailable/runtime failure/profile mismatch reindex 상태를 job/state metadata와 반환 계약에 기록한다. 변경된 chunk의 stale embedding은 비활성화된 뒤 batch 단위로 재생성되며, partial failure는 retry 대상 job으로 남긴다.

* **server, database, types, docs:** AI/RAG platform 기준선을 재수립했다. `@ssoo/types/common`에 `ai`, `ai-index`, `ai-retrieval` 계약을 복원하고, `common.cm_ai_*` data plane과 source/object/index-state history trigger를 Prisma schema/migration에 추가했으며, 서버 `CommonAiIndexModule`이 adapter registry, source status, job queue/run, projection apply를 제공한다. DMS는 `DmsAiIndexAdapter`를 첫 reference adapter로 등록해 markdown 문서를 공용 AI index projection에 동기화한다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 내부 페이지 route registry를 `contentPage` 단일 계약으로 잠갔다. PMS/CRM/SNS/Admin 로컬 페이지와 DMS 홈/stale handoff는 승인된 adapter boundary를 통과하는 `contentPage`로 승격했고, `legacyException` route kind/type export와 verifier 허용 경로를 제거했다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** content-area 내부 페이지 타입 게이트 기반을 추가했다. 앱 ContentArea는 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry`만 소비하고, 탭 route는 `contentPage`/`legacyException`으로 분류한다. 저수준 `SsooMdiTabbedContentArea`는 root public API에서 내리고, `verify:ssoo-frame`이 5개 앱 registry 소비와 DMS route 분류를 검증한다.

* **web-shell, web-dms, scripts, docs:** `contentPage.render`를 branded `SsooMdiContentPageElement` 반환 계약으로 강화했다. 직접 recipe는 `createSsooContentPageTemplateElement()`, 승인된 domain adapter는 `SSOO_CONTENT_PAGE_ADAPTER_NAMES`의 `adapterName`과 `createSsooContentPageAdapterElement()`를 사용하며, DMS 문서/설정/AI page는 `DMS PageTemplate` adapter boundary를 통과한다.

### Bug Fixes

* **server, PMS, docs:** 공용 `serializeBigInt()`가 Prisma `Decimal` 값을 일반 객체로 재귀 분해해 `{s,e,d}` 내부 표현을 API에 노출하던 문제를 수정했다. Decimal은 숫자로, BigInt 식별자는 문자열로 직렬화하는 회귀 테스트를 추가해 PMS 일일 공수 생성/조회 응답 계약을 복구했다.

* **server, AI/RAG, docs:** `/ai-index/status`가 DB에 남은 과거 `cm_ai_source_m` 행을 현재 adapter 등록 증거로 오인하던 문제를 수정했다. 상태 API는 이제 live `AiIndexRegistryService`에 실제 등록된 source만 `registered`로 반환하고, adapter가 없는 Admin은 stale source metadata가 있어도 `missing_adapter`로 유지한다.

* **database, docker, docs:** legacy AI/RAG local volume에서 `DB_INIT_PRISMA_PUSH_MODE=auto`가 `prisma db push`를 건너뛰어도 CRM seed 전에 계약 원장, 견적 workflow, 견적 공급자 protected baseline migration을 적용하도록 `db-init`을 보강했다. 이 보강은 CRM 원장 재현성 수정이며, PMS는 계속 실행 프로젝트와 읽기용 계약/인계 스냅샷만 소비한다.

* **types, server:** CRM opportunity version list response/summary 타입을 CRM 타입 공개 진입점에서 재수출해 Docker의 서버 클린 빌드에서 opportunity version API 타입 import가 실패하지 않도록 보정했다.

* **database, docker, docs:** legacy AI/RAG local volume에서 `DB_INIT_PRISMA_PUSH_MODE=auto`가 `prisma db push`를 건너뛰는 경우에도 CRM opportunity seed 전에 CRM ledger protected baseline migration을 적용하도록 `db-init`을 보강했다. 이로써 기존 volume에 `crm.crm_opportunity_m`이 없을 때 `52_crm_opportunities.sql`에서 compose 기동이 중단되는 문제를 막는다.

* **database, docker, scripts, docs:** `db-init`에 `DB_INIT_PRISMA_PUSH_MODE=auto|force|skip`를 추가했다. 기본 auto mode는 compat SQL 적용 후 pre-roadmap `common.cm_ai_*` legacy column/table을 감지하면 destructive column drop 후보를 피하기 위해 `prisma db push`를 건너뛰고 seed/trigger apply를 계속한다. `--accept-data-loss`는 사용하지 않는다.

* **server, scripts, docs:** Azure embedding provider readiness가 `<embedding-deployment>` 같은 placeholder 값을 실제 deployment로 오판하지 않도록 보정했다. placeholder 값은 `placeholder_embedding_deployment` unavailable 상태로 남고, DMS vector/RAG capability와 runtime smoke 기대값도 provider unavailable/fallback 기준을 따른다.

* **database, docker, docs:** 기존 로컬 DB volume에 pre-roadmap `common.cm_ai_*` WIP row가 남아 있을 때 runtime schema가 맞지 않던 문제를 보정했다. `packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql`은 legacy AI/RAG WIP table을 삭제하지 않고 canonical runtime column/table/default/index를 추가하며, history trigger 재적용과 함께 DMS common projection smoke를 통과한다. `prisma db push --accept-data-loss`는 사용하지 않는다.

* **ci, scripts, docs:** 수동 deploy가 실행 container의 image object 누락으로 backup 도중 중단되고도 pipeline이 green으로 남던 문제를 보완했다. 전체 commit/rollback source preflight 후에만 completed backup manifest를 기록하고, 누락 image는 application-container snapshot으로 보존한다. Docker content store 손상으로 `docker commit`도 실패하면 실행 filesystem을 export하고 기존 실행 metadata를 재적용한 평탄화 image로 fallback한다. Compose 변경 이후 실패는 이전 image set 자동 복원과 health/image parity까지 검증하며, `deploy_dev`는 manual 상태를 유지하되 non-optional로 전환해 배포 전에는 blocked, 성공 시 success, 실패 시 failed로 표시한다.

* **ci, docker, scripts:** clean verify image에서 Prisma client가 생성되지 않아 server test가 초기화 전에 실패하던 문제를 수정했다. lockfile install 직후 `@ssoo/database db:generate`를 실행해 host의 기존 generated client에 의존하지 않도록 했다.

* **ci, docker, scripts, docs:** GitLab shell runner host에 `pnpm`이 없어 실제 verify가 시작되지 못하던 문제를 수정했다. verify는 exact commit source와 lockfile 의존성을 담은 저장소 정본 Node 22/pnpm 11.13.1 이미지에서 contract/preflight/lint/server test를 실행하고, Git metadata만 read-only mount해 host 전역 패키지 설치에 의존하지 않는다.

* **ci, scripts, docs:** persistent shell runner에 보존된 운영자 `.env.*`/`compose.yaml.bak*` 백업 때문에 exact-SHA source 검증이 실패하던 문제를 수정했다. 해당 백업 패턴만 Git status와 Docker build context에서 명시적으로 제외하고, 그 외 non-ignored 잔여 파일은 계속 build 전에 차단한다.

* **ci, scripts, docs:** GitLab shell runner가 정확한 pipeline commit 대신 persistent `/opt/ssoo/app`의 stale `origin/development`로 Docker image를 만들던 문제를 수정했다. 자동 verify/AI/build와 수동 deploy 경계는 유지하면서 host `flock`으로 APP_DIR/Docker job을 직렬화하고 exact `CI_COMMIT_SHA` fetch/reset/assert를 강제했으며, 실제 preflight/lint/server test, 실행 중 image 백업, health fail-closed, commit-tagged image/container ID parity 검증을 추가했다.

* **web-auth, web-shell, scripts, docs:** 공용 사용자 프로필 surface가 `neutral` page tone으로 렌더링되어 다른 표준 content page와 배경 톤이 어긋나던 문제를 수정했다. `SsooContentPageTemplate`에 `profile` semantic tone을 추가하고, `@ssoo/web-auth` user-surface content-page helper가 프로필은 `profile`, 계정 설정은 `settings` tone으로 중앙 선택하도록 고정했으며, `verify:ssoo-frame`/`verify:auth-commonization`이 profile tone의 `neutral` 회귀를 차단한다.

* **web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 공용 user profile/settings 접근 경로의 잔여 레거시 기본값과 앱 로컬 handoff parser를 제거했다. `@ssoo/web-auth` account center resolver 기본 href를 canonical `/__user/profile/me`, `/__user/settings`로 고정하고 `/profile/*`, `/settings` 입력은 `normalizeSsooUserSurfaceRouteEntryPath()`/`parseSsooUserSurfaceRouteEntry()` shared helper boundary에서 canonical path로 정규화한다. 5개 앱 middleware는 canonical `/__user/*` route-entry를 shared route-policy rewrite로 루트 셸에 연결하고, SNS middleware만 legacy `/profile/*`, `/settings` direct entry를 route-only `@ssoo/web-auth/user-surface-routing` subpath로 canonical `/__user/*`에 redirect한다. Admin/CRM/PMS/DMS layout bootstrap은 direct `/__user/*` browser entry를 `parseSsooUserSurfaceRouteEntry()`/`getSsooUserSurfaceTabId()`로 canonical user-surface MDI tab에 연결한다. `verify:auth-commonization`/`verify:ssoo-frame`이 레거시 기본값, 앱 로컬 route construction, SNS 한정 middleware canonicalization, direct route tab bootstrap 누락 재유입을 차단한다.

* **server, types, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, docs:** DMS AI 검색 잔여 화면을 전역 통합 검색으로 흡수했다. DMS `/ai/search` 내부 탭과 호환 alias는 제거하고 DMS 검색 진입점은 `/ssoo/search` 전체 앱 검색 하나로 고정했으며, 기본 검색 요청은 `sourceApp` 없이 모든 provider를 대상으로 실행된다. source filter chip을 선택한 경우에만 `sourceApp` query와 요청 filter가 적용되고, CRM provider는 `OpportunityService`를 재사용해 영업기회 결과를 전역 검색에 등록한다. 기존 DMS AI 검색의 sidecar, 검색 기록, 인기 검색어, 내 자주 검색, AI 첨부 동작은 공용 `SsooAiSearchPage`/`SsooGlobalSearchPage` 경로에서 유지하고, DMS 문서 결과는 공용 검색 계약이 `excerpt`/`summarySource`/`totalSnippetCount`/`readRequest`를 보존해 기존 DMS 결과 카드 표현을 유지한다.

* **server, types, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** header 통합 검색을 중앙화했다. 5개 앱 header는 `useSsooGlobalHeaderSearch`를 통해 검색 상태/Enter 처리/`/ssoo/search?q=` path/title/icon 생성을 공유하고, 앱은 검색 가능 여부와 통합 검색 탭을 여는 navigation adapter만 주입한다. 전역 검색 페이지는 API base URL과 cross-app URL map을 `@ssoo/web-auth` 기본 resolver에 맡기며, 서버 공용 검색 응답은 `keyword`/`metadata`/`semantic`/`vector`/`ragContext` capability를 분리하고 `ragReady`를 실제 RAG context 제공 여부에만 연결한다.

* **server, web-shell, web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 공용 user profile/settings 표면의 잔여 렌더링 drift를 차단했다. 5앱 canonical `/__user/profile/:userId`와 `/__user/settings` route-entry를 shared route-policy rewrite로 루트 셸에 연결해 RSC prefetch/direct entry 404를 막고, SNS local `ProfilePage`/`SettingsPage`를 제거해 legacy `/profile/*`/`/settings`는 canonical `__user` route handoff로만 남겼으며, 피드 내부 프로필/설정 링크는 `@ssoo/web-auth` helper로 통일했다. shared user surface 내부의 중복 page-level `내 설정` 제목과 별도 `max-w-*`/`mx-auto` 폭 재정의를 제거하고, SNS profile GET은 side-effect free로 유지하되 mutation 이후에만 `user.profile.updated` domain event를 발행하도록 보정했다.

* **server, web-auth, web-dms, web-sns, scripts, docs:** 통합 검색 공용화 잔여물을 정리했다. 서버 `/api/search`는 앱별 provider registry만 조합하고 DMS `SearchService`/CRM opportunity/PMS customer/SNS profile 데이터를 common service에서 직접 조회하지 않으며, Admin 결과는 `system.override` access foundation 권한으로 제한한다. 5개 앱 전역 검색 페이지는 `useCommonGlobalSearchAdapter`를 소비하도록 정렬했고, DMS의 폐기된 `ai-search.store.ts` export와 user-scope guard 항목을 제거했으며 `verify:ssoo-frame`이 이 회귀를 차단한다.

* **web-shell, web-auth, scripts, docs:** 공용 사용자 profile/settings surface가 `contentPage` route로 전환됐지만 shared-surface helper와 내부 root에서 `fluid`/`transparent`/`max-w-*` 폭 override를 걸어 표준 page 폭과 tone surface를 우회하던 문제를 수정했다. 이제 helper는 `SsooContentPageTemplate`의 기본 constrained main 폭을 유지하면서 `contentSurface="plain"`으로 page tone이 보이게 하고, `verify:ssoo-frame`이 해당 override 재유입을 차단한다.

* **web-shell, web-sns, scripts, docs:** `shellPage` route kind와 `ShellPageContainer` public export를 제거하고, main-only/canvas 화면은 `SsooContentPageTemplate`의 `pageVariant="main-only"`/`pageVariant="canvas"` recipe로 표현하도록 정리했다. SNS legacy local page wrapper는 `SsooContentAreaSurface`로 내려 두고 전환 대상으로 유지한다.

* **web-shell, web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 공용 사용자 profile/settings surface를 과거 예외 route에서 `contentPage` route로 전환했다. 5개 앱은 `createSsooSharedSurfaceContentPageElement()`를 통해 동일한 page chrome/template을 소비하고, SNS `/profile/*`/`/settings` legacy 탭은 canonical `__user` route로 인계한다.

* **web-dms, scripts, docs:** 설정 모드의 앱 상단 header slot과 `SsooAppHeader` shell은 유지하되 내부 content를 비워 검색 입력, 사용자 메뉴, 설정 제목/보조문구를 제거하고 settings sidebar brand 영역은 뒤로가기 버튼과 `설정` 단일 title만 표시하도록 정리했다.

* **server, web-auth, scripts, docs:** 공용 사용자 표면을 여러 앱/탭에서 동시에 열 때 프로필/피드 refresh와 알림 SSE 구독이 throttle을 빠르게 소모해 `Too Many Requests`가 표시되던 문제를 보정했다. 알림 SSE는 throttle quota에서 제외했다. `@ssoo/web-auth` 사용자 표면은 GET dedupe와 refresh debounce/in-flight queue로 같은 프로필/피드 조회 폭주를 묶는다.

* **web-shell, web-admin, web-sns, web-dms, scripts, docs:** SSOO frame 4슬롯 표현 계층의 잔여 escape hatch를 정리했다. legacy `ShellFrame` root export와 app frame/sidebar 폭 override, MDI tabbar height/class override를 제거하고, SNS content Suspense fallback과 Admin header user-menu loading state를 공용 `web-shell` 표면으로 이동했으며, DMS global CSS의 legacy shell/tree selector와 stale frame 치수 문서를 정리했다.

* **web-shell, docs:** 공용 알림센터 typography가 DMS 전용 Tailwind text token과 과한 font weight에 의존하던 drift를 정리했다. 패널은 전역 `--font-sans`를 계속 상속하되 카드/칩/버튼/empty state의 weight를 낮추고, 공유 semantic text utility는 `ssoo-global.css`에서 5개 앱 공용으로 보장한다.

* **web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, docs:** header 알림센터 상단에 공용 `전체`/앱별 filter chip과 unread badge를 추가했다. 기본 view와 header badge는 사용자 전체 알림을 유지하고, 각 앱은 현재 앱 chip 우선순위만 힌트로 제공하며, 선택된 chip은 목록/모두 읽음 범위만 바꾼다.

* **web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, server, scripts, docs:** header 알림센터를 앱별 source inbox가 아니라 사용자 전체 알림 surface로 정렬했다. 5개 앱 모두 `useCommonNotificationCenter`를 source filter 없이 소비하고 같은 `SsooHeaderNotificationCenter` 패널 문구/dim/read-state 표면을 사용하며, source app/path resolver로 알림 대상 앱으로 전환한다. DMS 도메인 부작용은 SSE 콜백으로만 유지하고, SNS legacy bridge는 가능한 reference path를 공통 알림 payload에 싣도록 보강했다.

* **web-shell:** 공용 MDI 탭 item의 drag 영역과 click 영역이 갈라져 일부 padding/status/icon 주변 클릭이 탭 전환으로 처리되지 않던 문제를 수정했다. 탭 item 전체 hit-area가 클릭 시 활성화되고, 실제 drag 시에만 reorder되도록 정렬했으며 cursor도 공용 tab item에서 pointer 기준으로 통일했다.

* **web-auth:** 공용 알림 SSE 프록시와 EventSource 재연결을 안정화했다. 백엔드 스트림 fetch/pipe 오류는 500 응답 대신 짧은 SSE retry frame으로 닫고, 브라우저 EventSource는 오류 시 즉시 반복 재시도하지 않도록 공용 연결 단위 백오프로 재연결한다.

* **web-auth:** 공용 알림센터가 앱별 인라인 `onError`/`onNotification` 콜백 identity 변화에 반응해 `refresh` effect와 EventSource 구독을 매 렌더마다 재실행하던 루프를 차단했다. 최신 콜백은 ref로 보관하고 네트워크/SSE 연결은 `sourceApp`/path/enabled 변경에만 갱신되도록 고정했다.

* **web-auth:** 공용 알림 API의 기본 `fetch` 호출을 `globalThis` 기준으로 바인딩하고 동일 오류 토스트를 중복 억제해, 브라우저에서 `Failed to execute 'fetch' on 'Window': Illegal invocation` 알림이 반복 표시되는 문제를 차단했다.

* **web-shell, web-auth, web-admin, web-crm, web-pms, web-sns, web-dms, scripts, docs/common:** 5개 앱 메인 header의 검색/생성 CTA/알림 slot/사용자 메뉴 dropdown 폭을 같은 `SsooAppHeader` 표면 계약으로 고정했다. Admin도 알림센터 적용 대상에 포함해 same-origin `/api/notifications/*` proxy와 공용 notification hook/panel surface를 연결했고, CRM primary CTA는 목록 새로고침이 아니라 새 기회 생성 진입점으로 정렬했다.

* **server, web-auth:** 공용 알림 source에 CRM을 포함하고, 알림 SSE 전역 구독이 source-app 도메인 이벤트도 받을 수 있게 보강했다. 알림 ID는 BigInt 변환 전 검증해 잘못된 ID 요청이 500으로 번지지 않도록 했다.

* **web-auth, web-crm, web-pms, web-sns, web-dms:** 알림 상태 변경 프록시에 공용 CSRF/Origin/Referer 검증을 적용하고, CRM/PMS/SNS에도 동일한 same-origin `/api/notifications/*` 프록시 route factory를 연결했다. DMS 기존 명시 route는 같은 공용 프록시 helper 보강을 통해 보호된다.

* **server, web-dms:** `storage/open?download=1` 다운로드를 same-origin session-backed binary proxy와 서버 직접 binary response로 고정했다. 배포 환경에서 인증 복원 없이 받은 JSON/redirect 응답이 파일로 저장되는 흐름을 막고, `Content-Disposition` 에 ASCII fallback `filename` + UTF-8 `filename*` 를 함께 내려 한글 파일명 호환성을 보강했다.

* **web-dms:** settings mode가 active tab과 분리된 상태로 남아 문서 생성, 파일 열기, AI 검색 같은 non-settings 탭 활성화 뒤 다시 설정 화면으로 전환될 수 있던 상태 drift를 차단했다. `useSettingsPageNavigationStore`가 `useTabStore`의 active tab path를 구독해 `/settings/{scope}/{sectionId}`에서는 settings mode를 켜고, 그 외 탭에서는 즉시 settings mode를 해제한다.

* **web-shell, web-dms:** keep-alive MDI 비활성 pane이 소비 앱의 `flex` display class와 충돌해 document pane과 settings pane이 동시에 보이던 문제를 공용 `SsooMdiContentPane`에서 차단했다. 비활성 pane 숨김을 Tailwind `hidden` class가 아니라 inline `display: none` guard로 보장하고, 런타임 확인용 `data-ssoo-mdi-active` 표식을 추가했다.

* **web-shell, web-crm, web-admin, web-dms, web-pms, web-sns:** main frame content area의 앱별 pane format override를 제거했다. `SsooMdiTabbedContentArea`가 pane class/scroll/tone을 받지 않도록 고정하고, CRM/Admin/DMS/PMS/SNS는 탭 데이터와 page render adapter만 주입한다. PMS/DMS tabbar height 재주입과 SNS route tabbar stale 문서/상수도 정리했다.

* **web-dms:** 로그인 후 DMS 본체 hydrate 단계에서 React 최대 업데이트 깊이 오류로 `Application error` 화면이 표시되던 문제를 수정했다. `AppLayout`의 tab store selector를 원시값 selector로 분리해 Zustand snapshot 갱신 루프를 차단하고, Docker 반영 후 Playwright 로그인 재현으로 홈 화면 렌더링을 확인했다.

* **web-auth, web-dms, web-sns, types, scripts, docs:** 로그인 통합 잔여 gap을 닫았다. DMS binary/SSE session-backed proxy helper를 `@ssoo/web-auth` 공용 helper로 승격하고, SNS auth display 필드는 `AuthIdentityProfileProjection`으로 타입화했으며, DMS auth 초기화 문서를 실제 fragment layout + `SharedAuthLoginPage` 소유 구조로 갱신했다.

* **web-dms, scripts, docs:** DMS settings mode에서 shell variant와 active content tab이 불일치해 문서 `DocumentPanel`이 설정 화면에 남는 혼합 상태를 차단했다. `AppLayout`은 settings mode와 현재 settings tab을 첫 페인트 전에 동기화하고, `ContentArea`는 settings mode에서 문서 pane을 active로 렌더링하지 않는다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, server, scripts, docs:** 인증 user-scope lifecycle을 공용화했다. `@ssoo/web-auth`가 auth storage sync, user-scope transition registry, query cache reset hook을 소유하고 5앱 provider가 동일하게 소비하도록 정렬했으며, DMS login/logout reset 예외와 서버 direct `/api/auth/refresh` 엔드포인트를 제거했다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 로그인 통합 gap zero hardening을 적용했다. Admin login adapter 를 `APP_HOME_PATH` 상수 기준으로 정렬하고, 5앱 password reset 요청을 동일 same-origin proxy 로 이동했으며, browser-facing auth proxy allowlist 에서 body 기반 `refresh` 를 제거하고 auth lifecycle verifier 에 CSRF/Origin 하드닝 헤더를 반영했다.

* **web-crm, scripts, docs:** CRM auth route 의 중복 `X-SSOO-App` stamping wrapper 를 제거해 5앱 `/api/auth/[action]` route 를 동일 thin adapter 로 정렬했다. `verify:auth-commonization` 은 auth route 의 앱별 header mutation 재유입을 차단하고, 문서는 DMS/PMS/SNS user-scoped cleanup/profile projection 만 의도적 앱별 예외로 명시한다.

* **web-auth, web-shell, web-admin, web-pms, web-sns, web-dms, server, docs:** 로그인 통합 잔여 drift/security hardening을 적용했다. Admin/PMS/SNS Axios 인증 인터셉터를 `createSharedAxiosApiClient` 로 공용화하고 browser-facing refreshToken 타입/스토어 표면을 제거했으며, 5앱 Next 보안 헤더, DMS Markdown DOMPurify sanitizer/URL protocol allowlist/Mermaid strict mode, 서버 auth 민감 로그 제거를 추가했다.

* **server, web-auth, web-admin, docs:** 로그인 통합 hardening을 적용했다. access token localStorage persistence를 제거해 runtime memory + HttpOnly shared session cookie 복원 기준으로 전환하고, refresh token JSON 응답 노출을 중단했으며, Microsoft OAuth state HMAC 서명/issuer claim 검증/JWKS cache/timeout, 비밀번호 reset challenge 일괄 폐기, pending outbox supersede/consume, 가입 승인 role 검증, Helmet/production config hardening gate를 추가했다.

* **server, database, web-auth, web-admin:** Admin `/auth` 인증 정책 control plane 을 추가하고 Microsoft 365 OAuth 가입 신청/승인 및 외부 ID 로그인, 5앱 공용 `/password-reset` 이메일 코드 재설정 흐름을 구현했다. Auth 설정/가입 신청/외부 ID/재설정 코드/메일 outbox 테이블과 히스토리 트리거를 추가하고, 로그인 surface 는 `/api/auth/public-config` 를 우선 사용한다.

* **web-auth, scripts, docs:** 로그인 확장 action 기본 provider를 사내 SSO + Microsoft 365 기준으로 축소. `NEXT_PUBLIC_AUTH_SSO_URL` / `NEXT_PUBLIC_AUTH_OAUTH_MICROSOFT_URL` 이 설정될 때만 추가 로그인 버튼을 노출하고, generic OAuth/Google은 명시 props 없이 기본 surface에 나타나지 않도록 정리했다. 가입은 `NEXT_PUBLIC_AUTH_SIGNUP_REQUEST_URL` 을 우선하고, 셀프 가입/SSO backend/비밀번호 재설정 채널은 후속 결정 항목으로 문서화했다.

* **web-auth, scripts, docs:** 임시 플랫폼 표기를 `SSOT` 로 유지하는 기준에 맞춰 로그인 surface 카피를 정리. 로고는 `SSOT`, 제목은 `로그인`, 푸터는 `© 2026 SSOT` 만 남기고 보조 설명 문구를 제거했으며, 비밀번호 찾기/가입 요청/사내 SSO/Microsoft 365 action 은 URL/provider 가 설정될 때만 노출되는 공용 확장 슬롯으로 정리했다. `verify:auth-commonization` gate가 descriptive tagline/app-specific copy 재유입을 차단한다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts:** 5앱 로그인 UI surface drift를 차단. `SharedAuthLoginPage` 가 공용 `AuthPageShell` 을 직접 소유하도록 바꾸고, 앱별 auth layout/theme 래핑과 app-specific login copy를 제거했으며, CRM Tailwind content 누락과 Admin auth layout 부재를 보정. `verify:auth-commonization` gate가 login shell ownership, Tailwind web-auth scan, app-specific login copy 재유입을 검증한다.

* **server, web-auth, web-admin, web-pms, web-sns, types, scripts:** 로그인/권한 공용화 잔여 드리프트를 차단. browser `AuthIdentity` 와 JWT `TokenPayload` 에서 `roleCode` 를 제거하고, `@Roles('admin')`/Admin shell/DMS settings system gate 를 `system.override`/domain access snapshot 기준으로 정렬했으며, `@ssoo/web-auth` auth clear hook + PMS/SNS user-scoped cleanup wiring 및 검증 스크립트 gate를 추가.

* **server, web-dms, web-admin, database, scripts:** DMS settings 권한 경계를 personal entry + admin-only system settings 로 정렬. 일반 사용자는 DMS 개인 설정을 열고 저장할 수 있으며, 시스템/runtime 설정은 admin 계정에서만 노출·수정된다. `dms.settings.manage` seed baseline 과 access verifier도 같은 계약으로 보정.

* **web-dms, docs/dms:** 비-admin DMS 설정 화면에서 시스템 설정 scope/menu/search 항목과 기본 설정 스코프의 system 선택지를 숨기고, legacy access-request redirect 도 admin 여부에 맞춰 personal 설정으로 보정.

* **server, web-auth, scripts:** 5앱 auth lifecycle revoked-session convergence를 보정. `JwtStrategy` 가 access token의 `sessionId` 를 `cm_user_session_m` row와 대조해 missing/mismatch/revoked/expired 세션을 401로 거부하고, protected app bootstrap은 focus/visibility 복귀 시 서버 auth state를 재확인하며, `pnpm verify:auth-lifecycle` 로 Admin/CRM/PMS/DMS/SNS app-local auth proxy의 logout 후 old-token rejection을 검증.

* **web-auth, web-dms, scripts, docs:** 포커스/visibility 복귀 auth 재검증을 background 모드로 분리해 이미 렌더링된 protected app subtree가 full-screen loading으로 교체되지 않도록 보정했다. 초기 bootstrap은 blocking gate를 유지하고, DMS query cache는 같은 사용자 access token 회전이 아니라 사용자 scope 변경에만 clear되도록 좁혔다.

* **web-auth:** 공유 auth storage 가 비어 있는 상태를 동기화할 때 다시 공유 auth clear 이벤트를 발행하지 않도록 조정해, 미인증/로그아웃 화면에서 `syncFromStorage` 와 `clearSharedAuthState` 가 재귀적으로 호출되는 문제를 차단했다.

### Documentation

* **docs/common:** AI/RAG platform handoff를 추가하고 공용 문서 색인, current workstream baseline, Docker refresh note를 현행화했다. 다음 작업을 `AI-RAG-10A Runtime smoke and runbook`으로 고정하고, Docker Desktop credential helper 오류 시 `DOCKER_CONFIG=/tmp/ssoo-docker-no-creds` 우회 rebuild 절차를 기록했다.

* **docs/common, docker:** 플랫폼 shell/content-page 강제화 완료 핸드오프 문서를 추가했다. Docker 재빌드/기동, 5개 웹 앱 HTTP 200, access smoke/admin/DMS, PMS launch readiness 검증 결과를 다음 운영/설정/제어 작업의 시작 기준으로 기록했다.

* **docs/common, docs/dms:** content-area 내부 페이지 조립 표준을 추가했다. DMS 문서 페이지를 골든 이그잼플로 고정하고, DMS `PageTemplate`은 장기적으로 `@ssoo/web-shell` page recipe로 승격할 기준 구현이라고 명시했으며, DMS frontend/layout/golden-example 문서를 같은 경계로 정렬했다.

* **docs/common:** SSOO 5앱 공용 사용자 생명주기 기준을 정본화하고, “공용 로그인 코드”가 아니라 logout/session-revoke/profile/access/cache cleanup까지 같은 사용자 상태로 수렴해야 완료라고 명시. 적용 계획은 server revoked-session 검증 → shared auth bootstrap/401 보정 → domain cleanup hook → browser lifecycle check → Docker/5앱 verifier 순서로 고정.

### Refactoring

* **server, types, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, docs:** header/sidebar 검색 표면을 공용화했다. Header placeholder는 “무엇이든 찾아드릴게요! 무엇이 필요하신가요?”, sidebar placeholder는 “목록 내 검색..”으로 고정하고, sidebar 내부 필터링은 `SsooSidebarSearchableTree`가 소유하도록 5개 앱 adapter를 정렬했다. 통합 검색은 검색 실행/결과 내 재검색/blocked source summary 구조를 반영한 `SsooGlobalSearchPage` recipe, 공용 `CommonSearch*` 타입, server `/api/search`, `createCommonSearchApi`, source filter chip, result renderer slot을 통해 `/ssoo/search` 탭으로 연결한다. `SsooGlobalSearchPage`는 공용 content page recipe로 승격되어 5개 앱 route registry에서 `contentPage`로 분류되고, 앱은 검색 API와 결과 open adapter만 소유한다. DMS provider는 기존 DMS `SearchService`를 재사용해 semantic/vector 시도, keyword fallback, ACL/redaction, blocked source summary를 유지한다.

* **web-auth, server-sns, web-sns, web-admin, web-crm, web-pms, web-dms, docs/common:** 공용 사용자 표면을 `내 프로필`/`내 설정` 의미 액션으로 확장했다. `AuthUserMenu`는 5개 앱에서 외부 SNS 링크가 아니라 현재 앱 프레임의 canonical `/__user/*` 탭을 열고, ContentArea는 `@ssoo/web-auth` `createSsooUserSurfaceRouteContentPageElement()`만 호출해 shared page chrome과 `SsooUserSurfacePage` body 렌더링을 패키지로 중앙화한다. SNS profile/feed/follow API는 common 사용자 표시값 + SNS profile + skills/careers + follow stats + 작성자 feed를 단일 projection으로 반환한다. 프로필/개인 설정 수정, follow, feed 반응/북마크/게시물/댓글 변경은 SNS domain event로 발행되어 동시에 열린 앱 탭들이 서버 truth를 다시 읽는다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs/common:** 5개 앱의 visible identity를 `@ssoo/web-shell` 공용 source로 승격했다. 브라우저 제목 표시줄은 `SSOT Platform`, `SSOT Sales`, `SSOT Project`, `SSOT Document`, `SSOT Connect` 단일 형식으로 줄이고, 브라우저 탭 아이콘은 공용 `/ssot-icon.svg` route로 통일했으며, 앱 기본 theme 색상과 런타임 `--ssoo-primary` 사용자 커스텀 값을 favicon accent에 반영하도록 `SsooFaviconSync`를 추가했다. main sidebar brand도 같은 한 줄만 노출하도록 정렬했고, `verify:ssoo-frame`가 앱별 하드코딩, app-local `icon.svg`, 도메인 설명 subtitle, favicon theme sync 회귀를 차단한다.

* **web-shell, web-dms, scripts, docs:** 문서/설정/Admin 운영 page에서 공유할 page-frame 하위 UI 조각을 `@ssoo/web-shell`로 승격했다. DMS `PageTemplate`은 `SsooContentPageTemplate`에 DMS breadcrumb/header/action slot을 주입하는 adapter로 유지하고, breadcrumb/header/page chrome stack/content page recipe/sectioned shell/panel frame/collapsible section/key-value/text/chip/activity section은 `SsooPage*`/`SsooContentPageTemplate`/`SsooSectionedShell`/`SsooPanel*` primitives를 소비하도록 래핑했다. `SSOO_PAGE_CHROME_METRICS`/`SSOO_PAGE_CHROME_CLASSES`/`SSOO_CONTENT_PAGE_METRICS`를 플랫폼 전역 기준으로 추가하고, breadcrumb row 24px, page header 54px, content/sub-content/sidecar slot 기준을 공용 primitive에 고정해 문서 페이지와 설정 페이지의 위치 차이를 제거했다.

* **web-auth, web-shell, web-pms, web-crm, web-sns, docs/common:** 공용 알림센터를 실제 앱 적용 범위까지 확장했다. `@ssoo/web-auth`가 `useCommonNotificationCenter`로 list/read/unread/read-all/pagination/SSE refresh 상태를 소유하고, `@ssoo/web-shell`이 `SsooHeaderNotificationCenter`로 header trigger + shared panel opening behavior를 제공하며, PMS/CRM/SNS 헤더는 source app과 도메인 reference open action만 주입한다. DMS는 기존 도메인 특화 adapter를 유지하되 같은 `SsooNotificationPanel` content primitive를 사용한다.

* **web-shell, web-dms, docs/common:** 알림센터 패널/목록/카드/읽음 상태 UI를 `SsooNotificationPanel` 공용 primitive로 분리하고, DMS는 문서 열기·권한 요청 focus·publish 재시도 같은 도메인 액션만 어댑터로 주입하도록 정렬했다. 헤더 알림 trigger/badge는 플랫폼 frame 공용화 범위로 분리해 유지한다.

* **web-dms, web-shell, scripts, docs:** DMS 설정 진입을 공유 `SsooAppFrame` 위의 settings mode로 유지하되, `Sidebar` + `Header` + 기존 `TabBar` + `ContentArea` 4개 slot을 그대로 보존하도록 재정렬했다. settings sidebar는 DMS `SETTING_SECTIONS`/`searchSettingEntries()`/권한 predicate를 주입하고, 검색 결과 section과 설정 메뉴 tree section 표현은 `@ssoo/web-shell`의 `createSsooSettingsSidebarSections`가 소유한다. 메뉴 클릭은 `/settings/{scope}/{sectionId}` 탭을 기존 `TabBar`에 열며, `SettingsPage` 내부 색인은 `PageTemplate`의 `leftSubContentSlot` rail로 렌더링한다. `verify:ssoo-frame`는 별도 settings shell/tabbar 회귀를 검증한다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns:** main sidebar 검색 clear 버튼, tree row action/icon/status, empty/loading/error/note 양식을 `@ssoo/web-shell` primitive로 승격했다. 5개 앱 main sidebar adapter는 검색값/clear handler, node data, action event, status tone만 주입하고 row/button/state className을 직접 소유하지 않도록 정렬했다.

* **web-shell, web-admin, web-pms, web-dms, web-sns:** 5앱 main sidebar section content를 `SsooSidebarTree` 단일 렌더 경로로 수렴. Admin/SNS route row와 PMS/DMS favorites/open tabs도 tree leaf node adapter로 바꾸고, SNS의 2줄 description row를 제거해 섹션 하위 항목의 들여쓰기와 row rhythm을 통일했다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns:** 5앱 main sidebar의 표현/동작 계층을 공용 `SsooSidebarSurface`로 통일. 앱별 코드는 search adapter, refresh action, section 정의, section content, item click action만 주입하고 brand/header/rail/toolbar/section chevron/footer 렌더는 `web-shell`이 소유하도록 정렬했다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns:** 사용자 메뉴의 계정/프로필/보안 진입점을 공용 `AuthUserMenu` account center action 으로 수렴. `NEXT_PUBLIC_SNS_APP_URL` 기준 SNS account center 를 canonical destination 으로 사용하고, DMS 문서 도메인 설정은 별도 `DMS 설정` 액션으로 분리.

* **web-auth, web-admin, web-crm, web-sns, web-pms, web-dms:** Account/Auth + Admin + SNS Profile 장기 경계를 정본화하고, 앱별 `/login` route를 유지하되 공용 로그인 카드/세션 엔진을 쓰는 현재 구현 단계로 정렬. Admin/CRM 포함 5앱 로그인은 앱별 화면 문구나 theme override 없이 공용 SSOT 로그인 surface를 사용한다.

* **web-shell, web-pms, web-crm:** SSOO sidebar를 서비스별 데이터/컨텐츠 slot과 `fixed`/`collapsible`/`collapsed-only`/`hover-reveal`/`overlay`/`floating-handle` mode 기반 공용 primitive로 분리하고, PMS는 기존 접힘/플로팅 동작을 보존한 기준 적용, CRM은 고정형 sidebar frame/section/item을 공용 primitive로 이관.

* **web-shell, web-dms, docs/common:** SSOO 전체 앱에서 재사용할 설정 화면 양식을 `SsooSettings*` primitives로 추가하고, DMS 설정 페이지의 내부 section navigation/status/pending summary/view-mode controls 를 공통 surface 소비 구조로 전환.

* **web-dms, docs/dms:** 공통 설정 양식에 맞춰 설정 화면의 앱명 반복 표기를 제거하고 scope/group/empty/template/link 문구를 `시스템 설정`, `내 설정`, `관리자 템플릿` 중심으로 단순화.

### Closeout

* **workspace, docker, dms:** 2026-06-11 repo-wide closeout handoff를 추가하고 DMS 설정 표기 cleanup을 Docker까지 반영했다. `ssoo-server`/`ssoo-dms` 이미지를 재빌드·재기동하고, 실행 중인 Docker Postgres `dms.dm_config_m` 시스템 설정도 document-neutral runtime path로 갱신해 기존 `.runtime/dms/*`, `/sites/dms`, `/mnt/nas/dms` 값이 남지 않도록 정리했다.

* **workspace:** SSOO repo-wide closeout handoff updated for the current launch/rebaseline slice, including legacy content-app naming removal, SNS/CRM workspace drift context, GitHub/GitLab publish procedure, and DMS startup file-list recovery notes.

### Bug Fixes

* **server (dms):** prevent startup hydration from marking DB documents as `missing` when the Git-backed document content-plane is not ready yet, avoiding an empty DMS file list after PC/Docker startup races; added a focused regression spec for the guarded path.


### Project Closure (DMS Phase A — 2026-04-30)

* **dms (operational):** GitLab `LSWIKI_DOC.git` document repository push policy confirmed and verified — canonical branch `master`, direct push allowed for current account; initial import commit `b963f14` already on `origin/master`. Closes Track 5 (Git file backup) at 100% and removes the long-standing operational blocker tracked in `document-repo-three-issue-status.md`.

* **server, web-dms, types (dms):** removed dead `versionHistory` feature — the `DocumentVersionEntry` type, `normalizeVersionHistory()` function, and `versionHistory` field on `DocumentMetadata`/`DocumentContentMetadata` had no write path, no UI consumer, and no git integration; only a normalize-on-read pass-through. Removed across server (`document-control-plane.service.ts`, `content.service.ts`, `document-hydration.service.ts`), shared types (`packages/types/src/dms/`), and web-dms type re-exports. Original intent (per-document git commit history surface) re-registered as `DMS-FE-versionHistory` backlog item for future implementation as on-demand `gitService.getFileHistory()` projection. Closes Track 2 (DB schema separation) and Track 7 (JSON metadata → DB) at 100%.

### Refactoring

* **server (dms):** `access-request.service.ts` decomposition complete — 2150-line god service decomposed into 5 cohesive units (`AccessRequestService` 1121, `ControlPlaneSyncService` 260, `DocumentRecordService` 311, `DocumentProjectionService` 126, `access-request.util.ts` 447). C-4 track via 5 slices. Record bootstrap and control plane sync split into separate Nest services after circular dependency between them was resolved by re-ordering slices.

* **server (dms):** `git.service.ts` decomposition — 1285 → ~1150 lines via pure-function util extraction (`git-paths.util.ts`, `git-sync.util.ts`, `git-inspect.util.ts`). C-3 track via 4 slices. `getRepositoryBindingStatus` kept as a 1-line proxy on `GitService` for caller stability.

* **server (dms):** `collaboration.service.ts` util extraction (paths / sanitizers / isolation / state-IO) and 110-test integration coverage. C-2 + D-2 tracks.

* **web-dms:** `DocumentPage` `useSyncReferencesToMetadata` hook extraction — initial slice of C-1 track (DocumentPage at ~1997 lines).

### Features

* **docs/dms:** DMS canonical permission/hybrid model 문서화 — 문서 visibility(`public / organization / self`), explicit grant/request, discovery-vs-readable surface, file/Git vs DB vs sidecar 경계, mixed `jsonb`+relation control-plane, `revisionSeq` optimistic concurrency, reconciliation 전략을 정본 문서로 고정

* **scripts, docs/common, docs/dms:** fixture-driven DMS regression automation — `pnpm verify:access-dms` 를 추가해 admin 기준 temp probe document/image/attachment/local storage fixture 를 생성/정리하면서 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` 과 DMS access snapshot / inspect parity 를 자동 검증

* **scripts, server, web-pms, docs/common:** admin regression automation + PMS role override formalization — `pnpm verify:access-admin` 를 추가해 PMS role-menu read/update/reset semantics, admin user CRUD legacy-field regression, internal/external primary affiliation switching, temp user inspect/organizationIds parity 를 자동 검증하고, PMS role-menu source naming 을 `legacy-override` 에서 `role-override` 로 정리

### Bug Fixes

* **web-dms, scripts:** DMS baseline recovery — `DocumentPage` 의 empty-interface lint error 를 제거해 `build:web-dms` 를 다시 green 으로 복구하고, `verify:access-dms` probe fixture 에 runtime persona read grant 를 부여하며 cleanup 순서를 asset-first 로 조정해 fixture-driven DMS verification 을 다시 통과시키도록 보정

* **web-auth:** browser login fetch binding fix — shared auth adapter가 native `fetch` 를 object method 형태로 호출하면서 브라우저에서 `Failed to execute 'fetch' on 'Window': Illegal invocation` 이 날 수 있던 경로를 global fetch binding 기준으로 정리해 PMS/SNS/DMS 공통 로그인 진입점이 다시 정상 동작하도록 보정

* **server, web-pms, types, database, docs/common, docs/dms:** Phase 3~5 cleanup closeout — JWT payload 에서 `roleCode` 를 제거하고 foundation role baseline 을 DB-backed resolution 으로 전환했으며, user admin / inspect 계약에서 `userTypeCode`·`isAdmin` 를 제거하고 `cm_user_m`/`cm_user_h` 의 `is_admin`·`user_type_code`·`permission_codes` schema tail 을 정리

* **server, web-pms, docs/common:** Phase 2 org bridge replacement baseline — 사용자 생성/수정 계약과 PMS 사용자 관리 화면에 `primaryAffiliationType`, `employeeNumber`, `companyName`, `customerId` 를 노출하고, `syncOrganizationFoundation()` 이 explicit primary 소속 선택 → current primary relation → data-driven fallback 순서로 organization relation primary 를 결정하도록 정렬

* **server, web-pms, docs/common:** Phase 1 menu baseline cutover — PMS `/api/menus/my` 일반 메뉴를 legacy seed 와 같은 역할 기준선(`admin/manager = full`, `user = read`, `viewer = dashboard read`) 위에 `cm_role_menu_r` legacy override fallback 과 `cm_user_menu_r` grant/revoke 를 덧씌우는 구조로 정렬하고, `GET /api/roles/:roleCode/menus` / `RoleManagementPage` 는 관리자 메뉴를 `system.override` 기준 read-only row 로 표시하도록 정리

* **server, docs/common:** access smoke runtime 확장 — `pnpm verify:access-smoke` 가 기본 demo runtime persona(`viewer.han`) 기준으로 PMS foreign project deny / SNS post deny / DMS git-settings system deny 와 PMS·SNS·DMS allow path 를 함께 검증하도록 넓어지고, PMS project access 가 action permission 누수 없이 project capability 로만 `canViewProject` 를 계산하도록 보정

* **server, docs/common, types:** Wave 5 access alignment 정렬 — PMS project-scoped route 를 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 패턴으로 올리고, PMS two-stage bootstrap(`/api/menus/my` + `/api/projects/:id/access`)와 navigation-centric `PmsAccessSnapshot` 경계를 문서화하며, PMS/SNS cross-domain validation target 을 auth/access 문서와 runbook에 추가

* **server, web-dms, docs/dms:** DMS object ACL pilot 완료 — `DocumentMetadata.acl` 을 file/content read-write-metadata, file tree/raw/serve-attachment, search/ask, template reference/doc-assist tree hint, upload inheritance, local storage/open 경계에 연결하고, 새 문서 owner default + DocumentPage 편집 affordance + validation matrix를 정렬해 unreadable source와 unauthorized mutation을 차단

* **docs/common, docs/pms, docs/sns:** PMS/SNS alignment audit 완료 — PMS project access 와 SNS feature/visibility policy 가 `AccessFoundationService` + shared `policy` trace 계약 위에 유지됨을 확인하고 cross-domain alignment 상태를 문서 기준선에 반영

* **server, docs/common:** admin-only access ops tooling 추가 — `GET /api/access/ops/inspect`, `GET /api/access/ops/exceptions` 를 추가해 foundation policy trace 와 permission exception 을 운영자가 직접 조회할 수 있게 하고, verification runbook + cleanup plan 문서를 함께 정리

* **server, types, docs/common, docs/sns, docs/pms:** legacy cleanup safe slice — SNS browser-facing access snapshot 의 redundant `isAdmin` 를 제거하고, `GET /api/users/profile` 이 `roleCode`/`userTypeCode`/`isAdmin` 를 다시 노출하지 않도록 축소하며, JWT `TokenPayload` 에서 `userTypeCode` 를 제거

* **server, docs/common:** legacy cleanup major slice — JWT `TokenPayload` 에서 `isAdmin` 을 제거하고, `AccessFoundationService` / PMS project list filter / PMS admin menu inclusion 이 `system.override` 기준으로만 관리자 우회를 계산하도록 정렬

* **server, web-pms, types, docs/common:** route-level admin gate + ops hardening 마감 — `RolesGuard` 의 `@Roles('admin')` 를 access foundation `system.override` 기준으로 전환하고, PMS 사용자 관리 화면에 access inspect dialog 를 추가하며, `pnpm verify:access-smoke` repo-native smoke script 로 admin success / profile contract / optional non-admin 403 검증 경로를 자동화

* **docs/common, docs/dms:** auth/access validation baseline 문서화 — 공통 matrix(anonymous/feature denied/object denied/allow)와 repo-native 검증 루틴을 정리하고, DMS readiness/backlog/roadmap를 object ACL 중심 상태로 재정렬

* **server, types:** 공통 permission resolution contract 정렬 — server common `AccessFoundationService` 로 role/org/user-exception/object grant 계산을 재사용하고, SNS/DMS/PMS project access snapshot 에 `policy` trace를 추가해 동일한 상위 계약으로 설명 가능하도록 정리

* **web-auth, web-pms, web-sns, web-dms:** 공용 session bootstrap helper 추가 — PMS/SNS Axios 401 복원과 DMS fetch retry가 같은 `restoreSharedAuthSession()` 경로를 사용하도록 통합하고, concurrent restore dedupe + transient failure 시 local auth 유지 정책으로 정렬

* **web-pms, web-sns:** 브라우저-facing auth surface를 DMS와 동일한 same-origin proxy 패턴으로 통일 — `src/app/api/auth/[action]/route.ts` + `_shared/serverApiProxy.ts` 신규 추가, `authApi` 어댑터를 same-origin `/api/auth/*` fetch 기반으로 교체, Axios 401 인터셉터의 session bootstrap도 `/api/auth/session` same-origin 경유로 변경

* **web-pms:** 프로젝트 상세 페이지 — 기본정보 + 상태 타임라인 + 단계별 탭(요청/제안/수행/전환) 조회·편집
* **server:** 프로젝트 단계별 상세 API — `PUT /api/projects/:id/{request,proposal,execution,transition}-detail` upsert 엔드포인트 4개, `findOne`에 전체 relation include, `statusCode` 필터 추가
* **types:** `ProjectRequestDetail`, `ProjectProposalDetail`, `ProjectExecutionDetail`, `ProjectTransitionDetail`, `ProjectStatus`, `ProjectDetail` 등 12개 공유 타입 추가
* **web-pms:** Proposal/Execution/Transition 목록 페이지 실데이터 전환 (Mock → `useProjectList` + `statusCode` 필터)
* **web-pms:** 목록 행 클릭 → 프로젝트 상세 탭 열기 (MDI keep-alive)
* **web-pms:** `useCurrentTab` 훅 — TabContext 기반 탭 파라미터 접근

* **web-dms:** 본문 링크 sidecar 싱크 — 마크다운 본문의 링크/이미지를 실시간 추출하여 sidecar 링크 섹션에 자동 반영
* **web-dms:** 이미지 삽입 다이얼로그 — URL 입력 + 로컬 파일 업로드 탭, 이미지 업로드는 문서 저장 시 지연 처리
* **web-dms:** 링크 삽입 다이얼로그 — URL 입력 + 내부 문서 파일트리 선택 (FilePickerTree 공통 컴포넌트)
* **web-dms:** 이미지 미리보기 모달 — sidecar 이미지 링크 클릭 시 모달 표시, 전체화면 lightbox (react-zoom-pan-pinch: 휠 줌/드래그 팬/더블클릭 리셋/컨트롤바)
* **web-dms:** 위키 내부 이미지 서빙 API (`/api/file/raw`)
* **web-dms:** Docker 배포 지원 — Dockerfile (multi-stage standalone), compose.yaml (pgvector + DMS 서비스)
* **web-dms:** 서버 시작 시 pgvector 확장 및 임베딩 테이블 자동 초기화 (instrumentation.ts)
* **web-dms:** 변경 하이라이팅 시스템 — 에디터 문자 수준 diff (fast-diff), DiffTextInput 공용 컴포넌트
* **web-dms:** 사이드카 소프트 삭제 + 되돌리기 (태그/URL/댓글)
* **web-dms:** AI 태그 추천 + 요약 생성 (WandButton)
* **web-dms:** Obsidian 스타일 새 문서 런처 페이지
* **web-dms:** AI 요약 원클릭 플로우
* **web-dms:** 과거 설정 전용 frame — `/settings` 탭 대신 전역 설정 모드, system/personal 설정 분리, 공용 JSON renderer/editor/diff 도입
* **web-dms:** settings surface 확장 — storage runtime 필드(`enabled`, `webBaseUrl`), upload/search/DocAssist 정책, viewer/sidebar 개인 기본값, M365 metadata-only 설정 추가

### Improvements

* **docs/common:** current workstream baseline 추가 — DMS/PMS/SNS 3개 축에 대해 어디까지 진행됐고 어디서 끊겼는지, 지금 멈춰야 할 작업과 이어가야 할 작업, 실제 실행 우선순위(DMS 최우선 / PMS 가능하면 병렬 / SNS 최하위), 병렬 진행 시 공통 영역 owner/escalation 규칙을 레포 기준선 문서로 고정

* **docs/common:** current tranche execution contract + inventory freeze 추가 — dirty tree 를 cross-app access/platform convergence 중심 workstream 으로 재분류하고, `Access/platform convergence stabilization` 을 현재 우선 tranche 로 고정했으며, Copilot-first Stage 1~8 라우팅과 첫 수정 대상(`repo instruction / meta-doc parity recovery`)을 레포 계약 문서에 명시

* **docs/common, docs/dms:** final cutover package 고정 — live `:4000` + `viewer.han` smoke baseline 을 rollback-safe cutover 출발점으로 명시하고, cleanup plan/auth-system/DMS readiness 에서 Phase 0~5 시작 조건·acceptance criteria·필수 증빙·DMS regression gate 를 같은 기준으로 정렬

* **docs/dms:** document repo 3-issue status 정리 — 문서 정본 정책 고정, 원격 push blocker, in-repo documents detach 검증 결과를 `document-repo-three-issue-status.md` 로 묶고 남은 핵심 이슈를 GitLab push 정책/권한 확인으로 축소

* **docs/dms:** document repo git sync pattern 추가 — 외부 문서 working tree를 직접 수정하는 현재 구조에서 CRUD와 Git commit/push를 분리하고, publish 단계/fast-forward 규칙/사전 테스트 시나리오를 `document-repo-git-sync-pattern.md` 로 고정

* **docs/dms:** concurrency-safe auto publish pattern 추가 — 동시 편집 `revisionSeq` 충돌, publish queue 직렬화, dirty tree 자동 해소, 앱 사용자별 Git author / commit footer attribution 원칙을 `document-repo-concurrency-autopublish-pattern.md` 로 고정

* **server, web-dms, docs/dms:** presence-first 저장 체계 1차 구현 — `/dms/collaboration` snapshot API, file/content mutation 후 auto publish enqueue, per-user Git commit footer, `DocumentPage` 상단 presence/publish 상태 banner, 후속 slice 계획 문서를 추가

* **server, web-dms, docs/dms:** presence-first 저장 체계 2차 구현 — publish 상태와 soft lock 을 파일로 영속화하고(`/apps/web/dms/.dms-collaboration-state.json` at runtime app root), `/dms/collaboration/takeover` 및 문서 화면 soft lock owner/takeover UX를 추가

* **server, web-dms, docs/dms:** presence-first 저장 체계 3차 구현 — publish 상태에 change-set과 git sync detail을 추가하고, `/dms/collaboration/refresh`·`/dms/collaboration/retry-publish` 및 문서 화면 recovery(refresh/retry) UX를 추가

* **server, web-dms, docs/dms:** collaboration marker sidecar cutover — collaboration/publish 표식을 `DocumentPage` 본문 상단에서 `DocumentSidecar` 패널로 이동하고, asset 업로드도 문서 기준 change-set publish enqueue에 포함되도록 확장

* **docs/dms:** save/collaboration wrap-up 추가 — 오늘 세션의 외부 문서 정본 연결, auto publish, presence, soft lock, recovery, attribution, sidecar marker 이동 결과를 `2026-04-17-save-collaboration-wrapup.md` 로 마감 정리

* **docs/common, docs/dms:** legacy cleanup execution package 정리 — cleanup plan을 runtime blocker vs cleanup-only debt 기준으로 재분류하고, phase별 validation gate / rollback point / schema-last cutover 순서를 고정했으며, auth-system/DMS readiness 문서에 같은 실행 기준을 연결

* **docker:** full-stack compose 정렬 — root `compose.yaml`을 `postgres + server + pms + sns + dms` 기준으로 확장하고, PMS/SNS Dockerfile/standalone 설정, shared `dms-data` volume, compose 전용 DB URL override(`DOCKER_DATABASE_URL`)를 정리
* **web-dms:** runtime/config normalization — root `compose.yaml` 단일 지원 경로, workspace Dockerfile, `DMS_SERVER_API_URL` 브리지/JSON config 문서 정렬과 `DOCKER_DMS_DATABASE_URL` 분리
* **web-dms:** GitLab workspace publish flow — full-workspace `development` branch, `codex:workspace-sync-from-gitlab` / `codex:workspace-publish` 추가, 기존 `codex:dms-*` 는 호환 래퍼로 유지
* **web-dms:** sidecar 링크 섹션 아이콘 — Globe(외부)/FileText(내부 문서)/Image(이미지) 타입별 구분
* **web-dms:** 링크 본문 찾기 — sidecar에서 ↳ 버튼 클릭 시 뷰어/에디터 내 해당 링크로 스크롤 + 하이라이팅
* **web-dms:** 내부 문서 링크 클릭 시 새 탭으로 열기, 외부 링크는 브라우저로 열기
* **web-dms:** 이미지/링크/문서경로 설정 모달 크기 통일 (max-w-lg h-[480px])
* **web-dms:** bare path 링크 해석 개선 — `goals.md` 같은 상대 경로를 현재 파일 디렉토리 기준으로 해석
* **web-dms:** 과거 설정 전용 frame 헤더 정리 — 사이드바 브랜드 슬롯을 `뒤로가기 + 설정`으로 재구성하고, 상단 헤더 검색을 전역 설정 검색으로 전환하며 scope 뱃지를 제거
* **web-dms:** 과거 설정 전용 frame 단순화 — sidebar 브랜드 보조 문구 제거, 설정 검색을 sidebar 검색 슬롯으로 이동, UserMenu 설정 진입점을 단일 항목으로 정리
* **web-dms:** 과거 설정 전용 frame 3뎁스 네비게이션 — outer sidebar를 `시스템 설정`/`개인 설정` scope selector로 축소하고, `SettingsPage` 내부에 좌측 section menu + 우측 detail surface를 도입
* **web-dms:** settings navigation visual consistency — outer scope selector와 inner section menu를 기존 sidebar row/list 패턴으로 통일하고, navigation 내부 설명 문구를 제거
* **web-dms:** settings typography token alignment — settings UI를 재점검해 semantic typography token 구성을 유지하고, JSON raw editor를 `font-mono + text-code-block` 기준으로 정리
* **web-dms:** settings navigation row typography alignment — outer/inner settings rows를 실제 FileTree row 리듬(`font-sans`, `gap-1`, `px-2`) 기준으로 다시 맞춰 문서 목록과의 체감 차이를 축소
* **web-dms:** settings navigation section rhythm alignment — 2열 settings 구조는 유지하되, outer/inner navigation 모두 기존 sidebar의 `Section 헤더 + 목록` 위계를 더 직접적으로 재현하도록 조정
* **web-dms:** settings navigation sidebar parity refinement — flat settings rows를 `OpenTabs`/`Bookmarks`와 같은 `gap-2`, `px-3` rhythm으로 재정렬하고, inner navigation을 detail card와 시각적으로 분리해 page 내부 sidebar처럼 읽히도록 보정
* **web-dms:** settings navigation section reuse — outer/inner navigation header에서 실제 sidebar `Section` 컴포넌트를 재사용해 header 구조 drift를 제거
* **web-dms:** settings navigation flat list reuse — settings 메뉴에서는 `Section`/collapse를 제거하고, `OpenTabs`/`Bookmarks`와 동일한 `FlatList`/`FlatListItem` row primitive를 공유하도록 정리
* **web-dms:** settings navigation exact flat row render — `FlatListItem` 에서 실제 clickable element와 label span에 typography token을 직접 적용하고, `cn()`/`tailwind-merge` 가 custom `text-*` size token을 color class와 함께 제거하던 경로를 피해 settings/OpenTabs/Bookmarks가 동일 14px row render를 유지하도록 정리
* **web-dms:** settings flat row font inheritance fix — `FlatListItem` row container가 semantic typography token을 직접 들고, settings/OpenTabs/Bookmarks가 동일한 typography inheritance 경로를 공유하도록 보정
* **web-dms:** settings direct row button path — trailing action이 없는 outer/inner settings row를 direct button 경로로 렌더링해 두 rail의 DOM/class 경로를 다시 맞춤
* **web-shell, web-pms, web-dms, web-crm, web-admin, web-sns:** sidebar internals commonization — 검색 입력, refresh action, section chevron, flat list row, recursive tree row/filter를 `@ssoo/web-shell`의 `SsooSidebar*` primitive로 승격하고 PMS/DMS/CRM/Admin/SNS가 같은 렌더링 경로를 공유하도록 정리

### Improvements

* **web-dms:** 사이드카 폰트 정규화 (text-[10px]/text-[11px] 제거, 타이틀/콘텐츠 위계 정리)
* **web-dms:** 사이드바 폰트 정규화 (Changes/푸터 비표준 크기 제거)
* **web-dms:** 사이드카 문서정보 필드명 개선, 에디터 모드 통계 숨김
* **web-dms:** 요약 textarea 리사이즈 지원

### Bug Fixes

* **web-dms:** DiffTextInput 스크롤 동기화
* **web-dms:** 소프트 삭제 되돌리기 시 아이템 재추가
* **web-dms:** CollapsibleSection 중첩 button 하이드레이션 에러 수정

### Bug Fixes (prior)

* **database:** DBML 문서 출력 경로 수정 - 워크스페이스 외부가 아닌 `docs/` 하위로 정상 출력 ([export-dbml.js](packages/database/scripts/export-dbml.js), [render-dbml.js](packages/database/scripts/render-dbml.js))
* **database:** Prisma extension 공통 컬럼 준비 함수의 `any` 제거로 패턴 경고 해소 ([common-columns.extension.ts](packages/database/src/extensions/common-columns.extension.ts))

---

## 0.0.1 (2026-01-25)


### Bug Fixes

* 사이드바 스크롤 영역을 검색란 아래로 한정 ([ebd82f5](https://github.com/hwista/sooo/commit/ebd82f5ab7be9f5563ca6638721a9d8fe23a0ab9))
* 접힌 사이드바에서 관리자 메뉴 표시 ([6d0a8b9](https://github.com/hwista/sooo/commit/6d0a8b931250e3a0bb14a75af562cbcec87908d9))
* 즐겨찾기 API 404 에러 수정 ([405d713](https://github.com/hwista/sooo/commit/405d713e7a1deda1b2fc35b756b8f023c25960c6))
* 현재 열린 페이지에서 홈 탭 제외 ([bba91bc](https://github.com/hwista/sooo/commit/bba91bc04376df1d027b6aa3354f01e38bff7da8))
* add ls-red-hover for destructive button hover state ([961aba8](https://github.com/hwista/sooo/commit/961aba8049cb80a14c00b1591abafc50f8e2a0bb))
* apply ls-red-hover class to destructive button ([c1a97b1](https://github.com/hwista/sooo/commit/c1a97b189c9c9a1eedaaf937e0767ac7dcf1504d)), closes [#d90027](https://github.com/hwista/sooo/issues/d90027)
* **docs:** 백로그 중복 제거 - docs/BACKLOG.md로 통합 ([6dc1766](https://github.com/hwista/sooo/commit/6dc17667ab092db0acdc65d90ff92b92fcb95bcb))
* **menu:** add pms schema prefix to raw SQL queries ([d96b73d](https://github.com/hwista/sooo/commit/d96b73d8785c1f677cb4f698ad87474621ef28ff))
* **ui:** center loading state vertically on page ([56191f8](https://github.com/hwista/sooo/commit/56191f82efd334ba2dc9ec08e50bbebafe795715))
* **ui:** center page loading spinner in ContentArea ([a5b5694](https://github.com/hwista/sooo/commit/a5b5694eb3ffaab07ee97925f4cf27fa809b74fb))


### Code Refactoring

* **types:** sync type definitions with Prisma schema ([0ca75ec](https://github.com/hwista/sooo/commit/0ca75ecd2293901a9e3ff5c1d7432779322e7037))


### Features

* 사이드바 하단에 카피라이트 영역 추가 ([188c1f7](https://github.com/hwista/sooo/commit/188c1f7befffa40fe69d5530b592d3eb8dffb29f))
* 즐겨찾기 DB 연동 구현 ([8047c9c](https://github.com/hwista/sooo/commit/8047c9c9cef4783c8c863752b6736738aa9d5916))
* 초기 프로젝트 구성 완료 ([15f26f8](https://github.com/hwista/sooo/commit/15f26f83a001d80bbe82affe6827b9c42524e33f))
* 커스텀 스크롤바 디자인 시스템 추가 ([d43cb90](https://github.com/hwista/sooo/commit/d43cb90ba74026821749d405900dfcb259bdec81))
* add Home tab with dashboard placeholder and improve tab styling ([0b7b3bf](https://github.com/hwista/sooo/commit/0b7b3bf1164167eaa5229b6f783a0807eb7f8087)), closes [#9FC1E7](https://github.com/hwista/sooo/issues/9FC1E7) [#003876](https://github.com/hwista/sooo/issues/003876) [#7D8282](https://github.com/hwista/sooo/issues/7D8282)
* add quality gate and security improvements (IMMEDIATE tasks) ([3d811f3](https://github.com/hwista/sooo/commit/3d811f3b76fdd50664bc3a693738f7630c58e431))
* **docs:** add conventional-changelog for hybrid changelog management ([55d4085](https://github.com/hwista/sooo/commit/55d40858f482b9a55756529c6cd15fac3cf3142e))
* **docs:** add Redoc HTML generation for OpenAPI specs ([50e84d0](https://github.com/hwista/sooo/commit/50e84d0d7945e6ae4139ba767f6c47f79fb36d83))
* implement role-based access control (P1-FEATURE) ([a4fe62b](https://github.com/hwista/sooo/commit/a4fe62b1c7c2d046cc7029b3cdb09276cacdd5e7))
* **server:** add JwtAuthGuard to ProjectController ([79b3e6b](https://github.com/hwista/sooo/commit/79b3e6b30ee28b875a80b30dc31ffa6493dd706c))
* **server:** add rate limiting and strengthen password policy ([ca76541](https://github.com/hwista/sooo/commit/ca7654194ee6961e82ffe6fce0e50fe6e427bd36))


### BREAKING CHANGES

* **types:** Type literal values changed to match database schema


## 2026-03-24 - docs: finalize copilot instructions

- Updated .github/copilot-instructions.md and docs; ran verification scripts.
