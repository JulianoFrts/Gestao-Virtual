# ============================================================
# Deploy ZIP — Unificado (SquareCloud)
# Gera GESTAO_VIRTUAL_UNIFIED.zip com Backend + Frontend
# ============================================================
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot | Split-Path -Parent
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$deployDir = Join-Path $root "temp_deploy_unified"
$zipPath = Join-Path $root "GESTAO_VIRTUAL_UNIFIED.zip"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 GESTÃO VIRTUAL — Deploy Unificado"             -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ---- LIMPA DEPLOY ANTERIOR ----
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# ---- 1. BUILD DO FRONTEND (Vite) ----
Write-Host "`n📦 Passo 1: Build do Frontend (Vite)..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build do frontend falhou" }
    Write-Host "  ✅ Frontend build concluído" -ForegroundColor Green
} finally {
    Pop-Location
}

# ---- 2. MONTAGEM DA ESTRUTURA ----
Write-Host "`n📦 Passo 2: Montando estrutura do deploy..." -ForegroundColor Yellow

# 2a. Arquivo principal do gateway unificado + config
$unifiedStart = Join-Path $root "squarecloud.unified.start.cjs"
$unifiedApp = Join-Path $root "squarecloud.unified.app"

# Copia como squarecloud.start.cjs e squarecloud.app (nomes que a SquareCloud espera)
Copy-Item $unifiedStart -Destination (Join-Path $deployDir "squarecloud.unified.start.cjs")
Write-Host "  ✅ squarecloud.unified.start.cjs" -ForegroundColor Green

Copy-Item $unifiedApp -Destination (Join-Path $deployDir "squarecloud.app")
Write-Host "  ✅ squarecloud.app (unificado)" -ForegroundColor Green

# 2b. Backend (sem node_modules, sem .next build que será feito lá)
$backendDeploy = Join-Path $deployDir "backend"
New-Item -ItemType Directory -Path $backendDeploy -Force | Out-Null

$backendFiles = @(
    "package.json",
    "next.config.mjs",
    "tsconfig.json",
    "started.js",
    "squarecloud.start.cjs"
)

foreach ($file in $backendFiles) {
    $src = Join-Path $backendDir $file
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $backendDeploy $file)
        Write-Host "  ✅ backend/$file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ backend/$file não encontrado (ignorado)" -ForegroundColor Yellow
    }
}

$backendFolders = @("src", "prisma")
foreach ($folder in $backendFolders) {
    $src = Join-Path $backendDir $folder
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $backendDeploy $folder) -Recurse
        Write-Host "  ✅ backend/$folder/" -ForegroundColor Green
    }
}

# Certificados
$certsDir = Join-Path $backendDir "certificates"
if (Test-Path $certsDir) {
    Copy-Item $certsDir -Destination (Join-Path $backendDeploy "certificates") -Recurse
    Write-Host "  ✅ backend/certificates/" -ForegroundColor Green
}

# 2c. Frontend dist (já buildado)
$frontendDist = Join-Path $frontendDir "dist"
$frontendDistDeploy = Join-Path $deployDir "frontend_dist"

if (Test-Path $frontendDist) {
    Copy-Item $frontendDist -Destination $frontendDistDeploy -Recurse
    Write-Host "  ✅ frontend_dist/" -ForegroundColor Green
} else {
    Write-Host "  ❌ frontend/dist não encontrado! Rode 'npm run build' no frontend primeiro." -ForegroundColor Red
    exit 1
}

# ---- 3. COMPACTAR ----
Write-Host "`n📦 Passo 3: Compactando..." -ForegroundColor Yellow
Compress-Archive -Path (Join-Path $deployDir "*") -DestinationPath $zipPath -Force

# ---- 4. LIMPEZA ----
Remove-Item $deployDir -Recurse -Force

# ---- RESULTADO ----
if (Test-Path $zipPath) {
    $size = (Get-Item $zipPath).Length / 1MB
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "✅ SUCESSO: $zipPath ({0:N1} MB)" -f $size -ForegroundColor Green
    Write-Host "   Upload em: https://squarecloud.app/dashboard" -ForegroundColor Cyan
    Write-Host "   Config: 3072 MB RAM | 1 App Unificado" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ ERRO: Falha ao criar ZIP" -ForegroundColor Red
    exit 1
}
