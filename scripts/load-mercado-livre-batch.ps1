$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "data\mercado-livre-lote-pendente.json"
$Target = Join-Path $Root "data\products.json"

Copy-Item -LiteralPath $Source -Destination $Target -Force
Write-Host "Lote Mercado Livre carregado em data/products.json."
Write-Host "Substitua COLE_AQUI_SEU_LINK_AFILIADO_MERCADO_LIVRE pelos links reais e mude o status para Pronto."
