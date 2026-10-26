$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\..\..\..\scripts\storage\windows\maintain.ps1" -LibraryOnly
function Assert($Value, [string]$Message) { if (-not $Value) { throw $Message } }
Assert (Get-MaintenanceDue ([datetime]'2026-10-26T12:00:00') $null) 'First run on Monday must catch up'
Assert (Get-MaintenanceDue ([datetime]'2026-10-26T12:00:00') ([datetime]'2026-10-18T05:00:00')) 'Missed Sunday must catch up'
Assert (-not (Get-MaintenanceDue ([datetime]'2026-10-26T12:00:00') ([datetime]'2026-10-25T05:00:00'))) 'Already completed week must not repeat'
Assert (-not (Get-MaintenanceDue ([datetime]'2026-10-25T03:00:00') ([datetime]'2026-10-18T05:00:00'))) 'Sunday before 04:00 must not run next week early'
Assert (Get-MaintenanceDue ([datetime]'2026-10-25T04:00:00') ([datetime]'2026-10-18T05:00:00')) 'Sunday 04:00 must become due'
Assert ((Convert-ToWslPath 'C:\Users\Example User\state') -eq '/mnt/c/Users/Example User/state') 'Paths with spaces must survive'
$failed = $false
try { Convert-ToWslPath 'D:\unapproved' } catch { $failed = $true }
Assert $failed 'Non-C paths must be rejected'
Add-Type -Path "$PSScriptRoot\..\..\..\scripts\storage\windows\native.cs"
Assert ([SsooStorageNative]::IdleSeconds() -ge 0) 'Idle timer must work'
$failed = $false
try { [SsooStorageNative]::Compact('C:\does-not-exist-ssoo-test.vhdx') } catch { $failed = $true }
Assert $failed 'Native compaction errors must propagate (no actual disk is touched)'
$failed = $false
try { Invoke-Native 'C:\does-not-exist-ssoo-test.exe' @() } catch { $failed = $true }
Assert $failed 'Missing executable must fail closed'
$script:Docker = 'fixture-docker'
$script:Wsl = 'fixture-wsl'
$script:calls = @()
$script:healthy = $true
function Start-Sleep([int]$Seconds) { }
function Invoke-Native([string]$File, [string[]]$Arguments) {
    $script:calls += ($Arguments -join ' ')
    if ($Arguments[0] -eq 'inspect') {
        $status = if ($script:healthy) { 'healthy' } else { 'unhealthy' }
        return '[{"Id":"container","State":{"Running":true,"Health":{"Status":"' + $status + '"}}}]'
    }
    return 'fixture'
}
Restore-Runtime ([pscustomobject]@{ dockerRunning=$true; containers=@('container'); healthyContainers=@('container'); distros=@('Ubuntu') })
Assert ($script:calls -contains 'desktop start') 'Docker must be restored'
Assert ($script:calls -contains 'start container') 'Previously running containers must be restored'
Assert ($script:calls -contains '-d Ubuntu --exec /bin/true') 'Previously running distro must be restored'
$script:healthy = $false
$failed = $false
try { Restore-Runtime ([pscustomobject]@{ dockerRunning=$true; containers=@('container'); healthyContainers=@('container'); distros=@() }) } catch { $failed = $true }
Assert $failed 'Unhealthy restoration must not be reported successful'
Write-Output '14 Windows schedule/path/native/restore checks passed'
