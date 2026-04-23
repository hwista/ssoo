# 하이브리드 문서 control-plane

> 최종 업데이트: 2026-04-16

---

## 1. 목적

이 문서는 DMS 문서 런타임을 **file/Git content plane + DB control-plane + metadata projection** 으로 분리하는 이유와 책임 경계를 정의합니다.

---

## 2. 왜 하이브리드인가

순수 file-first 만으로는 아래가 어렵습니다.

- visibility/ACL 질의
- request/grant/expiration 관리
- 검색/RAG 필터링
- revision 기반 충돌 감지
- 운영 감사와 reconciliation

반대로 순수 DB-first 로 가면 현재 DMS의 강점을 크게 흔듭니다.

- markdown 파일 본문
- 실제 첨부/이미지 경로
- Git working checkout
- Git history / recovery

따라서 DMS는 세 층으로 분리합니다.

---

## 3. 책임 분리

| 층 | 역할 | 정본 여부 |
|---|---|---|
| file/Git | markdown 본문, 실파일 경로, Git working checkout/history | content 정본 |
| DB control-plane | `documentId`, visibility, ACL/grant, source registry, request, revision, RAG chunk/index 상태 | control 정본 |
| metadata projection | FE/API 호환을 위한 문서 메타데이터 projection | generated projection |

핵심 원칙:

1. metadata projection 과 DB를 독립 writable truth 두 개로 두지 않는다.
2. file/Git 은 내용(content)의 정본이고, DB 는 제어(control)의 정본이다.
3. metadata projection 은 호환성/운영 편의를 위한 projection 이다.

---

## 4. DB 저장 전략

DMS control-plane 은 PostgreSQL **mixed model** 을 사용한다.

### 4.1 왜 mixed model 인가

- projection-oriented metadata 는 구조가 자주 바뀔 수 있어 `jsonb` 가 유리하다
- ACL / sourceFiles / request / chunk/vector 는 query 가 강해야 해 relation 이 필요하다
- `pgvector` 를 사용할 것이므로 chunk/index 계층은 blob 보다 table 이 낫다

### 4.2 기본 형태

#### core row

- `documentId`
- `relativePath`
- `targetOrgId`
- `visibilityScope`
- `ownerUserId`
- `revisionSeq`
- `contentHash`
- `latestGitCommitHash`
- `metadataJsonb`

#### relation/table 로 분리할 축

- ACL / grant
- access request
- source file registry
- RAG chunk / embedding / index state
- path history

---

## 5. canonical metadata contract

- `sourceFiles` 를 canonical field 로 사용한다
- `referenceFiles` 는 migration 기간 읽기 호환 alias 로만 유지한다
- projection / API / DB payload 모두 `sourceFiles` 기준으로 수렴한다

---

## 6. optimistic concurrency

DMS는 `revisionSeq` 기반 optimistic concurrency 를 사용한다.

### 6.1 규칙

- 문서 open 시 client 는 현재 `revisionSeq` 와 `contentHash` 를 받는다
- save 시 client 는 자신이 편집 시작한 base revision 을 함께 보낸다
- 서버 최신 `revisionSeq` 와 다르면 `409 Conflict`
- client 는 diff/merge surface 를 띄운다

### 6.2 왜 `revisionSeq` 인가

- Git commit hash 는 사용자 저장과 1:1 이 아니다
- file mtime 은 신뢰 가능한 canonical revision 이 아니다
- DB monotonic sequence 가 가장 명확한 conflict token 이다

---

## 7. 저장 동기화

### 7.1 DMS 내부 write

DMS 내부에서 저장/이동/권한 변경이 발생하면 즉시 아래를 동기화한다.

1. file/Git working checkout
2. DB control-plane
3. metadata projection
4. `revisionSeq`

### 7.2 외부 변경

DMS 밖에서 문서용 Git repo 가 바뀌면 아래로 흡수한다.

- startup scan
- 주기적 reconciliation job
- 수동 full resync

이 외부 변경은 DB `revisionSeq` 를 따라잡는 reconciliation 대상이다.

---

## 8. 검색/RAG 인덱스

- 모든 문서를 공통 인덱스에 넣는다
- query/result 단계에서 visibility/ACL 정책으로 필터링 및 표현 제어를 한다
- 검색은 readable surface 가 아니라 discovery surface 이므로, 비접근권 사용자에게도 title/owner/summary/citation 이 노출될 수 있다

---

## 9. 구현에 미치는 직접 영향

이 문서는 아래 변경의 기준이 된다.

- Prisma DMS control-plane 모델 추가
- server read/write/manage 판정 로직 재구성
- search result shape 확장
- access request / grant 모델 추가
- DocumentPage save flow 의 revision token threading
- diff/merge UI 추가

---

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-04-16 | DMS hybrid control-plane 구조, mixed DB model, `revisionSeq` concurrency, reconciliation, 공통 인덱스 전략을 canonical spec 으로 정리 |
