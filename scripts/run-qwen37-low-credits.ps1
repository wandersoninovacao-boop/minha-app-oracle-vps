$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$QwenScript = "D:\IA LOCAL\Qwen-Cloud\ask_qwen.ps1"
$PostsPath = Join-Path $Root "out\posts-hoje.txt"
$OutPath = Join-Path $Root "out\qwen37-plano-b-creditos-baixos.txt"

if (!(Test-Path $QwenScript)) {
  throw "Script Qwen3.7-Max nao encontrado em $QwenScript"
}

if (!(Test-Path $PostsPath)) {
  & "$PSScriptRoot\run-daily.ps1"
}

$Posts = ""
if (Test-Path $PostsPath) {
  $Posts = Get-Content -Raw $PostsPath
}

$Prompt = @"
Modo economia de creditos.

Voce e Qwen3.7-Max atuando como apoio secundario do Codex/Nexo.
Codex/Nexo e ChatGPT continuam como principais e revisam tudo.

Tarefa:
Com base nos posts abaixo, gere:
1. 5 versoes curtas para WhatsApp Status.
2. 5 roteiros curtos para TikTok.
3. 3 chamadas para divulgar o canal do Telegram.

Regras:
- Responder em portugues do Brasil.
- Nao inventar preco.
- Nao prometer desconto fixo.
- Sempre orientar a conferir preco, frete e prazo.
- Ser direto e economico.

Posts:

$Posts
"@

$Result = powershell -NoProfile -ExecutionPolicy Bypass -File $QwenScript $Prompt -Model "qwen3.7-max" -MaxTokens 900 -Temperature 0.3
Set-Content -Path $OutPath -Value $Result -Encoding utf8

Write-Host "Plano B com Qwen3.7-Max gerado em $OutPath"

