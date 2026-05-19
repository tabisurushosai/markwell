#!/usr/bin/env bash
# Markwell release gate — any failure stops the release (exit 1).
# Stripe Payment Link placeholder and manual QA acks are WARN/SKIP (markwell-101).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
SKIP=0
WARN=0
MANUAL_ACK_FILE="${HOME}/.config/markwell/release-gate-manual.env"
TSPRUNE_IGNORE="${ROOT}/.tspruneignore"

pass() {
  PASS=$((PASS + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo "  FAIL: $1" >&2
}

skip() {
  SKIP=$((SKIP + 1))
  echo "  SKIP: $1"
}

warn() {
  WARN=$((WARN + 1))
  echo "  WARN: $1"
}

section() {
  echo ""
  echo "== $1 =="
}

# Exclude // comment lines from Japanese hardcode grep.
i18n_hardcode_hits() {
  local dir="$1"
  grep -rEn '[ぁ-んァ-ン一-龥]' "$dir" --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -vE '^[^:]*:[0-9]+:\s*//' \
    | grep -vE '^\s*//' \
    || true
}

section "npm run lint"
if npm run lint; then
  pass "lint"
else
  fail "lint"
fi

section "npm run typecheck"
if npm run typecheck; then
  pass "typecheck"
else
  fail "typecheck"
fi

section "npm run test:run"
if npm run test:run; then
  pass "test:run"
else
  fail "test:run"
fi

section "i18n key parity (ja vs en)"
LOCALE_DIFF="$(diff <(jq -r 'keys[]' public/_locales/ja/messages.json | sort) \
  <(jq -r 'keys[]' public/_locales/en/messages.json | sort) || true)"
if [[ -z "$LOCALE_DIFF" ]]; then
  pass "locale keys match"
else
  fail "locale keys differ"
  echo "$LOCALE_DIFF" >&2
fi

section "legal & license docs"
for f in PRIVACY.md PRIVACY.ja.md TERMS.md TERMS.ja.md LICENSES.md LICENSE; do
  if [[ -f "$f" ]]; then
    pass "$f exists"
  else
    fail "$f missing"
  fi
done

section "store assets"
for size in 16 32 48 128; do
  p="public/icons/icon-${size}.png"
  if [[ -f "$p" ]]; then
    pass "$p"
  else
    fail "$p missing"
  fi
done
for n in 1 2 3; do
  p="public/store/screenshot-${n}.png"
  if [[ -f "$p" ]]; then
    pass "$p"
  else
    fail "$p missing"
  fi
done
if [[ -f public/store/promo-small-440x280.png ]]; then
  pass "promo-small-440x280.png"
else
  fail "promo-small-440x280.png missing"
fi

section "manifest version & host_permissions"
PKG_VER="$(node -p "require('./package.json').version")"
MAN_VER="$(node -p "require('./manifest.json').version")"
if [[ "$PKG_VER" == "$MAN_VER" ]]; then
  pass "version $PKG_VER matches package.json"
else
  fail "manifest version $MAN_VER != package.json $PKG_VER"
fi

HOST_PERMS="$(node -p "JSON.stringify(require('./manifest.json').host_permissions||[])")"
if [[ "$HOST_PERMS" == "[]" ]]; then
  pass "host_permissions minimal (none)"
else
  fail "host_permissions must be empty or minimal; got $HOST_PERMS"
fi

section "placeholders in src/ (except Stripe Payment Link)"
PLACEHOLDER_HITS="$(grep -rn 'REPLACE_ME\|TODO_RELEASE\|YOUR_KEY\|FIXME_RELEASE' src/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v 'src/shared/license/config.ts:.*DEFAULT_STRIPE_PAYMENT_LINK' \
  || true)"
if [[ -z "$PLACEHOLDER_HITS" ]]; then
  pass "no release placeholders in src/"
else
  fail "release placeholders found in src/"
  echo "$PLACEHOLDER_HITS" >&2
fi

section "git working tree clean"
if [[ -z "$(git status --porcelain)" ]]; then
  pass "git status clean"
else
  fail "git status not clean (commit or stash pending changes)"
  git status --short >&2
fi

section "i18n hardcode (onboarding/options/popup/side-panel/content)"
I18N_TARGETS=(src/onboarding/ src/options/ src/popup/ src/side-panel/ src/content/)
I18N_HARDCODE=""
for target in "${I18N_TARGETS[@]}"; do
  hits="$(i18n_hardcode_hits "$target")"
  if [[ -n "$hits" ]]; then
    I18N_HARDCODE+="${hits}"$'\n'
  fi
done
if [[ -z "$I18N_HARDCODE" ]]; then
  pass "no hardcoded Japanese in UI source trees"
else
  fail "i18n hardcode remains"
  echo "$I18N_HARDCODE" >&2
fi

section "toast unified in options (no class=\"status\")"
STATUS_HITS="$(grep -rn 'class="status"' src/options/ || true)"
if [[ -z "$STATUS_HITS" ]]; then
  pass 'no class="status" in src/options/'
else
  fail 'class="status" still used in src/options/'
  echo "$STATUS_HITS" >&2
fi

section "dead code (ts-prune)"
if ! command -v npx >/dev/null 2>&1; then
  fail "npx not available for ts-prune"
else
  TSPRUNE_RAW="$(npx ts-prune 2>/dev/null || true)"
  TSPRUNE_FILTERED="$TSPRUNE_RAW"
  if [[ -f "$TSPRUNE_IGNORE" ]]; then
    while IFS= read -r pattern; do
      [[ -z "$pattern" || "$pattern" =~ ^# ]] && continue
      TSPRUNE_FILTERED="$(printf '%s\n' "$TSPRUNE_FILTERED" | grep -Fv "$pattern" || true)"
    done <"$TSPRUNE_IGNORE"
  fi
  TSPRUNE_FILTERED="$(printf '%s\n' "$TSPRUNE_FILTERED" | sed '/^$/d')"
  if [[ -z "$TSPRUNE_FILTERED" ]]; then
    pass "ts-prune (after .tspruneignore)"
  else
    fail "ts-prune reported unused exports not in .tspruneignore"
    echo "$TSPRUNE_FILTERED" >&2
  fi
fi

section "Stripe Payment Link (warn only)"
CONFIG_TS="src/shared/license/config.ts"
if grep -q 'REPLACE_ME' "$CONFIG_TS"; then
  warn "Stripe Payment Link is still REPLACE_ME — set a real URL before store release"
  echo "  ⚠️  Stripe Payment Link が REPLACE_ME のままです。実 URL を入れてから再実行してください" >&2
  skip "DEFAULT_STRIPE_PAYMENT_LINK placeholder (owner action)"
else
  pass "Stripe payment link is not a placeholder"
fi

if grep -qE 'https://markwell-api\.vercel\.app/api/verify-license' "$CONFIG_TS"; then
  pass "LICENSE_VERIFY_URL points to markwell-api"
else
  fail "LICENSE_VERIFY_URL not configured for production API"
fi

section "POST /api/verify-license (production)"
VERIFY_BODY='{"license_key":"invalid","device_id":"test"}'
HTTP_CODE="$(curl -sS -o /tmp/markwell-verify-response.json -w '%{http_code}' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d "$VERIFY_BODY" \
  https://markwell-api.vercel.app/api/verify-license || echo "000")"

if [[ "$HTTP_CODE" == "200" ]]; then
  if node -e "
    const j=require('/tmp/markwell-verify-response.json');
    if (j.valid===false) process.exit(0);
    process.exit(1);
  "; then
    pass "verify-license returns 200 + valid:false"
  else
    fail "verify-license 200 but body.valid is not false"
    cat /tmp/markwell-verify-response.json >&2 || true
  fi
else
  fail "verify-license HTTP $HTTP_CODE (expected 200)"
  cat /tmp/markwell-verify-response.json >&2 2>/dev/null || true
fi

section "manual QA acknowledgements (skip until owner signs off)"
REQUIRED_MANUAL_KEYS=(
  MANUAL_TRIAL_AI_VERIFIED
  MANUAL_FREE_TIER_AI_LOCKED
  MANUAL_ALT_H_RELOAD_SPA
  MANUAL_STRIPE_TEST_PURCHASE
)

if [[ ! -f "$MANUAL_ACK_FILE" ]]; then
  warn "manual ack file missing: $MANUAL_ACK_FILE"
  skip "manual QA acks (create $MANUAL_ACK_FILE after browser QA)"
else
  # shellcheck disable=SC1090
  source "$MANUAL_ACK_FILE"
  for k in "${REQUIRED_MANUAL_KEYS[@]}"; do
    if [[ "${!k:-}" == "1" ]]; then
      pass "$k"
    else
      warn "$k not set to 1 in $MANUAL_ACK_FILE"
      skip "$k (owner action)"
    fi
  done
fi

section "summary"
echo "PASS: $PASS  FAIL: $FAIL  SKIP: $SKIP  WARN: $WARN"
if [[ "$FAIL" -gt 0 ]]; then
  echo "Release gate: BLOCKED" >&2
  exit 1
fi
echo "Release gate: ALL CHECKS PASSED (skipped: $SKIP, warnings: $WARN)"
exit 0
