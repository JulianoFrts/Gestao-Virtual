# ============================================================
# Deploy ZIP - Frontend (SquareCloud)
# Gera ORION_FRONTEND.zip pronto para upload na SquareCloud
# ============================================================
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot | Split-Path -Parent
$frontendDir = Join-Path $root "frontend"
$deployDir = Join-Path $root "temp_deploy_frontend"
$zipPath = Join-Path $root "ORION_FRONTEND.zip"

Write-Host "🚀 Gerando pacote de deploy do FRONTEND..." -ForegroundColor Cyan

# Limpa deploy anterior
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

Write-Host "📦 Copiando arquivos do frontend..." -ForegroundColor Yellow

# Arquivos essenciais
$filesToCopy = @(
    "package.json",
    "squarecloud.app",
    "squarecloud.start.cjs",
    "vite.config.ts",
    "index.html",
    "postcss.config.js",
    "tailwind.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "components.json",
    "server.cjs",
    ".npmrc"
)

foreach ($file in $filesToCopy) {
    $src = Join-Path $frontendDir $file
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $deployDir $file)
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $file não encontrado (ignorado)" -ForegroundColor Yellow
    }
}

# Pastas essenciais
$foldersToCopy = @("src", "public")

foreach ($folder in $foldersToCopy) {
    $src = Join-Path $frontendDir $folder
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $deployDir $folder) -Recurse
        Write-Host "  ✅ $folder/" -ForegroundColor Green
    }
}

# .env.production (variáveis de build do Vite)
$envProd = Join-Path $frontendDir ".env.production"
if (Test-Path $envProd) {
    Copy-Item $envProd -Destination (Join-Path $deployDir ".env.production")
    Write-Host "  ✅ .env.production" -ForegroundColor Green
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
