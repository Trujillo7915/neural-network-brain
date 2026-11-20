$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$taskName = 'NeuralNetworkBrain24x7'
$pidFile = Join-Path $projectRoot 'logs\supervisor.pid'

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if (Test-Path $pidFile) {
    $info = Get-Content $pidFile -Raw | ConvertFrom-Json
    if ($info.supervisorPid) {
        Stop-Process -Id $info.supervisorPid -Force -ErrorAction SilentlyContinue
    }
    if ($info.childPid) {
        Stop-Process -Id $info.childPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$conns = Get-NetTCPConnection -LocalPort 4310 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
    if ($c.OwningProcess) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Servicio NeuralBrainVisualizer24x7 detenido limpiamente."
