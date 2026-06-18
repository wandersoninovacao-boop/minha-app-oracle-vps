$ErrorActionPreference = "Stop"

$NodeExe = "C:\Users\wande\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if (!(Test-Path $NodeExe)) {
  $NodeExe = "node"
}

$UserToken = [Environment]::GetEnvironmentVariable("SHOPEE_TELEGRAM_BOT_TOKEN", "User")
$UserChatId = [Environment]::GetEnvironmentVariable("SHOPEE_TELEGRAM_CHAT_ID", "User")

if (!$env:SHOPEE_TELEGRAM_BOT_TOKEN -and $UserToken) {
  $env:SHOPEE_TELEGRAM_BOT_TOKEN = $UserToken
}

if (!$env:SHOPEE_TELEGRAM_CHAT_ID -and $UserChatId) {
  $env:SHOPEE_TELEGRAM_CHAT_ID = $UserChatId
}

& $NodeExe "$PSScriptRoot\generate-assets.js"
& $NodeExe "$PSScriptRoot\send-telegram.js"

