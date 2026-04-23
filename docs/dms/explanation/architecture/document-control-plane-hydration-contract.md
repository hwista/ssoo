# DMS 문서 control-plane hydration 계약

> 최종 업데이트: 2026-04-21
> 관련 문서:
> - `hybrid-document-control-plane.md`
> - `document-visibility-and-access-model.md`
> - `document-repo-source-of-truth-policy.md`

---

## 1. 왜 이 문서가 필요한가

현재 DMS에서 막히는 실제 문제는 단순히 owner 메타가 비어 있다는 현상 자체가 아니다.
핵심은 아래 3개가 아직 실행 계약으로 완전히 닫히지 않았다는 점이다.

1. legacy sidecar 메타데이터 중 무엇을 RDB canonical column/relation 으로 가져갈 것인가
2. 무엇을 `jsonb` projection 으로 유지할 것인가
3. 로그인 직후 / 새로고침 시 파일 목록과 권한 메타를 어떤 쿼리 계약으로 hydrate 할 것인가

이 문서는 그 3개를 현재 구현 기준에서 실제로 써먹을 수 있는 운영 계약으로 고정한다.

---

## 2. 최상위 원칙

1. 문서 본문과 실제 파일 경로는 계속 file/Git content plane 이 정본이다.
2. 권한/가시성/요청/소스파일 레지스트리/동기 상태는 DB control-plane 이 정본이다.
3. `.sidecar.json` 파일은 더 이상 문서/템플릿 runtime 계약의 일부가 아니며, save/update/resync 이후 repo/runtime 어디에도 남아 있으면 안 된다.
4. 로그인 후 좌측 파일 트리 hydration 은 legacy sidecar 직접 파싱이 아니라 **DB query + tree projection build** 를 기본 경로로 사용한다.
5. 폴더는 권한 객체가 아니다. 권한 객체는 문서다.
6. 폴더 노출은 하위 readable 문서 존재 여부에서 파생된다.

---

## 3. legacy sidecar 필드 분류 규칙

기준은 단순하다.

- 자주 질의되고 정책 판정에 직접 쓰이는 것 = relation/column 으로 승격
- 검색/filter/sort/authorization 에 강하게 걸리는 것 = relation/column 으로 승격
- 구조 변경이 잦고 UI 편의/호환성이 큰 것 = `jsonb` projection 유지
- file/Git 에 종속된 렌더링용/편집용 부가 메타 = `jsonb` 우선

---

## 4. RDB canonical 로 가져갈 것

### 4.1 core document row (`dms.dm_document_m`)
이미 있거나 반드시 유지할 core canonical field:

- `documentId`
- `relativePath`
- `ownerUserId`
- `visibilityScope`
- `targetOrgId`
- `documentStatusCode`
- `syncStatusCode`
- `revisionSeq`
- `contentHash`
- `latestGitCommitHash`
- `lastScannedAt`
- `lastSyncedAt`
- `lastReconciledAt`
- `isActive`
- `metadataJsonb`

이 중 실제 권한 hydration의 최소 기준은 아래다.

필수 hydration key:
- `documentId`
- `relativePath`
- `ownerUserId`
- `visibilityScope`
- `targetOrgId`
- `revisionSeq`
- `contentHash`
- `syncStatusCode`
- `metadataJsonb` 일부 필드

### 4.2 relation 으로 canonical 해야 하는 축

#### A. grant / ACL
정본 테이블:
- `dms.dm_document_grant_r`

이유:
- 로그인 후 권한 파일 목록 hydration
- 문서 접근 가능 여부 판정
- request 승인 후 grant 반영
- 만료/취소/감사 이력

#### B. access request
정본 테이블:
- `dms.dm_document_access_request_m`

이유:
- 검색 discovery surface 에서 unreadable 문서 요청 CTA
- owner inbox / document permission panel
- request 상태 집계

#### C. source file registry
정본 테이블:
- `dms.dm_document_source_file_m`

이유:
- `storage/open` 정책 검증
- source file / attachment / reference / ingest 연동
- local/sharepoint/nas provider 별 open/resync 정책

#### D. path history
정본 테이블:
- `dms.dm_document_path_history_m`

이유:
- rename/move 추적
- reconciliation / debug / audit

#### E. comment / discussion
정본 테이블:
- `dms.dm_document_comment_m`

이유:
- 문서별 discussion thread / comment 이력의 canonical 저장
- FE `DocumentMetadata.comments` shape 유지 + DB projection 소비
- metadata companion file 없는 save/update 이후에도 comment metadata 정합성 유지

#### F. chunk / embedding / index state
정본 테이블:
- `dm_document_chunk_m`, `dm_document_index_state_m` 등

이유:
- search/RAG indexing lifecycle
- stale index / reindex 판단

---

## 5. `jsonb` 로 유지할 것

`metadataJsonb` 에는 아래처럼 “document rendering / editing / compatibility” 성격이 강한 필드를 유지한다.

권장 유지 대상:
- `title`
- `summary`
- `tags`
- `sourceLinks`
- `bodyLinks`
- `templateId`
- `versionHistory` (장기적으로 별도 분리 가능하지만 지금은 projection 가능)
- `comments` projection copy
- `author`
- `lastModifiedBy`
- `createdAt`
- `updatedAt`
- `pathHistory` projection copy
- `sourceFiles` projection copy
- `visibility` projection copy
- `grants` projection copy

핵심 원칙:
- `metadataJsonb` 는 검색/권한 판정의 유일한 정본이 아니다.
- DB relation/column 에 있는 값들을 FE/API 친화 형태로 같이 들고 있는 projection 이어야 한다.

---

## 6. metadata companion file exit 정책

`.sidecar.json` 파일은 document/template runtime 에서 완전히 제거한다.
현재 기준 계약은 아래다.

- 파일 트리 hydrate 는 DB control-plane row 로 만든다.
- 문서 metadata read 는 DB projection 만 사용한다.
- `/api/file` read/readMetadata 는 DB projection 또는 in-memory default metadata 로 응답한다.
- `/api/content` 와 markdown write/update 경로는 기존 DB projection 을 base metadata 로 재사용해 revision/ACL/visibility/source-file projection 을 보존한다.
- `/api/content`, `/api/file` 의 markdown mutation 경로는 search sync 보다 먼저 control-plane projection refresh/reconcile 을 수행해 optional downstream failure(예: index sync 502)가 DB-first access/control-plane freshness 를 깨지 않게 유지한다.
- `/api/storage/resync` 는 DB row / relation / `metadataJson` projection 만 갱신한다.
- `storage/open` 의 local source-file allow-list 도 DB source-file registry 를 먼저 사용한다.
- `file/serve-attachment` 같은 same-origin binary surface 도 storage-backed asset path 를 직접 열 수 있어야 하며, 허용 여부는 “읽을 수 있는 문서가 이 asset path 를 참조하는가” 계약으로 판정한다.
- markdown write/create/updateMetadata 뒤에는 해당 문서 control-plane projection 을 즉시 다시 동기화하고, rename/delete 뒤의 full repo reconcile 은 remote parity 가 fast-forward safe 로 확인된 경우에만 stale row 비활성화를 수행한다.
- remote ahead / diverged / parity inspection 실패 상태에서는 repo-wide reconcile/deactivate mutation 을 건너뛰고, 기존 DB control-plane read surface 를 계속 사용한다.
- control-plane sync/repair 는 기존 `metadataJson` + 현재 mutation metadata override 를 병합하고, precedence 는 `기존 DB metadata < 현재 mutation metadata` 로 유지한다.
- sync/repair 는 기존 DB metadata 를 기본값으로 덮어써서는 안 되며, 기존 owner/visibility/source-file/path-history truth 를 보존해야 한다.
- mutation caller 는 이미 메모리에 있는 metadata 를 `syncDocumentProjection(...)` 로 직접 전달한다.
- template metadata 도 `dms.dm_template_m.metadataJson` 이 canonical source 이고, markdown content 는 문서 Git 레포의 `_templates/` 하위(`_templates/system/<id>.md` 또는 `_templates/personal/<id>.md`)에만 남긴다. 템플릿은 문서 Git 레포 안에 포함되어 GitLab과 자동 동기화된다.
- `scripts/verify-access-dms.mjs` 는 저장 직후 probe sidecar 생성 자체를 실패로 간주하고, effective markdown runtime root 전체에 `.sidecar.json` 이 남아 있지 않은지도 함께 검증한다.

즉 의미는 분명하다.

- DB = 권한/제어/registry 정본
- file/Git = content 정본
- legacy sidecar companion file = 제거 대상

---

## 7. 로그인 후 hydration 계약

### 7.1 지금 필요한 사용자 경험
로그인 후 첫 진입에서 필요한 것은:

1. 이 사용자가 DMS에 들어올 수 있는가
2. 이 사용자가 읽을 수 있는 문서 목록은 무엇인가
3. 그 목록으로 좌측 파일 트리를 만들 수 있는가

즉 첫 진입 파일 목록 hydration은 “문서 전체 메타 full hydrate”가 아니라
**권한 파일 목록 hydrate** 가 우선이다.

### 7.2 단계별 hydration

#### Step A. auth/session hydrate
- `/api/auth/session` 또는 shared auth restore
- 결과: authenticated identity 확보

#### Step B. DMS access snapshot hydrate
- `/api/dms/access/me`
- 결과:
  - `canReadDocuments`
  - `canWriteDocuments`
  - `canManageSettings`
  - `canManageStorage`
  - `canUseGit`
  등 feature gate 확보

#### Step C. readable document list hydrate
장기 목표:
- DB control-plane query 로 readable `documentId + relativePath + minimal metadata` 목록을 조회

필요 응답 shape 예시:
- `documentId`
- `relativePath`
- `title`
- `ownerUserId`
- `ownerLoginId/displayName`
- `visibilityScope`
- `updatedAt`
- `revisionSeq`
- `hasPendingRequest` (optional)
- `grantSummary` (optional)

#### Step D. tree projection build
- readable document list를 path segment 기준으로 서버 또는 클라이언트에서 tree 로 투영
- 폴더는 별도 권한 객체가 아니므로, readable document 가 있는 경로만 생성

즉 장기 계약은:
- **DB에서 readable documents query → tree projection build → UI hydrate**
이다.

---

## 8. 왜 지금 file-tree API가 흔들리는가

이 문서를 처음 쓸 때는 file-system tree를 먼저 만들고,
그 후 `DocumentAclService.filterFileTree()` 로 legacy sidecar/ACL 기반 필터를 적용하는 비중이 컸다.

그 방식의 문제:
- legacy sidecar owner 메타 누락 시 brittle 함
- DB control-plane 과 file tree truth 가 어긋날 수 있음
- 문서가 많아질수록 권한 판정과 tree projection이 비효율적임

따라서 다음 진화 방향은 명확하다.

### 현재 구현 기준
- control-plane sync 후 DB active document row 조회
- DB projection 으로 tree build
- ACL 판정은 cache-first, DB projection 기준
- filesystem 은 open/render/save 시점의 content plane 으로 사용

### 목표
- DB에서 readable document rows query
- 그 결과로 tree projection 생성
- filesystem은 open/render/save 시점의 content plane으로 사용

---

## 9. 쿼리 계약 제안

### 9.1 initial sidebar hydration query
목표:
- 로그인 직후 좌측 파일 목록 구성

서버 query contract:
- 입력: `currentUser`
- 조건:
  1. system admin override
  2. visibility (`public` / `organization` / `self`)
  3. explicit grants (`read|write|manage`)
  4. active only
- 출력:
  - readable documents minimal list

이 쿼리는 relation/column 중심으로 계산하고,
`metadataJsonb` 에서는 오직 표시용 필드(title/updatedAt 등)만 읽는다.

### 9.2 document open hydration query
목표:
- 문서 탭 오픈 시 필요한 메타와 본문 로드

입력:
- `relativePath` 또는 `documentId`

출력:
- content plane: markdown 본문
- control plane: canonical permission/revision/source registry
- projection: FE-friendly metadata payload

권장 응답 shape:
- `documentId`
- `relativePath`
- `content`
- `revisionSeq`
- `contentHash`
- `title`
- `summary`
- `tags`
- `owner`
- `visibility`
- `grants`
- `sourceFiles`
- `updatedAt`
- `lastModifiedBy`

### 9.3 search hydration query
검색은 discovery surface 다.
따라서 쿼리 결과는
- readable 여부
- request 가능 여부
- owner
- title/summary/citation
을 포함해야 한다.

즉 search는 file tree와 달리 “보이는 문서 목록”이 아니라
“발견 가능한 문서 목록 + access state”를 내려야 한다.

---

## 10. 당장 필요한 선행 구현 순서

### Priority 1 — reconciliation contract 확정
외부 Git working tree의 문서를 DB control-plane 으로 흡수하는 규칙 확정

최소 반영 대상:
- `relativePath`
- `ownerUserId`
- `visibilityScope`
- `targetOrgId`
- `revisionSeq`
- `contentHash`
- `metadataJsonb`

fallback 규칙도 필요:
- owner 메타 누락 문서는 hard fail 금지
- `unknown` 상태로 ingest 가능하게 두고 operator queue 또는 repair queue로 보낸다

### Priority 2 — readable documents query API 추가
- file-system tree filtering 대신 DB 기반 readable-doc query 추가
- 이후 tree projection API 또는 server-side projection 추가

### Priority 3 — startup scan / periodic reconciliation job
- 앱 기동 시 doc repo scan
- markdown repo metadata → DB upsert/reconcile
- missing owner/visibility/grant 상태는 repair-needed 로 표시하되, 테스트 문서도 실제 런타임 계약으로 정규화하는 방향으로만 보정한다

### Priority 4 — owner metadata repair policy
테스트 문서/legacy 문서는 owner 메타가 비어 있을 수 있다.
따라서 아래 정책이 필요하다.
- `ownerId` 우선
- 없으면 `ownerLoginId`
- 없으면 `author`
- 이것도 없거나 `Unknown` 이면 `repair-needed`
- 절대 전체 문서 목록 400으로 죽이지 않는다

---

## 11. 최종 결론

네가 짚은 게 맞다.
지금 선행돼야 하는 것은 “owner 누락 예외처리” 자체보다 더 상위의 계약이다.

즉 먼저 닫아야 할 것은:
1. legacy sidecar에서 무엇을 RDB canonical 로 승격할지
2. 무엇을 `jsonb` projection 으로 둘지
3. 로그인 후 첫 진입 / refresh 시 파일 목록을 어떤 DB query 기준으로 hydrate 할지

실행 기준으로는 이렇게 고정하는 게 맞다.

- content 정본 = file/Git
- control 정본 = DB
- metadata projection = 호환용 projection
- 파일 트리 초기 hydrate = DB readable-document query 기반
- 문서 open hydrate = content plane + control plane 합성
- legacy metadata owner 누락 같은 문제는 repair-needed 상태로 흡수하고 전체 흐름을 죽이지 않음

---

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-04-22 | repo-wide reconcile/deactivate 는 remote parity fast-forward 검증이 통과한 경우에만 수행하고, remote ahead/diverged/parity inspection 실패 시 기존 DB control-plane read surface 를 유지하도록 계약을 보강 |
| 2026-04-21 | file tree / content metadata / local storage open 이 DB projection 우선 경로로 이동했고, `.sidecar.json` 은 runtime 계약에서 제거됐다는 운영 계약을 반영 |
| 2026-04-20 | legacy sidecar → RDB/jsonb 경계와 로그인 후 readable file-list hydration/query 계약을 별도 실행 문서로 정리 |
