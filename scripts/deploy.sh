#!/usr/bin/env bash
#
# Deploy the built site (dist/) to Bluehost via rsync over SSH.
#
# Usage:
#   npm run deploy            # build + dry-run + confirm + sync
#   npm run deploy -- --yes   # skip the dry-run confirmation
#
# CI on main is the normal route (.github/workflows/deploy.yml); this is the
# manual escape hatch. Connection details come from ~/.ssh/config (Host
# "bluehost").
#
set -euo pipefail

REMOTE="bluehost"        # ~/.ssh/config alias
REMOTE_PATH="durbin.cc/" # document root of the durbin.cc addon domain
LOCAL_PATH="dist/"       # Astro build output

# The destination lives OUTSIDE public_html deliberately, so the sibling
# `cassa` repo's root-level `rsync --delete public_html/` can never reach these
# files and this deploy can never reach cassa's. Keep it that way.
#
# Server-owned files that must survive --delete even though the build never
# emits them.
EXCLUDES=(
  ".well-known" # ACME / AutoSSL validation
  "cgi-bin"     # cPanel default
  ".htaccess"   # server config, hand-edited
  ".user.ini"   # per-account PHP config
  ".ftpquota"   # cPanel FTP quota file
)

cd "$(dirname "$0")/.."

# 1. Validate content, then build
echo "▶ Validating content…"
npm run check:content

echo "▶ Building site…"
npm run build

# 2. Assemble rsync args
RSYNC_ARGS=(-avz --delete --human-readable)
for e in "${EXCLUDES[@]}"; do
  RSYNC_ARGS+=(--exclude="$e")
done

# 3. Dry-run first unless --yes passed
if [[ "${1:-}" != "--yes" ]]; then
  echo
  echo "▶ DRY RUN — no files changed yet. Review what would happen:"
  rsync "${RSYNC_ARGS[@]}" --dry-run "$LOCAL_PATH" "$REMOTE:$REMOTE_PATH"
  echo
  read -r -p "Proceed with the real sync? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

# 4. Real sync
echo
echo "▶ Deploying to $REMOTE:$REMOTE_PATH …"
rsync "${RSYNC_ARGS[@]}" "$LOCAL_PATH" "$REMOTE:$REMOTE_PATH"
echo
echo "✅ Done. Hard-refresh https://durbin.cc to see changes."
