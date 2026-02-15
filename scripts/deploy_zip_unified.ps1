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

# Função para salvar texto no padrão Unix (LF) e UTF-8 sem BOM
function Save-UnixText($pathToSave, $content) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding $false
    # Remove qualquer CRLF existente e garante LF
    $unifedContent = ($content -replace "`r`n", "`n")
    # Garante que termine com um newline (boa prática em Linux)
    if (-not $unifedContent.EndsWith("`n")) { $unifedContent += "`n" }
    [System.IO.File]::WriteAllText($pathToSave, $unifedContent, $Utf8NoBom)
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 GESTAO VIRTUAL - Deploy Unificado (Unix Fix)"  -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ---- LIMPA DEPLOY ANTERIOR ----
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# ---- 1. BUILD DO FRONTEND (Vite) ----
Write-Host "`nPasso 1: Build do Frontend (Vite)..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build do frontend falhou" }
    Write-Host "  ✅ Frontend build concluído" -ForegroundColor Green
}
finally {
    Pop-Location
}

# ---- 2. MONTAGEM DA ESTRUTURA ----
Write-Host "`nPasso 2: Montando estrutura do deploy..." -ForegroundColor Yellow

# 2a. Arquivo principal do gateway unificado + config
$unifiedStart = Join-Path $root "squarecloud.unified.start.cjs"
$unifiedApp = Join-Path $root "squarecloud.unified.app"
$deployId = Get-Date -Format "yyyyMMdd-HHmmss"

# Lê o script, substitui o placeholder e salva no deploy como start.js (Unix format)
$startContent = Get-Content $unifiedStart -Raw
$startContent = $startContent.Replace('[[DEPLOY_ID]]', $deployId)
Save-UnixText (Join-Path $deployDir "start.js") $startContent
Write-Host "  OK: start.js gerado (Unix Fix) com ID $deployId" -ForegroundColor Green

# 2b. Package JSON do Gateway (Unix format)
$gwPackagePath = Join-Path $root "squarecloud.package.json"
$gwPackageContent = Get-Content $gwPackagePath -Raw
Save-UnixText (Join-Path $deployDir "package.json") $gwPackageContent
Write-Host "  OK: package.json (Gateway Unix Fix)" -ForegroundColor Green

# 2c. SquareCloud Config (Unix format)
$appContent = Get-Content $unifiedApp -Raw
Save-UnixText (Join-Path $deployDir "squarecloud.app") $appContent
Write-Host "  OK: squarecloud.app (Unix Fix)" -ForegroundColor Green

# 2c. Backend
$backendDeploy = Join-Path $deployDir "backend"
New-Item -ItemType Directory -Path $backendDeploy -Force | Out-Null

$backendFiles = @("package.json", "next.config.mjs", "tsconfig.json", "started.js", "squarecloud.start.cjs")
foreach ($file in $backendFiles) {
    if (Test-Path (Join-Path $backendDir $file)) {
        Copy-Item (Join-Path $backendDir $file) -Destination (Join-Path $backendDeploy $file)
    }
}

$backendFolders = @("src", "prisma")
foreach ($folder in $backendFolders) {
    if (Test-Path (Join-Path $backendDir $folder)) {
        Copy-Item (Join-Path $backendDir $folder) -Destination (Join-Path $backendDeploy $folder) -Recurse
    }
}

# Certificados
if (Test-Path (Join-Path $backendDir "certificates")) {
    Copy-Item (Join-Path $backendDir "certificates") -Destination (Join-Path $backendDeploy "certificates") -Recurse
}

# 2d. Frontend dist
Copy-Item (Join-Path $frontendDir "dist") -Destination (Join-Path $deployDir "frontend_dist") -Recurse
Write-Host "  OK: frontend_dist/" -ForegroundColor Green

# ---- 3. COMPACTAR ----
Write-Host "`nPasso 3: Compactando..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Push-Location $deployDir
try {
    tar -cf "$zipPath" --format=zip *
}
finally {
    Pop-Location
}
Set-Location $root

# ---- 4. LIMPEZA ----
Remove-Item $deployDir -Recurse -Force

# ---- RESULTADO ----
if (Test-Path $zipPath) {
    $size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "SUCESSO: $zipPath ($size MB)" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
}
else {
    Write-Host "`n❌ ERRO: Falha ao criar ZIP" -ForegroundColor Red
    exit 1
}
