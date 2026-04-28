# DMS 운영 / 검증 런북

> 최종 업데이트: 2026-04-28
> 대상: 로컬 개발 + 단일 노드 운영 환경에서 DMS 핵심 흐름이 정상 동작하는지 확인하기 위한 종단 검증 절차.

본 문서는 deployment.md(설치)와 별개로, **"기능이 살아 있는지 어떻게 확인하는가"** 를 다룹니다. Phase A-1(운영 검증 시나리오)의 산출물입니다.

---

## 1. 전제 상태

스택이 모두 healthy 상태여야 합니다.

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep ssoo
```

기대 출력 (모두 `(healthy)`):

```
ssoo-postgres   Up ... (healthy)
ssoo-server     Up ... (healthy)
ssoo-dms        Up ... (healthy)
ssoo-cms        Up ... (healthy)
ssoo-pms        Up ... (healthy)
ssoo-admin      Up ... (healthy)
```

서버의 글로벌 prefix는 `/api`이며, DMS 정본 저장소는 컨테이너 내부 `.runtime/dms/documents/` 경로(호스트 bind mount)입니다.

---

## 2. 인증 토큰 확보

기본 시드 계정:

| 계정      | 비밀번호    | 역할     |
|-----------|-------------|----------|
| `admin`   | `admin123!` | admin    |
| `pm.kim`  | `user123!`  | manager  |
| `dev.lee` | `user123!`  | user     |
| `viewer.han` | `user123!` | viewer |

```bash
TOKEN=$(curl -s http://localhost:4000/api/auth/login \
  -X POST -H 'Content-Type: application/json' \
  -d '{"loginId":"admin","password":"admin123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
```

---

## 3. 시나리오 A — 파일 트리가 보이는가

DMS 정본(.runtime/dms/documents) → DB(`dms.dm_document_m`) → API(`/api/dms/files`) → ACL 필터까지 살아 있는지 확인합니다.

### 3.1 디스크 / DB 정합

```bash
# 디스크 markdown 개수
find .runtime/dms/documents -type f -name '*.md' | wc -l

# DB 활성 문서 개수 (둘이 일치해야 함)
docker exec ssoo-postgres psql -U ssoo -d ssoo_dev -c \
  "SELECT count(*) FROM dms.dm_document_m WHERE is_active AND document_status_code='active';"
```

### 3.2 API 응답

```bash
curl -s http://localhost:4000/api/dms/files \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
def n(t): return sum(n(c['children']) if c.get('children') else (1 if c['type']=='file' else 0) for c in t)
d=json.load(sys.stdin); print('files:', n(d['data']))"
```

`success: true` + `files == DB count`(또는 ACL로 필터된 그 이하) 이어야 합니다.

### 3.3 트러블슈팅

| 증상                              | 원인                                                | 조치 |
|-----------------------------------|-----------------------------------------------------|------|
| API는 200인데 `data: []`          | DB 비어 있음 (시드/hydration 미실행)                | `pnpm --filter @ssoo/database run db:seed` 후 서버 재기동, 또는 admin 으로 1회 호출하여 `ensureRepoControlPlaneSynced` 트리거 |
| `data` 일부만 표시                | ACL 필터 동작(visibility=self/private 등)           | DB `metadata_jsonb->'visibility'` 확인 — 의도한 가시성인지 검증 |
| `403 DMS feature not enabled`     | 사용자에게 `canReadDocuments` 권한 미부여           | `common.cm_role_permission_r` / `cm_user_permission_exception_r` 점검 |
| `503` 또는 control-plane 동기화 보류 | 원격 git remote가 ahead/diverged 상태               | 서버 로그 `문서 repo -> control-plane 동기화 보류` 확인, 필요 시 원격 변경을 수동 pull/리졸브 |

---

## 4. 시나리오 B — 단일 문서 read/write

```bash
# 읽기
curl -s -G http://localhost:4000/api/dms/file \
  --data-urlencode 'path=common/build.md' \
  -H "Authorization: Bearer $TOKEN" | head -c 200

# 쓰기 (충돌 감지 위해 lastKnownHash 필요)
curl -s -X POST http://localhost:4000/api/dms/file/save \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"path":"drafts/runbook-test.md","content":"# runbook smoke","createIfMissing":true}'
```

기대: 두 호출 모두 `success: true`. 저장 후 `.runtime/dms/documents/drafts/runbook-test.md` 파일과 DB 행이 함께 생겨야 합니다.

---

## 5. 시나리오 C — WebSocket 실시간 알림

DMS frontend(`/dms`)를 같은 문서로 두 탭에서 열고, 한 쪽에서 저장하면 다른 쪽에 `다른 사용자가 이 문서를 수정했습니다` 토스트가 떠야 합니다.

수동 검증 절차:

1. 같은 계정 또는 권한 있는 다른 계정 두 개로 두 브라우저 탭에서 `/dms` 접속.
2. 동일 문서(`common/build.md` 등) 열기.
3. 탭 A에서 1글자 추가 후 저장(Ctrl+S).
4. 탭 B에서 1~2초 내에 토스트 알림 확인.

서버 측 로그에서 `[DmsEventsGateway] WebSocket 연결 수립` 이벤트가 두 번씩 보여야 합니다.

```bash
docker logs --tail 200 ssoo-server 2>&1 | grep -i 'DmsEvents\|WebSocket'
```

### 5.1 명령행 스모크 (UI 없이 검증)

`socket.io/?EIO=4&transport=polling` 가 200 을 돌려주면 게이트웨이가 살아 있습니다.

```bash
curl -s -o /dev/null -w "ws_endpoint=%{http_code}\n" \
  "http://localhost:4000/socket.io/?EIO=4&transport=polling"
```

인증된 연결 + 문서/트리 룸 join 까지 한 번에 확인하려면(socket.io-client 필요):

```js
// /tmp/ws-smoke.mjs
import { io } from 'socket.io-client';
const sock = io('http://localhost:4000/dms', {
  transports: ['websocket'],
  auth: { token: process.argv[2] },
  reconnection: false,
});
sock.on('connect', () => {
  sock.emit('subscribe:document', { path: 'common/build.md' }, (a) => {
    console.log('document', a);
    sock.emit('subscribe:tree', {}, (b) => { console.log('tree', b); sock.close(); });
  });
});
sock.on('connect_error', (e) => { console.log('ERR', e.message); process.exit(1); });
```

기대 출력: `document { success: true }` / `tree { success: true }`.

---

## 6. 시나리오 D — Git 동기화 / 정본 일치

```bash
cd .runtime/dms/documents
git --no-pager status
git --no-pager log --oneline -3
git --no-pager remote -v
```

- 워킹 트리는 항상 clean (DMS save 후 자동 commit).
- `origin` 은 `LSWIKI_DOC` 원격을 가리켜야 함.
- `inspectRemoteParity` 가 ahead/diverged 라면 control-plane sync 가 보류됨 → 운영자가 명시적으로 정리 필요.

---

## 7. 빠른 점검 한 줄 명령

```bash
# 컨테이너 healthy + DB 카운트 + API 카운트 한번에
docker ps --format '{{.Names}}\t{{.Status}}' | grep ssoo \
  && docker exec ssoo-postgres psql -U ssoo -d ssoo_dev -tc \
       "SELECT 'db_active=' || count(*) FROM dms.dm_document_m WHERE is_active AND document_status_code='active';" \
  && curl -s -o /dev/null -w "files_api=%{http_code}\n" \
       http://localhost:4000/api/dms/files -H "Authorization: Bearer $TOKEN"
```

---

## 8. 알려진 제약 / 주의사항

- 현재 server에 자동화 테스트가 없음(Phase D에서 추가 예정). 본 런북이 임시 회귀 검증 수단입니다.
- `_templates/personal/*` 는 `visibility=self` 이므로 작성자 외 계정에선 트리에 노출되지 않을 수 있습니다.
- WebSocket 게이트웨이는 `/dms` 네임스페이스이며 JWT handshake 가 필요합니다(`useDmsSocket.ts` 참조).
- 정본 git 저장소가 빈 상태로 부팅되면 hydration이 0건을 만들 수 있으므로, 최초 1회는 시드 문서 또는 원격 pull로 채운 뒤 서버 재기동을 권장합니다.

---

## Changelog

- 2026-04-28: 초안 작성 (Phase A-1 / A-3 / A-4 종단 검증 절차)
