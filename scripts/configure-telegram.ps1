$ErrorActionPreference = "Stop"

$Token = Read-Host "Cole o token do bot do Telegram"
$ChatId = Read-Host "Cole o chat_id do canal/grupo/usuario"

if ([string]::IsNullOrWhiteSpace($Token) -or [string]::IsNullOrWhiteSpace($ChatId)) {
  throw "Token e chat_id sao obrigatorios."
}

[Environment]::SetEnvironmentVariable("SHOPEE_TELEGRAM_BOT_TOKEN", $Token, "User")
[Environment]::SetEnvironmentVariable("SHOPEE_TELEGRAM_CHAT_ID", $ChatId, "User")

$env:SHOPEE_TELEGRAM_BOT_TOKEN = $Token
$env:SHOPEE_TELEGRAM_CHAT_ID = $ChatId

Write-Host "Telegram configurado para o usuario atual."
Write-Host "Feche e abra o PowerShell para carregar as variaveis em novas janelas."
