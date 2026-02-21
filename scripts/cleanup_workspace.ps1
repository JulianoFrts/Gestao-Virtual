# Cleanup Workspace and Start Docker
# Purpose: Reorganize root directory and start the PostgreSQL database

Write-Host "Starting Faxina..." -ForegroundColor Cyan

# 1. Move diagnose scripts to tools
$toolsDir = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\tools"
if (!(Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir }

$diagnoseData = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\diagnose-data.ts"
$diagnoseDb = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\diagnose-db.ts"

if (Test-Path $diagnoseData) { Move-Item -Path $diagnoseData -Destination "$toolsDir\diagnose-data.ts" -Force }
if (Test-Path $diagnoseDb) { Move-Item -Path $diagnoseDb -Destination "$toolsDir\diagnose-db.ts" -Force }

# 2. Move audit logs script to scripts
$scriptsDir = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\scripts"
$auditLogScript = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\fix_audit_logs.py"

if (Test-Path $auditLogScript) { Move-Item -Path $auditLogScript -Destination "$scriptsDir\fix_audit_logs.py" -Force }

# 3. Move large XLSX to archives
$dataArchiveDir = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\archives\data"
if (!(Test-Path $dataArchiveDir)) { New-Item -ItemType Directory -Path $dataArchiveDir }

$xlsxFile = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\LT-L-TRIO-LGO-RD-A4-0044-0A-13.05.24.xlsx"
if (Test-Path $xlsxFile) { Move-Item -Path $xlsxFile -Destination "$dataArchiveDir\LT-L-TRIO-LGO-RD-A4-0044-0A-13.05.24.xlsx" -Force }

Write-Host "Files reorganized successfully." -ForegroundColor Green

# 4. Start Docker Compose
Write-Host "Starting Docker Compose (Database)..." -ForegroundColor Cyan
& 'C:\Program Files\Docker\Docker\resources\bin\docker.EXE' compose -f 'c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\docker-compose.yml' up -d --build

Write-Host "Faxina complete!" -ForegroundColor Green
