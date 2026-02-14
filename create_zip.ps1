$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$deployDir = Join-Path $root "temp_deploy_final"
$zipPath = Join-Path $root "ORION_FRONTEND_PRONTO.zip"

Write-Host "Iniciando criação do pacote..."

if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
New-Item -ItemType Directory -Path $deployDir -Force

Write-Host "Copiando arquivos..."
Copy-Item -Path (Join-Path $root "frontend\dist") -Destination $deployDir -Recurse
Copy-Item -Path (Join-Path $root "frontend\server.cjs") -Destination (Join-Path $deployDir "server.cjs")
Copy-Item -Path (Join-Path $root "frontend\squarecloud.app.opt") -Destination (Join-Path $deployDir "squarecloud.app")
Copy-Item (Join-Path $root "frontend\package.prod.json") -Destination (Join-Path $deployDir "package.json")

Write-Host "Compactando..."
Compress-Archive -Path (Join-Path $deployDir "*") -DestinationPath $zipPath -Force

Write-Host "Limpando temporários..."
Remove-Item $deployDir -Recurse -Force

if (Test-Path $zipPath) {
    Write-Host "SUCESSO: ZIP criado em $zipPath"
} else {
    Write-Host "ERRO: Falha ao criar ZIP"
    exit 1
}
