# AI/RAG Platform Roadmap

> Status: active platform workstream
> Scope: server common AI/RAG data plane, shared type contracts, domain index adapters, retrieval, conversation/run logging
> Progress snapshot: 2026-06-23, 66% weighted implementation progress

## Target Shape

SSOO AI/RAG 공용화의 기준은 앱별 DB를 같은 형태로 바꾸는 것이 아니라, 각 도메인이 소유한 데이터를 AI가 소비할 수 있는 projection으로 변환해 공용 data plane에 적재하는 것이다.

도메인 원본은 계속 각 모듈이 소유한다.

- DMS: 문서, 첨부, 문서 ACL, 문서 메타데이터
- CRM: 영업기회, 고객, 활동
- PMS: 프로젝트, 태스크, 멤버, 상태
- SNS: 게시물, 댓글, 보드
- Admin: 제한된 사용자/시스템 설정 메타데이터

공용 계층은 다음을 소유한다.

- `common.cm_ai_source_m`: source app / adapter / capability registry
- `common.cm_ai_object_m`: AI 검색 가능한 원본 객체 projection
- `common.cm_ai_chunk_m`: RAG context 후보 chunk
- `common.cm_ai_embedding_m`: embedding profile별 vector
- `common.cm_ai_acl_snapshot_m`: 검색/RAG pre-filter용 권한 snapshot
- `common.cm_ai_index_job_m`: reindex queue / retry / status
- `common.cm_ai_index_state_m`: object별 indexing state
- `common.cm_ai_retrieval_log_m`: retrieval/request audit
- `common.cm_ai_conversation_m`, `cm_ai_message_m`, `cm_ai_reference_m`, `cm_ai_run_m`, `cm_ai_run_source_r`: AI 대화와 model run 기록

## Current Baseline

2026-06-23 기준으로 다음 기준선을 다시 세웠다.

- `@ssoo/types/common`에 `ai`, `ai-index`, `ai-retrieval` 계약을 복원했다.
- Prisma schema와 migration에 `common.cm_ai_*` data plane을 추가했다.
- `cm_ai_source_m`, `cm_ai_object_m`, `cm_ai_index_state_m`는 history trigger 대상이다.
- 서버 `CommonAiIndexModule`은 adapter registry, source status, job queue/run, object projection apply를 제공한다.
- `CommonAiIndexModule`은 Azure OpenAI embedding provider foundation을 소유하고, provider readiness를 source/state metadata에 기록한다.
- 공용 indexer는 stable chunk identity를 유지하며 active chunk hash 기준으로 `cm_ai_embedding_m`을 upsert한다.
- 공용 index job은 batch size, retry/backoff, max attempt, provider unavailable/runtime failure, profile mismatch reindex metadata를 job/state에 기록한다.
- `CommonAiIndexModule`은 공용 retrieval query service를 제공하며 query embedding, `cm_ai_embedding_m` vector search, keyword fallback, ACL snapshot pre-filter를 처리한다.
- 공용 retrieval query service는 response `contextItems`/`citations`를 조립하고 `common.cm_ai_retrieval_log_m`/item에 request/result/context audit를 남기며, log가 남은 context가 있을 때만 `ragReady`를 true로 올린다.
- `CommonAiIndexModule`은 공용 conversation/message/reference/run/run-source service와 API를 제공하며, model run audit source를 retrieval log/reference/object/chunk로 기록한다.
- DMS AskService는 공용 retrieval을 우선 호출해 `contextItems`/`citations`를 기존 DMS Ask 응답 shape로 매핑하고, conversation/message/run/run-source audit에 `retrievalLogId`와 prompt 포함 source를 기록한다. 공용 retrieval이 비거나 실패하면 기존 DMS SearchService 기반 legacy vector/keyword path로 fallback한다.
- `CommonAiIndexModule`은 공용 model gateway를 제공하며, DMS AskService의 chat model generation/stream 실행과 provider/model/deployment metadata 기록은 이 gateway 경계를 통과한다.
- DMS `DmsAiIndexAdapter`는 markdown 문서를 첫 reference implementation으로 공용 AI index projection에 적재한다.
- 기존 DMS `dms_document_embeddings` runtime store는 당장 제거하지 않고, 공용 `cm_ai_*` 이관이 완료될 때까지 legacy vector store로 남긴다.

## Progress Accounting

진척도는 사용자에게 보이는 검색 UI 진척도가 아니라 platform implementation 기준이다. 각 항목의 weight는 최종 AI/RAG 공용화 완료에 대한 상대 비중이고, overall progress는 `weight * status`의 합으로 계산한다.

| Phase | Weight | Status | Weighted | Evidence | Remaining |
| --- | ---: | ---: | ---: | --- | --- |
| AI-RAG-00 Roadmap/Guardrails | 5% | 100% | 5.0% | roadmap, changelog, verifier 기준선 | 세션 단절 대비 상태판 유지 |
| AI-RAG-01 Common Data Plane | 12% | 85% | 10.2% | Prisma models, migration, history triggers | 실제 DB 적용 smoke, pgvector index 운영 점검 |
| AI-RAG-02 Shared Type Contract | 8% | 85% | 6.8% | `@ssoo/types/common/ai*` exports | retrieval/conversation 구현 중 계약 보강 |
| AI-RAG-03 Index Adapter Registry | 10% | 60% | 6.0% | registry, status API, job queue/run | 운영 권한 guard, scheduler/worker 분리, retry 관측성 |
| AI-RAG-04 DMS Reference Adapter | 10% | 55% | 5.5% | DMS markdown projection, chunk/ACL snapshot | 첨부/문서 ACL 정밀화, legacy vector store 이관 |
| AI-RAG-05 Embedding Pipeline | 12% | 85% | 10.2% | common Azure embedding provider foundation, chunk hash diff, `cm_ai_embedding_m` upsert, job safety metadata | provider runtime smoke, migration/reindex runbook |
| AI-RAG-06 Retrieval Service | 12% | 75% | 9.0% | common retrieval query service, query embedding, vector search, keyword fallback, ACL pre-filter, retrieval log, citation/context assembly, DMS Ask common retrieval consumption | runtime smoke, DMS legacy comparison |
| AI-RAG-07 Conversation and Run Service | 10% | 90% | 9.0% | conversation/run tables, common service/controller, message/reference append, run start/complete audit, run-source recording, DMS Ask run audit, common model gateway for DMS Ask | runtime smoke, broader DMS AI path migration |
| AI-RAG-08 Domain Adapter Expansion | 8% | 5% | 0.4% | DMS only | CRM/PMS/SNS/Admin projection adapters |
| AI-RAG-09 Web Assistant Surface | 8% | 5% | 0.4% | `/ssoo/search` search surface baseline | common assistant surface, streaming, citations, task actions |
| AI-RAG-10 Verification and Ops | 5% | 60% | 3.0% | `verify:ai-rag-platform`, server build, Docker build | runtime smoke, guard integration, migration/reindex runbook |

Overall progress: **66%**.
Common retrieval can now report `ragReady` when logged context assembly exists, and DMS Ask consumes that context through common retrieval while recording conversation/run audit through the common model gateway. Platform assistant/DMS Ask production readiness remains **not production-ready** until runtime smoke and runbook verification are complete.

## Execution Plan

### AI-RAG-00. Roadmap and Guardrail Baseline

공용 AI/RAG 작업은 통합 검색 UI 공용화와 구분한다. `/api/search`와 `/ssoo/search`는 검색 표면 기준선이고, AI/RAG platform 완료 기준은 아니다.

### AI-RAG-01. Common Data Plane

`packages/database/prisma/schema.prisma`와 migration에 `common.cm_ai_*` 테이블을 둔다. 새 도메인 adapter는 원본 도메인 테이블을 직접 공용 service에 노출하지 않고 `AiIndexObjectProjection`만 반환한다.

### AI-RAG-02. Shared Type Contract

`packages/types/src/common/ai*.ts`가 서버와 웹의 공용 계약이다. 런타임 로직은 넣지 않고 explicit type re-export만 유지한다.

### AI-RAG-03. Index Adapter Registry

`CommonAiIndexModule`은 source app별 adapter registry를 소유한다. DMS, CRM, PMS, SNS, Admin adapter는 각 도메인 모듈에서 등록한다.

### AI-RAG-04. DMS Reference Adapter

DMS markdown projection은 `DmsAiIndexAdapter`가 담당한다. 문서 본문, title, content hash, metadata, visibility 기반 ACL snapshot, chunk projection을 공용 indexer에 넘긴다.

### AI-RAG-05. Embedding Pipeline

공용 indexer가 chunk hash 비교, embedding generation, `cm_ai_embedding_m` upsert, job safety metadata를 맡는다. 모델/provider/dimension은 embedding profile로 관리하고, profile 변경은 profile mismatch reindex metadata와 active embedding 비활성화 경로로 처리한다.

### AI-RAG-06. Retrieval Service

공용 retrieval service는 query embedding, vector search, keyword fallback, hybrid ranking, ACL filter를 처리한다. response citation/context assembly와 `cm_ai_retrieval_log_m`/item audit를 남기며, 검색 capability의 `ragReady`는 logged context assembly가 실제 제공될 때만 true다.

### AI-RAG-07. Conversation and Run Service

AI 대화는 공용 conversation/message/reference/run/run-source 테이블 위에 둔다. 공용 service/controller는 conversation CRUD, message/reference append, run start/complete audit를 제공한다. DMS AskService는 공용 retrieval, conversation/run audit, model gateway를 우선 사용한다.

### AI-RAG-08. Domain Adapter Expansion

CRM, PMS, SNS, Admin은 projection/권한/target resolver만 제공한다. 공용 AI service가 각 도메인 DB를 직접 import하지 않는다.

### AI-RAG-09. Web Assistant Surface

검색 결과, RAG citation, conversation stream, domain task 실행 UI는 `web-shell` 공용 assistant surface로 중앙화한다. 앱은 task adapter와 open target adapter만 주입한다.

### AI-RAG-10. Verification and Ops

검증은 다음 항목을 최소 기준으로 둔다.

- type package build
- Prisma schema validation
- server build
- `codex:preflight`
- DMS 변경 포함 시 `codex:dms-guard`
- Docker rebuild

추가 verifier는 `cm_ai_*` schema, `CommonAiIndexModule`, DMS adapter registration, `ragReady` 과장 금지를 함께 확인해야 한다.

## Remaining Task Register

| ID | Task | Scope | Exit Criteria |
| --- | --- | --- | --- |
| AI-RAG-05A | Common embedding provider foundation | server common AI index | Done. DMS 전용 Azure OpenAI embedding 초기화 경로를 공용 provider/gateway로 추출하고, provider 미설정 시 deterministic unavailable status를 기록한다. |
| AI-RAG-05B | Chunk diff and embedding upsert | `cm_ai_chunk_m`, `cm_ai_embedding_m` | Done. active chunk hash 기준으로 신규/변경 chunk만 `embedMany` 후 `cm_ai_embedding_m`에 upsert한다. |
| AI-RAG-05C | Embedding job safety | index jobs | Done. batch size, retry/backoff, last error, provider unavailable/runtime failure, profile mismatch reindex 경로를 job/state metadata에 반영한다. |
| AI-RAG-06A | Common retrieval query service | server common AI retrieval | Done. query embedding, `cm_ai_embedding_m` vector search, keyword fallback, hybrid ranking, ACL pre-filter를 공용 service와 `/ai-index/retrieval/query` endpoint로 제공한다. |
| AI-RAG-06B | Retrieval log and citation assembly | retrieval logs | Done. `cm_ai_retrieval_log_m`/item 기록, citation/context item 반환, logged context assembly 기준 `ragReady` capability 연결을 완료했다. |
| AI-RAG-07A | Conversation/run service | conversation tables | Done. conversation/message/reference/run/run-source CRUD와 model run audit를 공용 service/controller로 제공한다. |
| AI-RAG-07B | DMS Ask retrieval/run audit migration | DMS ask/search | Done. DMS AskService가 common retrieval/conversation/run audit를 우선 호출하고, 공용 retrieval 무결과/실패 시 legacy vector/keyword path로 fallback한다. |
| AI-RAG-07C | Common model gateway integration | server common AI gateway, DMS ask | Done. DMS AskService의 chat model provider 호출을 공용 model gateway로 이동하고 run provider/model/deployment metadata를 gateway 결과 기준으로 기록한다. |
| AI-RAG-08A | CRM adapter | CRM server module | opportunity/customer/activity projection과 target resolver를 등록한다. |
| AI-RAG-08B | PMS adapter | PMS server module | project/task/member/status projection과 target resolver를 등록한다. |
| AI-RAG-08C | SNS adapter | SNS server module | board/post/comment projection과 visibility snapshot을 등록한다. |
| AI-RAG-08D | Admin adapter | Admin/common module | 허용된 system/user metadata만 제한 projection으로 등록한다. |
| AI-RAG-09A | Common assistant web surface | `web-shell`, apps | search result, RAG citations, conversation stream, domain action entry를 공용 surface로 제공한다. |
| AI-RAG-10A | Runtime smoke and runbook | scripts/docs/docker | DB migration apply, reindex, retrieval, Docker rebuild를 재현 가능한 smoke/runbook으로 고정한다. |

## Next Selected Work

다음 작업은 **AI-RAG-10A Runtime smoke and runbook**으로 진행한다.

선정 이유:

- 공용 retrieval query service는 logged context/citation assembly까지 연결됐다.
- DMS AskService는 common retrieval, conversation/run audit, common model gateway를 쓰기 시작했다.
- 이제 실제 DB migration apply, DMS reindex, retrieval query, DMS Ask run audit까지 한 번에 검증하는 smoke/runbook이 필요하다.

AI-RAG-10A 작업 원칙:

- DMS legacy vector search는 삭제하지 않는다.
- DB migration apply, trigger apply, DMS reindex, common retrieval query, DMS Ask JSON/stream 최소 경로를 재현 가능한 순서로 묶는다.
- 외부 Azure OpenAI 설정이 없는 환경에서는 provider unavailable 상태와 legacy fallback이 기대대로 기록되는지 확인한다.
- Docker rebuild와 smoke 결과를 문서화한다.

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-23 | `AI-RAG-07C` common model gateway를 추가해 DMS Ask의 chat generation/stream 실행과 run provider/model/deployment metadata 기록을 공용 gateway 경계로 이동했다. |
| 2026-06-23 | `AI-RAG-07B` DMS Ask common retrieval/run audit migration을 반영하고, model gateway 통합을 `AI-RAG-07C`로 분리했다. |
| 2026-06-23 | `AI-RAG-07A` conversation/message/reference/run/run-source 공용 service/controller와 model run audit 기록을 반영하고 다음 작업을 `AI-RAG-07B`로 갱신했다. |
| 2026-06-23 | `AI-RAG-06B` retrieval log, response context/citation assembly, logged context 기준 `ragReady` gate를 반영하고 다음 작업을 `AI-RAG-07A`로 갱신했다. |
| 2026-06-23 | `AI-RAG-06A` common retrieval query service, vector search, keyword fallback, ACL pre-filter endpoint를 반영하고 다음 작업을 `AI-RAG-06B`로 갱신했다. |
| 2026-06-23 | `AI-RAG-05C` embedding job safety metadata, retry/backoff, batch policy, profile mismatch reindex 기록을 반영하고 다음 작업을 `AI-RAG-06A`로 갱신했다. |
| 2026-06-23 | `AI-RAG-05B` chunk hash diff와 `cm_ai_embedding_m` upsert writer를 반영하고 다음 작업을 `AI-RAG-05C`로 갱신했다. |
| 2026-06-23 | `AI-RAG-05A` common Azure embedding provider foundation을 반영하고 다음 작업을 `AI-RAG-05B`로 갱신했다. |
| 2026-06-23 | 진행률 산정 기준, phase별 상태판, 남은 태스크 register, 다음 작업 `AI-RAG-05A`를 문서에 고정했다. |
| 2026-06-23 | 공용 AI/RAG data plane, shared type contract, `CommonAiIndexModule`, DMS reference adapter 기준선을 재수립했다. |
