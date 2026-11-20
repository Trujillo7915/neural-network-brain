$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$taskName = 'NeuralNetworkBrain24x7'
$healthUrl = 'http://127.0.0.1:4310/api/v1/health'
$livenessUrl = 'http://127.0.0.1:4310/api/v1/health?mode=liveness'
$logFile = Join-Path $projectRoot 'logs\neural-brain-24x7.log'

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$conn = Get-NetTCPConnection -LocalPort 4310 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

$liveness = $null
try {
    $liveness = Invoke-RestMethod -Uri $livenessUrl -TimeoutSec 2
} catch {
    $liveness = $null
}

$health = $null
try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 15
} catch {
    $health = $null
}

$summary = [ordered]@{
    scheduledTaskName = $taskName
    scheduledTaskState = if ($task) { [string]$task.State } else { 'NOT_REGISTERED' }
    port4310Listening = ($null -ne $conn)
    listeningPid = if ($conn) { $conn.OwningProcess } else { $null }
    livenessStatus = if ($liveness) { $liveness.status } else { 'UNREACHABLE' }
    healthStatus = if ($health) { $health.status } else { 'TIMEOUT_OR_UNREACHABLE' }
    totalNeurons = if ($health) { $health.totalNeurons } else { $null }
    growthStage = if ($health) { $health.growthStage } else { $null }
    logTail = if (Test-Path $logFile) { @(Get-Content $logFile -Tail 5 | ForEach-Object { "$_" }) } else { @() }
}

$summary | ConvertTo-Json -Depth 4
