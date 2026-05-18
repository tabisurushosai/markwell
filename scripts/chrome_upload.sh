#!/usr/bin/env bash
# Upload Markwell release zip to Chrome Web Store (draft by default).
# Usage:
#   bash scripts/chrome_upload.sh          # upload only (draft)
#   bash scripts/chrome_upload.sh publish  # upload + auto-publish
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${HOME}/.config/markwell"
ENV_FILE="${CONFIG_DIR}/cws.env"
MODE="${1:-}"

if [[ "$MODE" != "" && "$MODE" != "publish" ]]; then
  echo "Usage: $0 [publish]" >&2
  echo "  (no args)  upload as draft" >&2
  echo "  publish    upload and auto-publish" >&2
  exit 1
fi

read_secret() {
  local prompt=$1
  local var_name=$2
  local value
  read -rsp "$prompt" value
  echo
  printf -v "$var_name" '%s' "$value"
}

load_or_prompt_credentials() {
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
  fi

  local missing=0
  [[ -z "${CWS_CLIENT_ID:-}" ]] && missing=1
  [[ -z "${CWS_CLIENT_SECRET:-}" ]] && missing=1
  [[ -z "${CWS_REFRESH_TOKEN:-}" ]] && missing=1
  [[ -z "${CWS_ITEM_ID:-}" ]] && missing=1

  if [[ "$missing" -eq 0 ]]; then
    return 0
  fi

  echo "Chrome Web Store credentials not found. Enter values (saved to ${ENV_FILE})."
  mkdir -p "$CONFIG_DIR"
  read_secret "CWS_CLIENT_ID: " CWS_CLIENT_ID
  read_secret "CWS_CLIENT_SECRET: " CWS_CLIENT_SECRET
  read_secret "CWS_REFRESH_TOKEN: " CWS_REFRESH_TOKEN
  read_secret "CWS_ITEM_ID: " CWS_ITEM_ID

  umask 077
  cat >"$ENV_FILE" <<EOF
CWS_CLIENT_ID=${CWS_CLIENT_ID}
CWS_CLIENT_SECRET=${CWS_CLIENT_SECRET}
CWS_REFRESH_TOKEN=${CWS_REFRESH_TOKEN}
CWS_ITEM_ID=${CWS_ITEM_ID}
EOF
  chmod 600 "$ENV_FILE"
  echo "Saved credentials to ${ENV_FILE}"
}

find_release_zip() {
  local zip
  zip="$(ls -t "${ROOT}"/release/markwell-*.zip 2>/dev/null | head -1 || true)"
  if [[ -z "$zip" ]]; then
    echo "No release zip found. Run: bash scripts/build_release.sh" >&2
    exit 1
  fi
  printf '%s' "$zip"
}

load_or_prompt_credentials
ZIP_PATH="$(find_release_zip)"
echo "Uploading ${ZIP_PATH}"

UPLOAD_CMD=(
  npx
  --yes
  chrome-webstore-upload-cli@3
  upload
  --source
  "$ZIP_PATH"
  --extension-id
  "$CWS_ITEM_ID"
  --client-id
  "$CWS_CLIENT_ID"
  --client-secret
  "$CWS_CLIENT_SECRET"
  --refresh-token
  "$CWS_REFRESH_TOKEN"
)

if [[ "$MODE" == "publish" ]]; then
  echo "Mode: upload + auto-publish"
  UPLOAD_CMD+=(--auto-publish)
else
  echo "Mode: upload as draft (pass 'publish' to auto-publish)"
fi

"${UPLOAD_CMD[@]}"

echo "Done."
