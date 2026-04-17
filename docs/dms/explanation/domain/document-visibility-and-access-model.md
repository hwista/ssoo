# 문서 공개 범위 및 접근 모델

> 최종 업데이트: 2026-04-16

---

## 1. 목적

이 문서는 DMS 문서의 **read visibility**, **write/manage ACL**, **access request**, **검색/트리 노출 규칙**을 하나의 정본 규칙으로 고정합니다.

이 문서는 다음 질문에 답합니다.

- 누가 문서를 볼 수 있는가
- 누가 문서를 수정/관리할 수 있는가
- 검색 결과에는 어디까지 노출되는가
- 파일 트리에는 무엇이 보이는가
- 예외 권한 요청과 승인 흐름은 어떻게 동작하는가

---

## 2. 핵심 원칙

1. **로그인/인증 게이트는 공용**이다. DMS만의 별도 인증 진입권을 두지 않는다.
2. 문서 권한은 **read visibility** 와 **write/manage ACL** 을 분리한다.
3. 문서 작성자(owner) 외에는 기본적으로 `write/manage` 권한이 없다.
4. 폴더는 권한 객체가 아니며, 문서만 권한 객체다.
5. 검색은 **discovery surface**, 파일 트리는 **readable surface** 다.

---

## 3. read visibility

문서의 공개 범위는 owner 가 정한다.

| scope | 의미 | 기본 audience |
|---|---|---|
| `public` | 전체 공개 | 공용 로그인된 SSOO 사용자 전체 |
| `organization` | 조직 공개 | `targetOrgId` 구성원 전체 |
| `self` | 나만 보기 | owner 본인 |

### 3.1 public

- 익명 공개가 아니다.
- SSOO 공용 로그인 사용자를 기본 audience 로 본다.

### 3.2 organization

- 문서 생성 시점의 owner `active organization` 1개를 기본 `targetOrgId` 로 고정한다.
- owner 는 이후 `targetOrgId` 를 변경할 수 있다.
- `targetOrgId` 구성원은 기본적으로 문서 `read` 가 가능하다.

### 3.3 self

- 기본 audience 는 owner-only 다.
- 다만 owner 는 `self` 를 유지한 채 특정 user 에게 예외 `read` grant 를 줄 수 있다.

---

## 4. write/manage ACL

`write/manage` 는 visibility 와 별도다.

### 4.1 기본 규칙

- owner 외에는 기본적으로 `write/manage` 권한이 없다.
- non-owner `write/manage` 는 반드시 explicit grant 로만 열린다.

### 4.2 principal

시스템은 아래 principal 을 지원한다.

- `user`
- `organization`
- `team`
- `group`

단, **요청 기반 승인**은 기본적으로 요청한 `user` 본인에게만 부여한다.  
`organization/team/group` 공유는 별도 공유 설정 surface 에서 owner 가 직접 관리한다.

### 4.3 grant 수명

- grant 는 영구 grant 와 기간제 grant 를 모두 지원한다.
- `expiresAt` 은 선택사항이다.

---

## 5. access request 흐름

### 5.1 read 요청

- 검색 결과에서는 owner 에게 `read` 권한 요청 CTA 를 제공한다.
- 이 요청은 기본적으로 요청한 `user` 본인의 `read` grant 를 생성한다.

### 5.2 write/manage 요청

- `write/manage` 요청은 이미 `read` 가능한 문서 내부에서만 시작할 수 있다.
- 즉, 검색 결과에서 바로 `write/manage` 요청을 보내지 않는다.

---

## 6. 검색과 파일 트리

## 6.1 검색 = discovery surface

비접근권 사용자도 검색/RAG 결과에서 아래를 볼 수 있다.

- 문서 제목
- owner
- summary
- citation 문장

즉, 검색 결과는 문서의 존재와 일부 의미 정보를 노출할 수 있다.

## 6.2 파일 트리 = readable surface

- 파일 트리/사이드바에는 사용자가 직접 `read` 가능한 문서가 하나라도 있는 폴더만 노출한다.
- 폴더 자체에는 별도 권한이 없고, 가시성은 하위 readable 문서 존재 여부로 파생된다.

---

## 7. 관리자 우회권

- `system admin` 만 전체 문서에 대한 최종 override 를 가진다.
- `org admin` 은 자기 조직 문서라고 해도 owner 승인 없이 자동 bypass 하지 않는다.

---

## 8. 우선순위 해석

실행 순서는 아래 기준을 따른다.

1. `system admin` override
2. 문서 visibility scope
3. explicit read/write/manage grant
4. request 기반 승인 결과

단, `write/manage` 는 visibility 로 열리지 않고 grant 로만 열린다.

---

## 9. 예시

### 예시 1. 조직 공개 문서

- visibility = `organization`
- `targetOrgId` = A 조직
- owner = kim

결과:

- A 조직 구성원은 기본 `read` 가능
- A 조직 구성원이라도 `write/manage` 는 불가
- owner 가 별도 grant 해야 `write/manage` 가능

### 예시 2. 나만 보기 문서 + 예외 열람

- visibility = `self`
- owner = kim
- explicit read grant = lee

결과:

- 기본 audience 는 kim only
- lee 는 예외 `read` 가능
- lee 는 `write/manage` 불가

### 예시 3. 비접근권 사용자의 검색 결과

- 사용자는 문서를 직접 열 수 없음
- 검색 키워드와 citation 이 일치

결과:

- 검색 결과에서 제목/owner/summary/citation 확인 가능
- 문서 본문 진입은 차단
- 검색 결과에서 owner 에게 `read` 요청 가능

---

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-04-16 | DMS 문서 visibility, explicit grant, request flow, search/tree 노출, admin override 를 canonical spec 으로 정리 |
