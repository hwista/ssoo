[CmdletBinding()]
param(
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'SSOO\Storage'),
    [switch]$CheckOnly,
    [switch]$UpdateFilesOnly,
    [switch]$Elevate
)
$ErrorActionPreference = 'Stop'
if ($Elevate) {
    $process = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $PSCommandPath + '"'),
        '-Destination', ('"' + $Destination + '"'))
    exit $process.ExitCode
}
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $CheckOnly -and -not $UpdateFilesOnly -and -not $admin) { throw 'Run install.ps1 -Elevate to register the compaction task with administrator privileges' }
if ($Destination -ne (Join-Path $env:LOCALAPPDATA 'SSOO\Storage')) { throw 'Install for the current Windows user in LocalAppData\SSOO\Storage' }
$docker = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe'
if (-not (Test-Path $docker)) { throw 'Docker Desktop CLI not found' }
& $docker desktop status --format json | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop CLI status unavailable' }
$distros = @(Get-ChildItem HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss | ForEach-Object { Get-ItemProperty $_.PSPath })
$disks = @($distros | ForEach-Object {
    $base = $_.BasePath -replace '^\\\\\?\\', ''
    Get-ChildItem -LiteralPath $base -Filter '*.vhdx' -ErrorAction Stop | Select-Object -ExpandProperty FullName
})
$disks += @(Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Docker\wsl') -Filter '*.vhdx' -Recurse -ErrorAction Stop | Select-Object -ExpandProperty FullName)
$disks = @($disks | Where-Object { $_ -match '^C:\\' } | Sort-Object -Unique)
if (-not $disks.Count) { throw 'No C: VHDX files discovered; inspect disk paths before installation' }
$policy = Get-Content (Join-Path $PSScriptRoot '..\policy.json') -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
foreach ($file in @('maintain.ps1', 'native.cs', 'maintenance-lease.sh')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $Destination $file) -Force
}
$config = [ordered]@{
    schemaVersion = 1; installedAt = (Get-Date).ToString('o'); owner = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    minimumFreeGiB = $policy.windowsMinimumFreeGiB; dockerExecutable = $docker
    distros = @($distros | ForEach-Object { $_.DistributionName }); disks = $disks
}
$config | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Destination 'config.json') -Encoding UTF8
if ($UpdateFilesOnly) { Write-Output 'Installed script files updated; scheduled tasks unchanged'; return }
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$check = New-ScheduledTaskAction -Execute $powershell -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + (Join-Path $Destination 'maintain.ps1') + '" -Mode Check')
$checkTriggers = @((New-ScheduledTaskTrigger -Daily -At '12:00'), (New-ScheduledTaskTrigger -AtLogOn -User $user))
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'SSOO-Storage-Check' -Action $check -Trigger $checkTriggers -Settings $settings -Principal $principal -Force | Out-Null
if (-not $CheckOnly) {
    $reclaim = New-ScheduledTaskAction -Execute $powershell -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + (Join-Path $Destination 'maintain.ps1') + '" -Mode Reclaim')
    # Daily retry + logon catches a missed Sunday. maintain.ps1 only runs once per due week.
    $triggers = @((New-ScheduledTaskTrigger -Daily -At '04:00'), (New-ScheduledTaskTrigger -AtLogOn -User $user))
    $idleSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RunOnlyIfIdle -IdleDuration (New-TimeSpan -Hours 1) -IdleWaitTimeout (New-TimeSpan -Hours 8) -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    $elevated = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask -TaskName 'SSOO-Storage-Reclaim' -Action $reclaim -Trigger $triggers -Settings $idleSettings -Principal $elevated -Force | Out-Null
}
& (Join-Path $Destination 'maintain.ps1') -Mode Check
Get-ScheduledTask -TaskName 'SSOO-Storage-*' | Select-Object TaskName, State
