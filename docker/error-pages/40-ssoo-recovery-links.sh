#!/bin/sh
set -eu
# URLs are explicit deployment configuration. Refuse unsafe HTML/scheme values.
for name in SSOO_ADMIN_URL SSOO_CRM_URL SSOO_PMS_URL SSOO_DMS_URL SSOO_SNS_URL; do
  value="$(printenv "$name" || true)"
  case "$value" in http://*|https://*) ;; *) echo "$name requires an absolute HTTP(S) URL" >&2; exit 1;; esac
  case "$value" in *\"*|*\'*|*\<*|*\>*|*\&*|*\`*|*\\*|*' '*|*'@'*) echo "$name contains unsafe URL characters" >&2; exit 1;; esac
  if printf '%s' "$value" | LC_ALL=C grep -q '[[:cntrl:]]'; then echo "$name contains control characters" >&2; exit 1; fi
  export "$name=$value"
done
case "${SSOO_ERROR_UPSTREAM:-}" in http://*|https://*) ;; *) echo 'SSOO_ERROR_UPSTREAM requires HTTP(S)' >&2; exit 1;; esac
envsubst '${SSOO_ADMIN_URL} ${SSOO_CRM_URL} ${SSOO_PMS_URL} ${SSOO_DMS_URL} ${SSOO_SNS_URL}' < /opt/ssoo/services.html.template > /usr/share/nginx/html/services.html
