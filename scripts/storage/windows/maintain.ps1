[CmdletBinding()]
param(
    [ValidateSet('Check', 'Reclaim', 'Recover')][string]$Mode = 'Check',
    [string]$ConfigPath = (Join-Path $PSScriptRoot 'config.json'),
    [switch]$DryRun,
    [switch]$LibraryOnly
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-MaintenanceDue([datetime]$Now, [Nullable[datetime]]$LastCompleted) {
    $due = $Now.Date.AddDays(-[int]$Now.DayOfWeek).AddHours(4)
    if ($due -gt $Now) { $due = $due.AddDays(-7) }
    return ($null -eq $LastCompleted -or $LastCompleted -lt $due)
}
function Invoke-Native([string]$File, [string[]]$Arguments) {
    if (-not (Test-Path -LiteralPath $File -PathType Leaf)) { throw "Required executable missing: $File" }
    # Never stop containers on a remote context selected by the developer.
    if ([IO.Path]::GetFileName($File) -eq 'docker.exe' -and $Arguments[0] -ne 'desktop') {
        $Arguments = @('--host', 'npipe:////./pipe/dockerDesktopLinuxEngine') + $Arguments
    }
    $preference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $File @Arguments 2>&1
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $preference }
    if ($code -ne 0) { throw "$File failed ($code): $output" }
    return (($output | Out-String) -replace "`0", '').Trim()
}
function Write-Json([string]$File, $Value) {
    $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath "$File.tmp" -Encoding UTF8
    Move-Item -LiteralPath "$File.tmp" -Destination $File -Force
}
function Get-RunningDistros {
    $text = Invoke-Native $script:Wsl @('--list', '--running', '--quiet')
    return @($text -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
function Convert-ToWslPath([string]$File) {
    if ($File -notmatch '^C:\\' -or $File.Contains('"')) { throw 'Maintenance files must be on C: without quotes' }
    return '/mnt/c/' + $File.Substring(3).Replace('\', '/')
}
function Restore-Runtime($Recovery) {
    if ($Recovery.dockerRunning) {
        Invoke-Native $script:Docker @('desktop', 'start') | Out-Null
        $ready = $false
        for ($i = 0; $i -lt 60; $i++) {
            try { Invoke-Native $script:Docker @('info', '--format', '{{.ID}}') | Out-Null; $ready = $true; break } catch { Start-Sleep 2 }
        }
        if (-not $ready) { throw 'Docker did not restart; recovery.json retained' }
        if (@($Recovery.containers).Count) { Invoke-Native $script:Docker (@('start') + @($Recovery.containers)) | Out-Null }
        $restored = $false
        for ($i = 0; $i -lt 90; $i++) {
            $states = @()
            if (@($Recovery.containers).Count) { $states = @(Invoke-Native $script:Docker (@('inspect') + @($Recovery.containers)) | ConvertFrom-Json) }
            $bad = @($states | Where-Object {
                -not $_.State.Running -or ($_.Id -in @($Recovery.healthyContainers) -and $_.State.Health.Status -ne 'healthy')
            })
            if (-not $bad.Count) { $restored = $true; break }
            Start-Sleep 2
        }
        if (-not $restored) { throw 'Previous container running/healthy state was not restored; recovery.json retained' }
    }
    foreach ($distro in @($Recovery.distros)) {
        if ($distro -notlike 'docker-desktop*') { Invoke-Native $script:Wsl @('-d', $distro, '--exec', '/bin/true') | Out-Null }
    }
}
if ($LibraryOnly) { return }
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$root = Split-Path -Parent $ConfigPath
$script:Wsl = Join-Path $env:SystemRoot 'System32\wsl.exe'
$script:Docker = $config.dockerExecutable
$report = [ordered]@{ startedAt = (Get-Date).ToString('o'); mode = $Mode; status = 'running'; beforeBytes = (Get-PSDrive C).Free }
$marker = Join-Path $root 'maintenance.json'
$recoveryFile = Join-Path $root 'recovery.json'
$completionFile = Join-Path $root 'last-completed.json'
$reportDir = Join-Path $root 'reports'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$mutex = New-Object Threading.Mutex($false, 'Local\SSOO-Storage-Maintenance')
$locked = $false
$leases = @()
$releaseFiles = @()
$exitCode = 0
try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { $report.status = 'deferred-overlap'; return }
    if ($Mode -eq 'Check') {
        $report.status = if ($report.beforeBytes -lt $config.minimumFreeGiB * 1GB) { 'below-target' } else { 'passed' }
        $report.pendingRecovery = Test-Path -LiteralPath $recoveryFile
        $report.disks = @($config.disks | ForEach-Object { [pscustomobject]@{ path = $_; bytes = (Get-Item -LiteralPath $_).Length } })
        return
    }
    if (Test-Path -LiteralPath $recoveryFile) {
        if ($DryRun) { $report.status = 'recovery-required'; return }
        Restore-Runtime (Get-Content -LiteralPath $recoveryFile -Raw | ConvertFrom-Json)
        Remove-Item -LiteralPath $recoveryFile -Force
        if (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker -Force }
        $report.status = 'recovered'
        return
    }
    if ($Mode -eq 'Recover') { $report.status = 'no-recovery-needed'; return }
    if (Test-Path -LiteralPath $marker) { throw 'Maintenance marker without recovery state: operator inspection required' }
    $last = $null
    if (Test-Path -LiteralPath $completionFile) { $last = [datetime](Get-Content -LiteralPath $completionFile -Raw | ConvertFrom-Json).completedAt }
    if (-not (Get-MaintenanceDue (Get-Date) $last)) { $report.status = 'not-due'; return }
    if ($report.beforeBytes -ge $config.minimumFreeGiB * 1GB) { $report.status = 'space-sufficient'; return }
    if (-not ('SsooStorageNative' -as [type])) { Add-Type -Path (Join-Path $PSScriptRoot 'native.cs') }
    $report.idleSeconds = [SsooStorageNative]::IdleSeconds()
    if ($report.idleSeconds -lt 3600) { $report.status = 'deferred-user-active'; return }
    $busy = @(Get-CimInstance Win32_Process | Where-Object {
        $_.Name -match '^(MSBuild|ninja|clang|gcc|rustc)\.exe$' -or
        ($_.Name -match '^(docker|node|dotnet)\.exe$' -and $_.CommandLine -match '\b(build|bake|publish)\b')
    })
    if ($busy.Count) { $report.status = 'deferred-build-active'; return }
    $distros = @(Get-RunningDistros)
    if (@($distros | Where-Object { $_ -notin @($config.distros) }).Count) { $report.status = 'deferred-unknown-distro'; return }
    $dockerRunning = (Invoke-Native $script:Docker @('desktop', 'status', '--format', 'json') | ConvertFrom-Json).Status -eq 'running'
    $containerIds = @()
    if ($dockerRunning) { $containerIds = @((Invoke-Native $script:Docker @('ps', '-q')) -split "`r?`n" | Where-Object { $_ }) }
    if ($DryRun) { $report.status = 'eligible-dry-run'; return }
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Elevated scheduled task required for virtual disk compaction'
    }
    foreach ($disk in $config.disks) {
        if ($disk -notmatch '^C:\\.*\.vhdx$' -or -not (Test-Path -LiteralPath $disk -PathType Leaf)) { throw "Invalid configured VHDX: $disk" }
    }
    foreach ($distro in $distros) {
        if ($distro -like 'docker-desktop*') { continue }
        $token = [guid]::NewGuid().ToString('N')
        $ready = Join-Path $root "$token.ready"
        $release = Join-Path $root "$token.release"
        $releaseFiles += $release
        $leaseScript = Convert-ToWslPath (Join-Path $PSScriptRoot 'maintenance-lease.sh')
        $arguments = @('-d', ('"' + $distro + '"'), '--exec', 'bash', ('"' + $leaseScript + '"'),
            ('"' + (Convert-ToWslPath $ready) + '"'), ('"' + (Convert-ToWslPath $release) + '"'))
        $lease = Start-Process -FilePath $script:Wsl -ArgumentList $arguments -PassThru -WindowStyle Hidden
        $leases += [pscustomobject]@{ process = $lease; ready = $ready }
        for ($i = 0; $i -lt 30 -and -not $lease.HasExited -and -not (Test-Path $ready); $i++) { Start-Sleep 1 }
        if ($lease.HasExited -or -not (Test-Path $ready)) { $report.status = 'deferred-build-lock'; return }
    }
    if ([SsooStorageNative]::IdleSeconds() -lt 3600) { $report.status = 'deferred-user-active'; return }
    $healthyContainers = @()
    if ($containerIds.Count) {
        $inspected = @(Invoke-Native $script:Docker (@('inspect') + $containerIds) | ConvertFrom-Json)
        $healthyContainers = @($inspected | Where-Object { $_.State.PSObject.Properties.Name -contains 'Health' -and $_.State.Health.Status -eq 'healthy' } | ForEach-Object { $_.Id })
    }
    $recovery = [ordered]@{ dockerRunning = $dockerRunning; containers = $containerIds; healthyContainers = $healthyContainers; distros = $distros; startedAt = (Get-Date).ToString('o') }
    Write-Json $recoveryFile $recovery
    Write-Json $marker @{ startedAt = $recovery.startedAt }
    try {
        foreach ($distro in $distros) {
            if ($distro -notlike 'docker-desktop*') { Invoke-Native $script:Wsl @('-d', $distro, '-u', 'root', '--exec', 'fstrim', '/') | Out-Null }
        }
        if ([SsooStorageNative]::IdleSeconds() -lt 3600) { $report.status = 'deferred-user-active'; return }
        if ($dockerRunning) {
            if ($containerIds.Count) { Invoke-Native $script:Docker (@('stop', '--time', '60') + $containerIds) | Out-Null }
            Invoke-Native $script:Docker @('desktop', 'stop') | Out-Null
        }
        Invoke-Native $script:Wsl @('--shutdown') | Out-Null
        if (@(Get-RunningDistros).Count) { throw 'WSL restarted during maintenance; refusing compaction' }
        foreach ($disk in $config.disks) { [SsooStorageNative]::Compact($disk) }
        Write-Json $completionFile @{ completedAt = (Get-Date).ToString('o') }
        $report.status = 'compacted'
    } finally {
        Restore-Runtime $recovery
        Remove-Item -LiteralPath $recoveryFile -Force
        Remove-Item -LiteralPath $marker -Force
    }
} catch {
    $report.status = 'failed'
    $report.error = $_.Exception.Message
    $exitCode = 1
} finally {
    foreach ($file in $releaseFiles) { New-Item -ItemType File -Force -Path $file | Out-Null }
    foreach ($lease in $leases) {
        $lease.process.WaitForExit(5000) | Out-Null
        if (Test-Path $lease.ready) { Remove-Item -LiteralPath $lease.ready -Force }
    }
    foreach ($file in $releaseFiles) { if (Test-Path $file) { Remove-Item -LiteralPath $file -Force } }
    $report.afterBytes = (Get-PSDrive C).Free
    $report.reclaimedBytes = $report.afterBytes - $report.beforeBytes
    $report.targetMet = $report.afterBytes -ge $config.minimumFreeGiB * 1GB
    $report.finishedAt = (Get-Date).ToString('o')
    Write-Json (Join-Path $reportDir ((Get-Date -Format 'yyyyMMdd-HHmmss') + "-$Mode.json")) $report
    Write-Json (Join-Path $root "latest-$Mode.json") $report
    Get-ChildItem -LiteralPath $reportDir -Filter '*.json' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
    $report | ConvertTo-Json -Depth 8
}
exit $exitCode
