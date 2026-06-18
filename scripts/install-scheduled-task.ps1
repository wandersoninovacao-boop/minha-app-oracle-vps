$ErrorActionPreference = "Stop"

$TaskName = "Shopee Afiliados - Gerar Posts Diarios"
$ScriptPath = Join-Path $PSScriptRoot "run-daily.ps1"
$Time = Read-Host "Horario diario para rodar (ex: 09:00)"

if ([string]::IsNullOrWhiteSpace($Time)) {
  $Time = "09:00"
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
Write-Host "Agendamento criado: $TaskName as $Time"
