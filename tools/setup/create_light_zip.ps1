$ErrorActionPreference = "Stop"
$zipName = "GESTAO_VIRTUAL_V178_LIGHT.zip"
$tempDir = "temp_deploy_v178"

Write-Host "🧹 Limpando área de trabalho..."
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
if (Test-Path $zipName) { Remove-Item $zipName -Force }

New-Item -ItemType Directory -Path $tempDir | Out-Null
New-Item -ItemType Directory -Path "$tempDir/backend" | Out-Null
New-Item -ItemType Directory -Path "$tempDir/frontend_dist" | Out-Null

Write-Host "📂 Copiando arquivos raiz..."
Copy-Item "squarecloud.unified.start.cjs" "$tempDir/"
Copy-Item "package.json" "$tempDir/"

Write-Host "📂 Copiando Backend (Excluindo node_modules, .next)..."
$exclude = @("node_modules", ".next", ".git", "dist", "coverage", ".turbo", "test-results")
Get-ChildItem -Path "backend" -Exclude $exclude | Copy-Item -Destination "$tempDir/backend" -Recurse

Write-Host "📂 Copiando Frontend Dist..."
if (Test-Path "frontend_dist") {
    Copy-Item "frontend_dist/*" "$tempDir/frontend_dist" -Recurse
}
else {
    Write-Warning "frontend_dist não encontrado! O zip pode estar incompleto se o frontend for necessário."
}

Write-Host "📦 Zipando pacote Light..."
Compress-Archive -Path "$tempDir/*" -DestinationPath $zipName -Force

$size = (Get-Item $zipName).Length / 1MB
Write-Host "✅ Zip Criado: $zipName ($([math]::Round($size, 2)) MB)"

Remove-Item $tempDir -Recurse -Force
