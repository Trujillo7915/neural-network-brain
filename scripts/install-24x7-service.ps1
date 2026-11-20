$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $PSScriptRoot 'launch-24x7.vbs'
$taskName = 'NeuralNetworkBrain24x7'
$healthUrl = 'http://127.0.0.1:4310/api/v1/health'

Write-Host "[1/4] Verificando compilación de producción..."
$mainJs = Join-Path $projectRoot 'dist\server\presentation\main.js'
$webIndex = Join-Path $projectRoot 'dist\web\index.html'
if (-not (Test-Path $mainJs) -or -not (Test-Path $webIndex)) {
    Push-Location $projectRoot
    try {
        npm run build
    } finally {
        Pop-Location
    }
}

Write-Host "[2/4] Liberando procesos previos en puerto :4310 si existieran..."
$existingConns = Get-NetTCPConnection -LocalPort 4310 -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $existingConns) {
    if ($conn.OwningProcess -and $conn.OwningProcess -ne $PID) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Milliseconds 600

Write-Host "[3/4] Registrando tarea persistente en Windows Task Scheduler ($taskName)..."
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B //Nologo `"$vbsPath`""
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerWatchdog = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($triggerLogon, $triggerWatchdog) `
    -Settings $settings `
    -Description 'Mantiene activo 24/7 el Observatorio Cerebral 3D (Neural Brain Visualizer) en http://127.0.0.1:4310 en modo solo lectura.' `
    -Force | Out-Null

Write-Host "[4/4] Iniciando servicio 24/7 de forma desacoplada..."
Start-ScheduledTask -TaskName $taskName

$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        if ($health.service -eq 'neural-network-brain') {
            $ready = $true
            $health | ConvertTo-Json -Depth 4
            break
        }
    } catch {
        # Esperando arranque inicial
    }
}

if (-not $ready) {
    throw "La tarea $taskName fue registrada pero $healthUrl no respondió a tiempo. Revisa logs\neural-brain-24x7.log."
}

Write-Host "Servicio 24/7 activo y verificado en http://127.0.0.1:4310"
