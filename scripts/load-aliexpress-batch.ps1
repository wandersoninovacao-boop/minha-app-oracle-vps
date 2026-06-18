$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "data\aliexpress-lote-pendente.json"
$Target = Join-Path $Root "data\products.json"

$Current = Get-Content -Raw $Target | ConvertFrom-Json
$Batch = Get-Content -Raw $Source | ConvertFrom-Json

$existingIds = @{}
foreach ($product in $Current.products) {
  $existingIds[$product.id] = $true
}

$newProducts = @()
foreach ($product in $Batch.products) {
  if (-not $existingIds.ContainsKey($product.id)) {
    $newProducts += $product
  }
}

$Current.products = @($Current.products) + @($newProducts)
$Json = $Current | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($Target, $Json, [System.Text.UTF8Encoding]::new($false))

Write-Host "$($newProducts.Count) produto(s) AliExpress pendente(s) adicionados em data/products.json."
