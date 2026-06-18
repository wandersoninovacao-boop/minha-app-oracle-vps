$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "data\primeiro-lote-pendente.json"
$Target = Join-Path $Root "data\products.json"

Copy-Item -LiteralPath $Source -Destination $Target -Force
Write-Host "Primeiro lote carregado em data/products.json."
Write-Host "Abra o painel, substitua COLE_AQUI_SEU_LINK_AFILIADO_SHOPEE pelos links reais e mude o status para Pronto."
