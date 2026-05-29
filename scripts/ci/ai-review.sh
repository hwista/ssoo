#!/usr/bin/env bash
# AI 코드 검증 (Azure OpenAI) - 직전 푸시 diff 검토, 리포트 생성 (게이트 없음)
set -uo pipefail

REPORT="${CI_PROJECT_DIR:-$(pwd)}/ai-review-report.md"
APP_DIR="${APP_DIR:-/opt/ssoo/app}"

# CI 변수 값의 개행/공백 제거 (어디서든 섞일 수 있음 - 방어적 처리)
AZURE_OPENAI_ENDPOINT=$(printf '%s' "${AZURE_OPENAI_ENDPOINT:-}" | tr -d '[:space:]')
AZURE_OPENAI_DEPLOYMENT=$(printf '%s' "${AZURE_OPENAI_DEPLOYMENT:-}" | tr -d '[:space:]')
OPENAI_API_VERSION=$(printf '%s' "${OPENAI_API_VERSION:-}" | tr -d '[:space:]')
AZURE_OPENAI_API_KEY=$(printf '%s' "${AZURE_OPENAI_API_KEY:-}" | tr -d '[:space:]')

echo "[ai-review] ENDPOINT 설정됨: $([ -n "$AZURE_OPENAI_ENDPOINT" ] && echo yes || echo NO)"
echo "[ai-review] DEPLOYMENT 설정됨: $([ -n "$AZURE_OPENAI_DEPLOYMENT" ] && echo yes || echo NO)"
echo "[ai-review] API_KEY 설정됨: $([ -n "$AZURE_OPENAI_API_KEY" ] && echo yes || echo NO)"
echo "[ai-review] API_VERSION 설정됨: $([ -n "$OPENAI_API_VERSION" ] && echo yes || echo NO)"

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

if [ -z "$AZURE_OPENAI_ENDPOINT" ] || [ -z "$AZURE_OPENAI_API_KEY" ]; then
  printf '# AI 코드 검증\n\nAzure 환경변수 없음.\n' > "$REPORT"
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
