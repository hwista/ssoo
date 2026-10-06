#!/usr/bin/env bash
# AI 코드 검증 - 운영 배포 기준 비교
# 참고용 job 이다. AI/네트워크/설정 문제는 리포트에 남기고 exit 0 으로 끝내 pipeline 을 막지 않는다.
set -uo pipefail

REPORT="${CI_PROJECT_DIR:-$(pwd)}/ai-review-report.md"
APP_DIR="${APP_DIR:-/opt/ssoo/app}"
DIFF_BUDGET_BYTES="${AI_REVIEW_DIFF_BUDGET_BYTES:-50000}"

# 변수 trim
AZURE_OPENAI_ENDPOINT=$(printf '%s' "${AZURE_OPENAI_ENDPOINT:-}" | tr -d '[:space:]')
AZURE_OPENAI_DEPLOYMENT=$(printf '%s' "${AZURE_OPENAI_DEPLOYMENT:-}" | tr -d '[:space:]')
OPENAI_API_VERSION=$(printf '%s' "${OPENAI_API_VERSION:-}" | tr -d '[:space:]')
AZURE_OPENAI_API_KEY=$(printf '%s' "${AZURE_OPENAI_API_KEY:-}" | tr -d '[:space:]')
GITLAB_TOKEN=$(printf '%s' "${GITLAB_API_TOKEN:-}" | tr -d '[:space:]')

echo "[ai-review] ENDPOINT 설정됨: $([ -n "$AZURE_OPENAI_ENDPOINT" ] && echo yes || echo NO)"
echo "[ai-review] DEPLOYMENT 설정됨: $([ -n "$AZURE_OPENAI_DEPLOYMENT" ] && echo yes || echo NO)"
echo "[ai-review] API_KEY 설정됨: $([ -n "$AZURE_OPENAI_API_KEY" ] && echo yes || echo NO)"
echo "[ai-review] GITLAB_TOKEN 설정됨: $([ -n "$GITLAB_TOKEN" ] && echo yes || echo NO)"

cd "$APP_DIR" || exit 1

# GitLab API 정보
PROJECT_ID="${CI_PROJECT_ID:-664}"
GITLAB_URL="${CI_SERVER_URL:-http://10.125.31.72:8010}"

# 마지막 성공 배포 SHA 조회 (development 환경)
# GitLab 10.4 는 deployments API 의 order_by/sort/status/environment 를 무시하고 id 오름차순으로 돌려주므로,
# 모든 page 를 읽어 성공한 development 배포 중 id 가 가장 큰 항목을 직접 고른다.
LAST_DEPLOYED_SHA=""
if [ -n "$GITLAB_TOKEN" ]; then
  echo "[ai-review] 마지막 배포 조회 중..."
  deployments="[]"
  page=1
  while [ "$page" -le 50 ]; do
    body=$(curl -s -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
      "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/deployments?per_page=100&page=${page}" 2>/dev/null)
    count=$(printf '%s' "$body" | jq 'if type == "array" then length else 0 end' 2>/dev/null)
    if [ -z "$count" ] || [ "$count" -eq 0 ]; then
      break
    fi
    deployments=$(jq -cn --argjson seen "$deployments" --argjson page "$body" '$seen + $page')
    if [ "$count" -lt 100 ]; then
      break
    fi
    page=$((page + 1))
  done
  LAST_DEPLOYED_SHA=$(printf '%s' "$deployments" | jq -r '
    [.[] | select(.environment.name == "development" and .deployable.status == "success")]
    | max_by(.id) | .sha // empty' 2>/dev/null)
fi

echo "[ai-review] 마지막 배포 SHA: ${LAST_DEPLOYED_SHA:-(없음)}"
echo "[ai-review] CI_COMMIT_SHA: ${CI_COMMIT_SHA:-(none)}"
echo "[ai-review] CI_COMMIT_BEFORE_SHA: ${CI_COMMIT_BEFORE_SHA:-(none)}"

# 범위 결정 우선순위
RANGE=""
RANGE_DESC=""
if [ -n "$LAST_DEPLOYED_SHA" ]; then
  # 운영 배포 기준 (가장 의미 있음)
  if git cat-file -e "${LAST_DEPLOYED_SHA}^{commit}" 2>/dev/null; then
    RANGE="${LAST_DEPLOYED_SHA}...HEAD"
    RANGE_DESC="운영 배포 기준 (${LAST_DEPLOYED_SHA:0:8} → HEAD)"
  else
    echo "[ai-review] 배포 SHA 가 로컬에 없음, fallback 사용"
  fi
fi

if [ -z "$RANGE" ]; then
  if [ -n "${CI_COMMIT_BEFORE_SHA:-}" ] && [ "$CI_COMMIT_BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
    RANGE="${CI_COMMIT_BEFORE_SHA}...HEAD"
    RANGE_DESC="이전 push 기준 (${CI_COMMIT_BEFORE_SHA:0:8} → HEAD)"
  else
    RANGE="HEAD~5...HEAD"
    RANGE_DESC="최근 5커밋 (fallback)"
  fi
fi

echo "[ai-review] 비교 범위: $RANGE"
echo "[ai-review] 의미: $RANGE_DESC"
echo "[ai-review] 검토 대상 커밋:"
git log --oneline "$RANGE" 2>&1 | head -10

# lockfile 은 의존성 해석 결과라 리뷰 가치보다 용량이 커서 제외한다.
REVIEW_PATHS=('*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.sql' '*.prisma' '*.yaml' '*.yml' '*.sh' '*Dockerfile'
  ':(exclude)pnpm-lock.yaml')

# 운영 영향이 큰 경로부터 담는다: server/DB → 배포·CI → 앱·공유 package → 그 밖의 script → 개발 도구.
review_priority() {
  case "$1" in
    apps/server/*|packages/database/*|scripts/db-init-entrypoint.sh) echo 1 ;;
    .gitlab-ci.yml|compose*.yaml|docker/*|*Dockerfile|scripts/ci/*) echo 2 ;;
    apps/*|packages/*) echo 3 ;;
    scripts/*) echo 4 ;;
    *) echo 5 ;;
  esac
}

mapfile -t CHANGED_FILES < <(git diff --name-only "$RANGE" -- "${REVIEW_PATHS[@]}" 2>/dev/null \
  | while IFS= read -r file; do printf '%s\t%s\n' "$(review_priority "$file")" "$file"; done \
  | sort -t $'\t' -k1,1n -k2,2 | cut -f2-)
TOTAL_COUNT=${#CHANGED_FILES[@]}

if [ "$TOTAL_COUNT" -eq 0 ]; then
  printf '# AI 코드 검증\n\n검토할 코드 변경이 없습니다.\n\n- 범위: %s\n- 의미: %s\n' "$RANGE" "$RANGE_DESC" > "$REPORT"
  cat "$REPORT"; exit 0
fi

# 파일 diff 를 중간에서 자르지 않고, 한도 안에 온전히 들어가는 파일만 우선순위대로 담는다.
DIFF_FILE=$(mktemp)
trap 'rm -f "$DIFF_FILE"' EXIT
DIFF_BYTES=0
REVIEWED_COUNT=0
OMITTED_FILES=()
for file in "${CHANGED_FILES[@]}"; do
  file_diff=$(git diff "$RANGE" -- "$file" 2>/dev/null)
  file_bytes=$(printf '%s\n' "$file_diff" | wc -c)
  if [ $((DIFF_BYTES + file_bytes)) -le "$DIFF_BUDGET_BYTES" ]; then
    printf '%s\n' "$file_diff" >> "$DIFF_FILE"
    DIFF_BYTES=$((DIFF_BYTES + file_bytes))
    REVIEWED_COUNT=$((REVIEWED_COUNT + 1))
  else
    OMITTED_FILES+=("$file")
  fi
done
OMITTED_COUNT=${#OMITTED_FILES[@]}
COVERAGE="${REVIEWED_COUNT}/${TOTAL_COUNT}"
echo "[ai-review] 검토 파일: $COVERAGE (diff ${DIFF_BYTES} bytes, 한도 ${DIFF_BUDGET_BYTES} bytes)"

write_omitted_section() {
  if [ "$OMITTED_COUNT" -gt 0 ]; then
    echo ""
    echo "## 검토하지 못한 파일 (${OMITTED_COUNT}개, diff 한도 초과)"
    echo ""
    printf -- '- `%s`\n' "${OMITTED_FILES[@]:0:50}"
    if [ "$OMITTED_COUNT" -gt 50 ]; then
      echo "- 외 $((OMITTED_COUNT - 50))개"
    fi
  fi
}

if [ "$REVIEWED_COUNT" -eq 0 ]; then
  {
    printf '# AI 코드 검증\n\n모든 변경 파일이 diff 한도(%s bytes)를 넘어 AI 검토를 실행하지 않았습니다.\n\n' "$DIFF_BUDGET_BYTES"
    printf -- '- 범위: %s\n- 의미: %s\n- 검토 파일: %s\n' "$RANGE" "$RANGE_DESC" "$COVERAGE"
    write_omitted_section
  } > "$REPORT"
  cat "$REPORT"
  echo ""
  echo "[ai-review] 판정 위험도: UNKNOWN (부분 검토 $COVERAGE)"
  exit 0
fi

if [ -z "$AZURE_OPENAI_ENDPOINT" ] || [ -z "$AZURE_OPENAI_API_KEY" ]; then
  printf '# AI 코드 검증\n\nAzure 환경변수 없음.\n' > "$REPORT"
  cat "$REPORT"; exit 0
fi

SYS="너는 시니어 코드 리뷰어다. 아래 git diff 를 검토하고 한국어로 간결하게: (1) 변경 요약 (2) 위험도 LOW/MED/HIGH 와 이유 (3) 발견된 버그/보안/운영 리스크 (4) 배포 전 확인 항목. 마지막에 RISK=LOW/MED/HIGH 형식으로 위험도만 출력."
if [ "$OMITTED_COUNT" -gt 0 ]; then
  SYS="$SYS 이 diff 는 전체 변경 ${TOTAL_COUNT}개 파일 중 ${REVIEWED_COUNT}개만 담고 있다. 담기지 않은 파일은 안전하다고 단정하지 말고, 요약에 부분 검토임을 밝혀라."
fi

REQ=$(jq -n --arg sys "$SYS" --arg diff "$(cat "$DIFF_FILE")" '{messages:[{role:"system",content:$sys},{role:"user",content:$diff}],max_tokens:1500,temperature:0.2}')

URL="${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${OPENAI_API_VERSION}"

RESP=$(curl -s -w "\n[HTTP_CODE]%{http_code}" -X POST "$URL" -H "Content-Type: application/json" -H "api-key: ${AZURE_OPENAI_API_KEY}" -d "$REQ")
HTTP_CODE=$(echo "$RESP" | grep -oE '\[HTTP_CODE\][0-9]+' | grep -oE '[0-9]+$')
BODY=$(echo "$RESP" | sed 's/\[HTTP_CODE\][0-9]*$//')
echo "[ai-review] HTTP 응답코드: ${HTTP_CODE:-none}"

CONTENT=$(echo "$BODY" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo "[ai-review] AI 응답 파싱 실패"
  echo "$BODY" | head -c 500
  printf '# AI 코드 검증\n\nAI 응답 없음. HTTP=%s\n' "${HTTP_CODE:-none}" > "$REPORT"
  cat "$REPORT"; exit 0
fi

MODEL_RISK=$(echo "$CONTENT" | grep -oE 'RISK=(LOW|MED|HIGH)' | tail -1 | cut -d= -f2)
if [ "$OMITTED_COUNT" -gt 0 ]; then
  RISK_VERDICT="UNKNOWN (부분 검토 $COVERAGE, 모델 판정 ${MODEL_RISK:-UNKNOWN})"
else
  RISK_VERDICT="${MODEL_RISK:-UNKNOWN}"
fi

{
  echo "# AI 코드 검증 리포트"
  echo ""
  echo "- 범위: \`$RANGE\`"
  echo "- 의미: $RANGE_DESC"
  echo "- 커밋: ${CI_COMMIT_SHORT_SHA:-${CI_COMMIT_SHA:0:8}}"
  echo "- 검토 파일: $COVERAGE"
  echo "- 판정 위험도: $RISK_VERDICT"
  echo "- 생성: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "$CONTENT"
  write_omitted_section
} > "$REPORT"

cat "$REPORT"

echo ""
echo "[ai-review] 판정 위험도: $RISK_VERDICT"
exit 0
