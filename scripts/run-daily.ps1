$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$NodeExe = "C:\Users\wande\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$PlanBPath = Join-Path $Root "out\PLANO-B-ENVIO-MANUAL.txt"
$PostsPath = Join-Path $Root "out\posts-hoje.txt"
$LowCreditsPath = Join-Path $Root "out\PLANO-B-CREDITOS-BAIXOS-RESUMO.txt"

if (!(Test-Path $NodeExe)) {
  $NodeExe = "node"
}

& $NodeExe "$PSScriptRoot\generate-assets.js"

$LowCreditsContent = @"
PLANO B - CREDITOS BAIXOS

Status:
Os arquivos essenciais foram gerados.

Arquivos para usar agora:
- out/posts-hoje.txt
- out/posts-semana.txt
- out/vitrine.html
- out/catalogo.csv

Regra:
Se os creditos/limite estiverem baixos, nao iniciar novas plataformas.
Use apenas os posts prontos e mantenha a operacao rodando.

Proximo passo curto:
Publicar os posts de hoje no Telegram/WhatsApp/TikTok.
"@

Set-Content -Path $LowCreditsPath -Value $LowCreditsContent -Encoding utf8

$UserToken = [Environment]::GetEnvironmentVariable("SHOPEE_TELEGRAM_BOT_TOKEN", "User")
$UserChatId = [Environment]::GetEnvironmentVariable("SHOPEE_TELEGRAM_CHAT_ID", "User")

if (!$env:SHOPEE_TELEGRAM_BOT_TOKEN -and $UserToken) {
  $env:SHOPEE_TELEGRAM_BOT_TOKEN = $UserToken
}

if (!$env:SHOPEE_TELEGRAM_CHAT_ID -and $UserChatId) {
  $env:SHOPEE_TELEGRAM_CHAT_ID = $UserChatId
}

function Write-PlanB {
  param(
    [string]$Reason
  )

  $Posts = ""
  if (Test-Path $PostsPath) {
    $Posts = Get-Content -Raw $PostsPath
  }

  $Content = @"
PLANO B - ENVIO MANUAL

Motivo:
$Reason

O que fazer agora:
1. Copiar os posts abaixo.
2. Publicar no Telegram manualmente se o bot falhar.
3. Reaproveitar os mesmos textos em WhatsApp Status, grupos e TikTok.
4. Evitar disparo em massa. Publique 3 a 5 ofertas por dia.

POSTS DE HOJE

$Posts
"@

  Set-Content -Path $PlanBPath -Value $Content -Encoding utf8
  Write-Host "Plano B gerado em $PlanBPath"
}

if ($env:SHOPEE_TELEGRAM_BOT_TOKEN -and $env:SHOPEE_TELEGRAM_CHAT_ID) {
  & $NodeExe "$PSScriptRoot\send-telegram.js"
  if ($LASTEXITCODE -ne 0) {
    Write-PlanB "Falha no envio automatico para Telegram. Codigo de saida: $LASTEXITCODE"
  }
} else {
  Write-Host "Telegram nao configurado. Arquivos gerados em $Root\out."
  Write-PlanB "Telegram nao configurado."
}
