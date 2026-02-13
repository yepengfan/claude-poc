#!/bin/bash
# Pre-push hook: runs Claude Code review on branch diff and blocks push on critical issues.
# Requires: claude CLI, jq

set -euo pipefail

# Skip review when pushing from main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  exit 0
fi

# Allow skipping review with environment variable
if [ "${SKIP_REVIEW:-}" = "1" ]; then
  echo "Skipping pre-push review (SKIP_REVIEW=1)"
  exit 0
fi

# Check dependencies
if ! command -v claude &>/dev/null; then
  echo "Warning: claude CLI not found, skipping review."
  exit 0
fi
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required for pre-push review. Install with: brew install jq"
  exit 1
fi

# Fetch latest main so the diff is accurate
if ! git fetch origin main --quiet 2>/dev/null; then
  echo "Warning: Could not fetch origin/main. Reviewing against local ref (may be stale)."
fi

# Get diff against latest remote main
DIFF=$(git diff origin/main...HEAD)
if [ -z "$DIFF" ]; then
  echo "No diff against origin/main. Skipping review."
  exit 0
fi

echo "Running Claude Code review on branch diff (this may take 10-30s)..."

JSON_SCHEMA=$(cat <<'SCHEMA'
{"type":"object","properties":{"has_critical_issues":{"type":"boolean"},"summary":{"type":"string"},"findings":{"type":"array","items":{"type":"object","properties":{"severity":{"type":"string","enum":["critical","medium","minor"]},"file":{"type":"string"},"description":{"type":"string"},"suggestion":{"type":"string"}},"required":["severity","file","description"]}}},"required":["has_critical_issues","summary","findings"]}
SCHEMA
)

PROMPT=$(cat <<'PROMPT'
Review this git diff for critical issues only. Focus on:
- Bugs and logic errors
- Security vulnerabilities
- Data loss risks
- Broken API contracts

Do NOT flag style, naming, or minor improvements. Only set has_critical_issues to true if there are genuine bugs or security problems that must be fixed before merging.
PROMPT
)

# Unset CLAUDECODE so the hook can invoke claude even from within a Claude session.
# --max-turns 2 is required because --json-schema uses an internal tool call round-trip.
unset CLAUDECODE

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

# Run claude in background with a 120s timeout to avoid blocking pushes indefinitely.
git diff origin/main...HEAD | claude -p "$PROMPT" \
  --output-format json \
  --max-turns 2 \
  --json-schema "$JSON_SCHEMA" \
  >"$TMPFILE" 2>/dev/null &
CLAUDE_PID=$!

SECONDS=0
while kill -0 "$CLAUDE_PID" 2>/dev/null; do
  if [ "$SECONDS" -ge 120 ]; then
    kill "$CLAUDE_PID" 2>/dev/null
    wait "$CLAUDE_PID" 2>/dev/null
    echo "Warning: Claude review timed out after 120s. Allowing push."
    exit 0
  fi
  sleep 1
done

wait "$CLAUDE_PID" || {
  echo "Warning: Claude review failed. Allowing push."
  exit 0
}

REVIEW=$(cat "$TMPFILE")
if [ -z "$REVIEW" ]; then
  echo "Warning: Claude returned empty output. Allowing push."
  exit 0
fi

# Parse structured output from Claude's JSON response
HAS_ISSUES=$(echo "$REVIEW" | jq -r '.structured_output.has_critical_issues // false')
SUMMARY=$(echo "$REVIEW" | jq -r '.structured_output.summary // empty')

if [ "$HAS_ISSUES" = "true" ]; then
  CRITICAL_COUNT=$(echo "$REVIEW" | jq '[.structured_output.findings[] | select(.severity == "critical")] | length')

  if [ "$CRITICAL_COUNT" -eq 0 ]; then
    echo "Warning: Review flagged critical issues but no critical findings returned. Allowing push."
    echo "Summary: $SUMMARY"
    exit 0
  fi

  echo ""
  echo "=========================================="
  echo "  Push blocked: critical issues found"
  echo "=========================================="
  echo ""
  [ -n "$SUMMARY" ] && echo "$SUMMARY" && echo ""
  echo "Critical findings:"
  echo "$REVIEW" | jq -r '.structured_output.findings[] | select(.severity == "critical") | "  [\(.file)] \(.description)\n    Suggestion: \(.suggestion // "N/A")\n"'
  echo ""
  echo "Fix the issues above and try again, or skip with: SKIP_REVIEW=1 git push"
  exit 1
fi

echo "Review passed: ${SUMMARY:-No issues found.}"
exit 0
