#!/usr/bin/env bash
set -euo pipefail
# Run as the distro's normal user so the lock stays writable by local build commands.
exec 9>/tmp/ssoo-app-runtime.lock
flock -n 9 || exit 75
# Catch common unmanaged builds as well as managed jobs covered by the lock.
if ps -eo comm= | grep -Eq '^(buildctl|turbo|make|ninja|gcc|g\+\+|clang|rustc|cargo|javac)$'; then exit 75; fi
if ps -eo comm=,args= | awk '$1 != "bash" && $1 != "grep" && $1 != "awk" { print }' | grep -Eq '(pnpm|npm|next|docker|buildx)( |/).*\b(build|bake|deploy|publish)\b'; then exit 75; fi
touch "$1"
for ((i=0; i<1800; i++)); do
  [[ ! -e "$2" ]] || exit 0
  sleep 1
done
exit 75
