# 최소 자원 로컬 연동과 운영 제공자 전환

> 상태: 로컬 구현·배포·실제 검증 완료, 외부 제공자 검증 보류 · 2026-11-05

## 범위

플랫폼 공통 Admin의 기존 인증 관리와 AI 운영 화면에서 연결을 관리한다. 시나리오별 메뉴나 애플리케이션을 추가하지 않는다. 회사 SMTP, Microsoft 메일, Azure 임베딩이 없어도 로컬 메일 수신 및 CPU 임베딩을 실행할 수 있게 한다. Microsoft 로그인은 기존 암호화 설정·비밀번호 로그인 경로를 유지한다. 채팅 생성 모델은 이번 로컬 임베딩과 별개다.

## 연결 계약

| 영역 | 현재 무료 로컬 경로 | 추후 전환 경로 |
| --- | --- | --- |
| 인증 메일 | SMTP → 내부 Mailpit → Admin 수신함 | 회사 SMTP 또는 Microsoft Graph sendMail |
| 임베딩 | 기존 서버 CPU에서 multilingual-e5-small q8, 384차원 | Admin에 Azure endpoint·deployment·dimension·API key 입력 |
| Microsoft 로그인 | 기존 비밀번호 로그인 계속 사용 | 기존 Admin Microsoft tenant/client/secret/redirect/allowlist 설정 |

`common.cm_integration_setting_m`와 `_h`에 메일/임베딩 연결 및 변경 사유를 기록한다. 비밀값은 `AUTH_CONFIG_ENCRYPTION_KEY`에서 유도한 AES-256-GCM 키로 암호화하며 제공자별로 분리한다. 조회 API에는 설정 여부만 반환한다. 공백 입력은 해당 제공자의 비밀값 유지, 명시적 삭제는 null이다. `expectedUpdatedAt`과 행 잠금으로 동시 수정 충돌을 검사한다. 변경 전 연결 확인을 할 수 있고 활성화 저장은 실제 SMTP 인증/Graph 토큰 발급/임베딩 생성 검증을 요구한다.

메일 작업은 배치 시작 시 설정을 고정해 사용한다. 자동 발송은 활성화 또는 제공자 전환 이후 생성된 대기 메일부터 대상으로 삼는다. 기존 대기 메일은 기존 수동 실행으로 검토·처리할 수 있다. 로컬 수신이 끝난 메일은 외부 제공자로 바꿔도 다시 발송하지 않는다. 만료·사용된 비밀번호 복구 요청은 발송하지 않는다. SMTP 수락과 Graph HTTP 202는 최종 수신 완료를 의미하지 않는다.

임베딩 실제 호출은 현재 DB 설정을 읽는다. 동기 capability getter를 사용하는 기존 어댑터의 상태 캐시는 현재 서버에서 저장 직후 갱신하며 다른 서버 인스턴스에서는 5초 주기로 갱신한다. 검색은 호출에 사용한 provider/model/deployment/dimension과 일치하는 벡터만 비교한다. 색인 중 설정이 바뀌면 다른 모델로 생성한 결과를 섞어 저장하지 않는다. 새 모델의 재색인은 AI 운영의 `등록 문서 재색인 (최대 20건)`으로 등록하고 기존 대기 job 실행으로 처리한다. 현재 벡터가 없거나 오래된 등록 문서를 선택하며 이미 대기·실행 중인 대상은 제외한다. 실행 후 다시 등록하면 다음 대상을 처리한다. 키워드 검색을 유지한다.

## 자원과 보관

- Mailpit은 로컬 compose에만 추가한다. 호스트 포트 없이 server와 전용 internal network로 연결한다. 외부 릴레이는 설정하지 않는다.
- Mailpit 제한: 메모리 128MiB, CPU 0.25, 메일 최대 100건 및 24시간, 메시지 최대 1MiB. 전용 볼륨 하나를 재사용한다.
- 임베딩은 별도 서버/포트/GPU 없이 기존 Node 서버에서 실행한다. CPU 2개 스레드, 문장 순차 처리, 대기 요청 제한, 5분 idle 후 모델 메모리 해제. 모델 캐시 볼륨을 재사용한다.
- 모델 revision: `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, `Xenova/multilingual-e5-small`. CPU 런타임은 설치 파일에 포함된 바이너리를 사용하며 CUDA 추가 다운로드 install script를 허용하지 않는다.
- 기존 앱 포트 3000–3004, 공통 서버 4000을 유지한다. 관리형 storage 배포 경로와 기존 정상 배포 보존 정책을 따른다.

## 로컬에서 확인하는 순서

1. Admin `http://localhost:3000/email-operations`의 메일 연결 설정에서 로컬 수신함·발송 활성화를 확인한다. 시험 수신 주소를 입력해 시험 메일을 보내고 `로컬 수신함 조회 → 본문 보기`로 확인한다. 입력한 외부 주소로 실제 배달되지는 않는다.
2. 시험 사용자의 비밀번호 찾기에서 코드를 요청한다. 관리자가 로컬 수신함에서 해당 메일을 확인하고 시험 사용자가 코드를 사용해 비밀번호를 바꾼 후 다시 로그인한다. 실제 사용자의 복구 코드를 공유 증거에 기록하지 않는다.
3. `http://localhost:3000/ai-operations`에서 로컬 제공자를 선택하고 변경 사유 입력 → 임베딩 생성 확인 → 활성화·저장한다. 등록 문서 재색인을 필요한 앱 단위로 등록하고 기존 대기 job 실행으로 처리한다. 자동 worker는 별도로 꺼 둔다.
4. 회사 서비스 지원 시 같은 화면에서 제공자를 변경한다. 비밀값은 공백이면 유지, 삭제 체크 시 제거한다. 연결 확인과 저장 후 메일은 실제 외부 사서함 도착까지 확인한다. Azure는 활성화 시 실제 임베딩을 생성하므로 요금이 발생할 수 있다.

관측된 로컬 자원: 모델 캐시 약 125MiB, 별도 실제 추론 smoke 프로세스 RSS 약 431MiB, 첫 모델 다운로드·로드·추론 약 92초. Mailpit 관측 메모리는 약 20MiB이며 상한은 128MiB다. 모델 캐시 외에도 설치된 ONNX Node/Web 패키지가 각각 약 208MiB/89MiB이며 Docker 이미지·빌드 캐시 공간은 별도다. 서버 총 메모리나 운영 처리량의 보장값은 아니다. 반복 사용은 캐시를 재사용한다.

## Ralph 검증 계약

| 검증 | 기대 결과 | 상태 |
| --- | --- | --- |
| 기존 회귀 | 서버 전체 테스트 | 114 suite / 872 test 통과 |
| 설정 보호 | 암호화, 비밀값 미반환, 제공자별 유지/삭제, 충돌 거부 | 단위 검증 및 실제 DB API 유지·삭제·409 확인 |
| 메일 성공 | Admin 설정 → 시험 발송 → 실제 로컬 SMTP 수신 → 본문 확인 | 실제 SMTP 수신·본문 표시 통과. compact Mailpit ID 처리 오류 수정 |
| 계정 복구 | 소유 시험 사용자 복구 메일 → 코드 확인 → 비밀번호 변경 → 로그인 | 모바일 브라우저에서 실제 성공, 관련 API·런타임 오류 0 |
| 실패·전환 | 잘못된 연결 활성화 거부, 비활성화, 저장 재조회, 원상 전환 | 잘못된 SMTP 400 및 기존 revision 보존, 로컬 복구 200 확인 |
| 임베딩 성공 | 실제 모델 생성 → 시험 객체 색인 → 벡터 검색 | 384차원 유한값·단위 norm, 한국어 SNS 시험 자료 indexed, semantic ranker/vector 경로 검색 성공 |
| 모델 분리 | 차원 불일치 거부, 모델 변경 검색 격리, 재색인 | 차원·모델 필터 단위 검증, 비활성화 시 keyword fallback 실제 확인. 실제 재색인 등록 1건·중복 요청 0건 확인 |
| 권한 | 비로그인/일반 사용자 설정·수신함 접근 거부 | 메일 설정·수신함·임베딩 설정 각각 401/403 확인 |
| DB | 기존 데이터 보존, launch migration, 빈 DB baseline/trigger/schema parity | 실제 migration, 빈 DB seed·91 trigger·schema drift 0 및 populated backup/restore 통과 |
| 브라우저 | desktop/mobile 실제 조작, console/API 오류 확인 | 최종 배포에서 1440×1000/390×844 조작, 메일 본문·설정 다시 불러오기·임베딩 생성·재색인 통과, 관련 console/runtime/HTTP 오류 0 |
| 플랫폼 | server와 5개 웹 앱 build, 필요한 정적 검사 | platform-guard·preflight·변경 파일 lint 통과 |

프로덕션 의존성 감사는 별도 미통과다. 이번에 추가한 ONNX Web 경로의 protobufjs는 7.6.5로 고정해 해당 감사 항목을 제거했다. 감사 시점의 기존 의존성에는 critical 2/high 10/moderate 11/low 4가 남아 있으며 Next.js·DOMPurify·sharp·Joi 등이 포함된다. 공개 배포의 high/critical 0 조건을 충족했다고 해석하지 않는다.

최종 로컬 상태는 메일·임베딩 제공자 `local`, 두 연결 활성화, AI 자동 worker 비활성화다. 시험 사용자 19의 계정·세션과 시험 문서 900002의 객체·벡터를 비활성화했고 삭제 후 검색에서 제외됨을 확인했다. 재색인 검증으로 등록한 작업 1419는 실행하지 않고 취소했다. 기존 문서 900001과 기존 대기 메일은 보존했다. 로컬 시험 메일은 수신함의 24시간 보관 정책에 따라 제거된다.

검증 증거는 `output/playwright/local-integrations-20261105/`의 `final-verification.txt`, `cleanup-db.txt`, `mail-body-mobile-final.png`, `embedding-mobile-actions.png`, `embedding-desktop-final.png`에 보관한다. 비밀값·토큰·복구 코드를 최종 증거에 포함하지 않는다. 관리형 최종 배포 및 storage 검사 통과를 확인했다. 코드 검토에서는 기존 화면·수동 복구 유지, 공용 설정 경계, 제공자별 비밀값 격리, 대기 메일 활성화 기준, 모델별 검색 격리, 로컬 자원 상한을 확인했다.

## 외부 제공자 검증 경계

회사 SMTP와 Microsoft/ Azure 실제 자격 증명이 없어 외부 수신·Graph 권한·Entra 로그인·Azure 호출 성공을 검증했다고 표시하지 않는다. 설정 입력 및 전환 경로를 구현하고 로컬 실제 성공과 구분한다. Microsoft Graph는 Exchange 사서함과 애플리케이션 `Mail.Send` 권한 및 관리자 동의가 필요하다. 로그인용 Entra 등록과 메일 발신 권한은 별도다.

## 근거

- [Mailpit Docker 네트워크](https://mailpit.axllent.org/docs/install/docker/)
- [Mailpit 저장 및 자동 보관 제한](https://mailpit.axllent.org/docs/configuration/email-storage/)
- [Mailpit 실행 옵션](https://mailpit.axllent.org/docs/configuration/runtime-options/)
- [Transformers.js Node 실행](https://huggingface.co/docs/transformers.js/en/tutorials/node)
- [Multilingual E5 모델·query/passage·384차원·MIT 라이선스](https://huggingface.co/intfloat/multilingual-e5-small)
- [Microsoft Graph sendMail 권한 및 202 의미](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)

## Changelog

- 2026-11-05: 최소 자원 로컬 연동, Admin 제공자 전환 및 실제 검증 계약 작성.
- 2026-11-05: 실제 SMTP 수신·계정 복구·384차원 추론·한국어 벡터 검색·재색인 중복 방지·권한 및 모바일 검증 완료. Mailpit ID와 재조회 초기화 수정, protobufjs 패치, 시험 데이터 정리 및 외부 검증 경계 기록.
