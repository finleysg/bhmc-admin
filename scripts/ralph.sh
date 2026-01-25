#!/usr/bin/env bash
# ralph.sh - modified from Matt Pocock: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
# Usage: ./ralph.sh <iterations> <prd-file>

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <iterations> <prd-file>"
  exit 1
fi

# jq filter to extract streaming text from assistant messages
stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

# jq filter to extract final result
final_result='select(.type == "result").result // empty'

for ((i=1; i<=$1; i++)); do

  tmpfile=$(mktemp)
  trap "rm -f $tmpfile" EXIT

  docker sandbox run --credentials host claude \
    --verbose \
    --print \
    --output-format stream-json \
    "@$2 @scripts/prompt.md" \
  | grep --line-buffered '^{' \
  | tee "$tmpfile" \
  | jq --unbuffered -rj "$stream_text"

  result=$(jq -r "$final_result" "$tmpfile")

  if grep -q "<promise>COMPLETE</promise>" "$tmpfile"; then
    echo "PRD complete, exiting."
    exit 0
  fi
done
