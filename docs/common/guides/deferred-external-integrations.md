# 보류한 외부 연동 설정과 재개

> 기준일: 2026-11-05 · 대상: 플랫폼 관리자와 배포 담당자

사용자는 예산 확보 전 SMTP·Azure 임베딩·Microsoft 로그인의 실제 외부 연동 검증을 보류하고 다음 공통 운영 시나리오를 검토하도록 결정했다. 이 세 항목은 현재 단계의 진행 차단 조건에서 제외한다. 이후 사용자가 최소 자원 로컬 연동과 Admin 전환 기능 구현을 요청했다. 유료 자원 생성과 외부 유료 호출은 보류하며, 로컬 실제 검증은 [현재 구현·검증 문서](../explanation/architecture/2026-11-05-local-runtime-integrations.md)에서 추적한다.

## 설정 책임

| 연동 | 어드민에서 설정·확인 | 서버에 준비할 값 | 적용 시점 |
|---|---|---|---|
| Microsoft 로그인 | 인증 정책 `/auth`에서 Tenant ID, Client ID, Redirect URI, 허용 테넌트/도메인, Scopes, Client Secret, 로그인·가입 신청 사용 여부 저장 | `AUTH_CONFIG_ENCRYPTION_KEY`, OAuth 서명·공개 URL 등 기존 인증 배포 설정 | DB 설정은 저장 후 인증 요청에 적용. 서버 환경변수 변경은 서버 재적용 필요 |
| 메일 | 인증 메일 운영 `/email-operations`의 메일 연결 설정에서 로컬·회사 SMTP·Microsoft Graph 선택, 연결 확인·저장·시험 발송·로컬 수신함 조회 | 암호화 키, 로컬 Mailpit 설치. 기존 환경변수 방식도 선택 가능 | DB 설정 저장 즉시 적용. 자동 발송은 활성화 이후 생성 메일부터 처리 |
| AI 임베딩 | `/ai-operations`에서 로컬·Azure 선택, 실제 생성 확인·설정 저장, 재색인 작업 운영 | 로컬 모델 캐시, 암호화 키. 자동 worker는 환경변수로 별도 관리 | 실제 요청은 저장 설정을 사용. 제공자 변경 후 기존 대상 재색인 필요 |

비밀값을 소스코드에 직접 추가하지 않는다. 실제 값은 Git에서 제외된 환경 파일 또는 배포 비밀 저장소로 주입한다. 저장소의 예시 파일에는 이름과 빈 값만 남긴다. `NEXT_PUBLIC_*`로 비밀번호나 키를 전달하지 않는다. Microsoft Client Secret은 기존 서버 암호화 저장 기능을 사용하며 조회 응답은 설정 여부만 반환한다. 암호화 키는 저장한 비밀값 복호화에 필요하므로 기존 키를 임의로 교체하지 않는다.

## Admin에서 메일 전환

1. 인증 메일 운영 → 메일 연결 설정에서 회사 SMTP 또는 Microsoft 365 메일을 선택한다.
2. 접속 정보와 비밀값, 변경 사유를 입력하고 연결 확인을 실행한다.
3. 발송 활성화를 선택하고 저장·적용한다. 시험 메일을 보내 수신자의 사서함에서 실제 도착을 확인한다.
4. Graph는 발신 Exchange 사서함, 애플리케이션 Mail.Send 권한과 관리자 동의가 필요하다. Microsoft 로그인 설정과는 별개다.
5. 비활성화 또는 로컬 수신함으로 다시 전환할 수 있다. 로컬에서 이미 보관한 메일은 외부로 자동 재발송하지 않는다.

## 기존 환경변수 방식의 SMTP 재개

| 환경변수 | 입력 |
|---|---|
| `AUTH_EMAIL_SMTP_HOST` | 사용 승인된 SMTP 서버 주소 |
| `AUTH_EMAIL_SMTP_PORT` | 해당 서버 포트 |
| `AUTH_EMAIL_SMTP_SECURE` | 서버의 TLS 방식에 맞는 true/false |
| `AUTH_EMAIL_SMTP_USERNAME` | 발송 인증 계정 |
| `AUTH_EMAIL_SMTP_PASSWORD` | 발송 인증 비밀값 |
| `AUTH_EMAIL_FROM_ADDRESS` | 서버의 기본 발신 주소. 어드민의 발신 주소도 허용된 주소로 설정 |
| `AUTH_EMAIL_OUTBOX_WORKER_ENABLED` | 보류 중 false. 대기 기록 검토·연결 준비 후에만 true |
| `AUTH_EMAIL_OUTBOX_RUN_ON_START` | 준비 중 false. false여도 worker를 활성화하면 주기 실행은 발생함 |

현재 전송기는 사용자명·비밀번호 인증과 사용 승인된 내부 무인증 SMTP 릴레이를 지원한다. Microsoft Graph는 Admin에서 별도 제공자로 선택한다.

1. worker를 끈 상태에서 서버 설정을 준비한다. 기존 대기 메일의 수신 대상·유효성을 검토한다.
2. 어드민에서 메일 전달 모드 `outbox`와 허용된 발신 주소를 저장한다.
3. 테스트 수신함을 준비하고 worker 활성화 적용 시점을 정한다. Admin의 활성화 시점이 없는 기존 환경변수 모드에서는 기존 대기열도 처리 대상이므로 먼저 검토한다.
4. 상태 새로고침으로 준비를 확인하고, 테스트 계정의 복구 요청→실제 수신→코드 사용→비밀번호 변경→세션 처리를 검증한다.
5. 실패 기록과 허용된 재시도를 확인한 뒤 보류 판정을 해제한다. 만료된 복구 요청은 새로 발급한다.

## Azure 임베딩 재개

Admin `/ai-operations`에서 Azure 제공자·접속 정보·API Key를 저장하는 방법을 우선 사용한다. 아래는 기존 서버 환경 설정 제공자를 선택했을 때의 대안이다. 로컬 임베딩의 수동 실행은 유료 외부 호출 보류와 별개로 사용할 수 있다.

- `AZURE_OPENAI_ENDPOINT`: 호출 가능한 Azure OpenAI endpoint.
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`: 실제 임베딩 배포 이름. 채팅 배포 이름으로 대체하지 않는다.
- `OPENAI_API_VERSION`: 제공자와 현재 구현에 맞는 API 버전.
- `AZURE_OPENAI_EMBEDDING_DIMENSION`: 필요한 경우 설정. 기존 저장소·프로필 차원과 맞춰야 한다.
- 인증은 `AZURE_OPENAI_API_KEY` 또는 권한이 부여된 Entra 서비스 계정(`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`)을 사용한다. Managed Identity 사용 환경에서는 `AZURE_USE_MANAGED_IDENTITY`와 필요 시 `AZURE_MANAGED_IDENTITY_CLIENT_ID`를 설정한다.
- `AI_INDEX_WORKER_ENABLED=false`를 유지하고 수동 작업 실행도 보류한다. 설정만 조회하는 것과 실제 제공자를 호출하는 작업 실행을 구분한다.

서버 적용 후 어드민의 준비 상태를 새로고침한다. ready 표시는 설정 준비 검사이며 호출 성공 증거는 아니다. 등록된 소스와 제한된 테스트 자료로 실제 성공 및 실패 후 복구를 검증하고, 처리할 대기열과 사용 예산을 확인한 뒤 자동 실행을 활성화한다. 구체적인 제공자 연동 검증은 [AI 런타임 운영 절차](ai-rag-runtime-runbook.md)를 따른다. 각 앱의 추출·검색 정책은 해당 앱의 책임으로 유지한다.

## Microsoft 로그인 재개

1. 사용할 Entra 앱 등록·테스트 계정·허용 범위를 준비하고, 앱 등록의 Redirect URI를 서버 callback 주소와 일치시킨다.
2. 서버의 암호화 키 등 기존 인증 배포 설정을 준비한 후 `/auth`에서 식별자·Redirect URI·Scopes·허용 범위와 Client Secret을 입력한다.
3. 비밀번호 로그인을 유지한 상태에서 Microsoft 로그인·가입 신청을 필요한 범위만 활성화하고 저장한다. Client Secret 빈 입력은 기존 값을 유지한다.
4. 실제 로그인과 허용 범위 밖 거절, 가입 신청→관리자 승인→계정 연결을 확인한다. 실패하면 Microsoft 사용 여부를 끄고 원인을 확인한다.

## 배포 적용 위치와 개발자가 이어갈 경로

- 기존 로컬 Docker는 루트 `.env`를 읽는다. 환경변수 변경은 기존 서버에 `pnpm run docker:up --no-deps server`로 재적용한다. Admin의 DB 연결 설정 변경에는 재배포가 필요하지 않다. 로컬 메일용 Mailpit 한 개와 모델 캐시 볼륨을 재사용하며 호스트 포트를 추가하지 않는다. 로컬 메일과 임베딩은 실제 검증 후 활성화하며 AI 자동 worker는 꺼 둔다.
- 운영 배포는 기존 `.env.production`과 배포 절차를 따른다. 현재 `compose.production.yaml`은 SMTP 필수값을 요구한다. 이번 로컬 예산 보류를 운영 배포 규칙의 자동 완화로 해석하지 않는다.
- [루트 환경변수 예시](../../../.env.example), [공용 Compose](../../../compose.yaml), [운영 Compose](../../../compose.production.yaml).
- [인증 정책과 암호화](../../../apps/server/src/modules/common/auth/auth-policy.service.ts), [SMTP 전송기](../../../apps/server/src/modules/common/auth/auth-email-outbox-worker.service.ts), [임베딩 제공자](../../../apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts).
- 메일·임베딩 연결은 공통 integration settings의 저장·암호화·조회 마스킹·적용 시점·변경 이력과 연결한다. 암호화 키는 배포 비밀값이며 Admin 조회·편집 대상이 아니다.

## Changelog

| 날짜 | 내용 |
|---|---|
| 2026-11-05 | 로컬 메일·CPU 임베딩과 Admin 제공자 전환 구현을 반영하고 기존 환경변수 재개 절차를 구분 |
| 2026-11-05 | 사용자 예산 제약에 따른 3개 연동 보류, 기존 어드민/서버 설정 책임과 실제 연동 재개 기준 기록 |
