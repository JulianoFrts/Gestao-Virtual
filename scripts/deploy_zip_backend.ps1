# ============================================================
# Deploy ZIP - Backend (SquareCloud)
# Gera ORION_BACKEND.zip pronto para upload na SquareCloud
# ============================================================
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot | Split-Path -Parent
$backendDir = Join-Path $root "backend"
$deployDir = Join-Path $root "temp_deploy_backend"
$zipPath = Join-Path $root "ORION_BACKEND.zip"

Write-Host "🚀 Gerando pacote de deploy do BACKEND..." -ForegroundColor Cyan

# Limpa deploy anterior
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

Write-Host "📦 Copiando arquivos do backend..." -ForegroundColor Yellow

# Arquivos essenciais
$filesToCopy = @(
    "package.json",
    "squarecloud.app",
    "squarecloud.start.cjs",
    "next.config.mjs",
    "tsconfig.json",
    "started.js"
)

foreach ($file in $filesToCopy) {
    $src = Join-Path $backendDir $file
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $deployDir $file)
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $file não encontrado (ignorado)" -ForegroundColor Yellow
    }
}

# Pastas essenciais
$foldersToCopy = @("src", "prisma")

foreach ($folder in $foldersToCopy) {
    $src = Join-Path $backendDir $folder
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $deployDir $folder) -Recurse
        Write-Host "  ✅ $folder/" -ForegroundColor Green
    }
}

# Certificados (se existirem)
$certsDir = Join-Path $backendDir "certificates"
if (Test-Path $certsDir) {
    Copy-Item $certsDir -Destination (Join-Path $deployDir "certificates") -Recurse
    Write-Host "  ✅ certificates/" -ForegroundColor Green
}

# Compactar
Write-Host "`n📦 Compactando..." -ForegroundColor Yellow
Compress-Archive -Path (Join-Path $deployDir "*") -DestinationPath $zipPath -Force

# Limpar
Remove-Item $deployDir -Recurse -Force

# Resultado
if (Test-Path $zipPath) {
    $size = (Get-Item $zipPath).Length / 1MB
    Write-Host "`n✅ SUCESSO: $zipPath ({0:N1} MB)" -f $size -ForegroundColor Green
    Write-Host "   Faça upload em: https://squarecloud.app/dashboard" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ ERRO: Falha ao criar ZIP" -ForegroundColor Red
    exit 1
}
