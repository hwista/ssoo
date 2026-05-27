#!/usr/bin/env bash
# AI 코드 검증 (Azure OpenAI) - 직전 푸시 diff 검토, 리포트 생성 (게이트 없음)
set -uo pipefail

REPORT="ai-review-report.md"

BEFORE="${CI_COMMIT_BEFORE_SHA:-}"
if [ -z "$BEFORE" ] || [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
  RANGE="HEAD~1...HEAD"
else
  RANGE="${BEFORE}...HEAD"
fi
echo "[ai-review] diff 범위: $RANGE"

DIFF=$(git diff "$RANGE" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.sql' '*.yaml' '*.yml' 2>/dev/null | head -c 50000)

if [ -z "$DIFF" ]; then
  printf '# AI 코드 검증\n\n검토할 코드 변경이 없습니다.\n' > "$REPORT"
  cat "$REPORT"; exit 0
fi

if [ -z "${AZURE_OPENAI_ENDPOINT:-}" ] || [ -z "${AZURE_OPENAI_API_KEY:-}" ]; then
  printf '# AI 코드 검증\n\nAzure 환경변수 없음. CI Variables 확인 필요.\n' > "$REPORT"
  cat "$REPORT"; exit 0
fi

SYS="너는 시니어 코드 리뷰어다. 아래 git diff 를 검토하고 한국어로 간결하게 작성하라: (1) 변경 요약 (2) 위험도와 이유 (3) 발견된 버그/보안/운영 리스크 (4) 배포 전 확인 항목. 마지막 줄에 반드시 RISK=LOW 또는 RISK=MED 또는 RISK=HIGH 형식으로 위험도만 출력하라."

REQ=$(jq -n --arg sys "$SYS" --arg diff "$DIFF" '{messages:[{role:"system",content:$sys},{role:"user",content:$diff}],max_tokens:1500,temperature:0.2}')

URL="${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${OPENAI_API_VERSION}"

RESP=$(curl -s -X POST "$URL" -H "Content-Type: application/json" -H "api-key: ${AZURE_OPENAI_API_KEY}" -d "$REQ")

CONTENT=$(echo "$RESP" | jq -r '.choices[0].message.content // empty')

if [ -z "$CONTENT" ]; then
  echo "[ai-review] AI 응답 파싱 실패:"
  echo "$RESP" | head -c 500
  printf '# AI 코드 검증\n\nAI 응답을 받지 못했습니다.\n' > "$REPORT"
  cat "$REPORT"; exit 0
fi

{
  echo "# AI 코드 검증 리포트"
  echo ""
  echo "- 범위: \`$RANGE\`"
  echo "- 커밋: $CI_COMMIT_SHORT_SHA"
  echo "- 생성: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "$CONTENT"
} > "$REPORT"

cat "$REPORT"

RISK=$(echo "$CONTENT" | grep -oE 'RISK=(LOW|MED|HIGH)' | tail -1 | cut -d= -f2)
echo ""
echo "[ai-review] 판정 위험도: ${RISK:-UNKNOWN} (리포트 전용, 배포 차단 안 함)"
