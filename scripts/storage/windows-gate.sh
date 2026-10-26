#!/usr/bin/env bash
# A Windows-owned marker survives WSL shutdown; never start a managed job during compaction.
storage_windows_gate() {
  local ps=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe
  if [[ -x "$ps" ]] && grep -qi microsoft /proc/sys/kernel/osrelease; then
    "$ps" -NoProfile -NonInteractive -Command 'if (Test-Path "$env:LOCALAPPDATA\SSOO\Storage\maintenance.json") { Write-Error "SSOO Windows storage maintenance is active or requires recovery"; exit 75 }'
  fi
}
