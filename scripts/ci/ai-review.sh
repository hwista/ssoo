#!/usr/bin/env bash
# AI 코드 검증 (Azure OpenAI) - 직전 푸시 diff 검토, 리포트 생성 (게이트 없음)
set -uo pipefail

# 리포트는 현재 작업 디렉토리(runner)에 생성 (artifacts 가 여기서 찾음)
REPORT="$(pwd)/ai-review-report.md"
APP_DIR="${APP_DIR:-/opt/ssoo/app}"

# 변수 디버그 (값 노출 안 하고 존재 여부만)
echo "[ai-review] ENDPOINT 설정됨: $([ -n "${AZURE_OPENAI_ENDPOINT:-}" ] && echo yes || echo NO)"
echo "[ai-review] DEPLOYMENT 설정됨: $([ -n "${AZURE_OPENAI_DEPLOYMENT:-}" ] && echo yes || echo NO)"
echo "[ai-review] API_KEY 설정됨: $([ -n "${AZURE_OPENAI_API_KEY:-}" ] && echo yes || echo NO)"
echo "[ai-review] API_VERSION 설정됨: $([ -n "${OPENAI_API_VERSION:-}" ] && echo yes || echo NO)"

# diff 는 APP_DIR 의 git 에서
cd "$APP_DIR"

BEFORE="${CI_COMMIT_BEFORE_SHA:-}"
if [ -z "$BEFORE" ] || [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
  RANGE="HEAD~1...HEAD"
else
  RANGE="${BEFORE}...HEAD"
fi
echo "[ai-review] diff 범위: $RANGE"

DIFF=$(git diff "$RANGE" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.sql' '*.yaml' '*.yml' '*.sh' 2>/dev/null | head -c 50000)

if [ -z "$DIFF" ]; then
  printf '# AI 코드 검증\n\n검토할 코드 변경이 없습니다.\n' > "$REPORT"
  cat "$REPORT"; exit 0
fi

if [ -z "${AZURE_OPENAI_ENDPOINT:-}" ] || [ -z "${AZURE_OPENAI_API_KEY:-}" ]; then
  printf '# AI 코드 검증\n\nAzure 환경변수 없음. CI Variables 의 Protected 설정 확인 필요.\n' > "$REPORT"
  cat "$REPORT"; exit 0
fi

SYS="너는 시니어 코드 리뷰어다. 아래 git diff 를 검토하고 한국어로 간결하게 작성하라: (1) 변경 요약 (2) 위험도와 이유 (3) 발견된 버그/보안/운영 리스크 (4) 배포 전 확인 항목. 마지막 줄에 반드시 RISK=LOW 또는 RISK=MED 또는 RISK=HIGH 형식으로 위험도만 출력하라."

REQ=$(jq -n --arg sys "$SYS" --arg diff "$DIFF" '{messages:[{role:"system",content:$sys},{role:"user",content:$diff}],max_tokens:1500,temperature:0.2}')

URL="${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${OPENAI_API_VERSION}"
echo "[ai-review] 호출 URL(키 제외): ${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions"

RESP=$(curl -s -w "\n[HTTP_CODE]%{http_code}" -X POST "$URL" -H "Content-Type: application/json" -H "api-key: ${AZURE_OPENAI_API_KEY}" -d "$REQ")
HTTP_CODE=$(echo "$RESP" | grep -oE '\[HTTP_CODE\][0-9]+' | grep -oE '[0-9]+$')
BODY=$(echo "$RESP" | sed 's/\[HTTP_CODE\][0-9]*$//')
echo "[ai-review] HTTP 응답코드: ${HTTP_CODE:-none}"

CONTENT=$(echo "$BODY" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo "[ai-review] AI 응답 파싱 실패. 응답 일부:"
  echo "$BODY" | head -c 800
  printf '# AI 코드 검증\n\nAI 응답을 받지 못했습니다. HTTP=%s\n' "${HTTP_CODE:-none}" > "$REPORT"
  cat "$REPORT"; exit 0
fi

{
  echo "# AI 코드 검증 리포트"
  echo ""
  echo "- 범위: \`$RANGE\`"
  echo "- 커밋: ${CI_COMMIT_SHORT_SHA:-?}"
  echo "- 생성: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "$CONTENT"
} > "$REPORT"

cat "$REPORT"

RISK=$(echo "$CONTENT" | grep -oE 'RISK=(LOW|MED|HIGH)' | tail -1 | cut -d= -f2)
echo ""
echo "[ai-review] 판정 위험도: ${RISK:-UNKNOWN} (리포트 전용)"
