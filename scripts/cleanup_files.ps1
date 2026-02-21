# Cleanup Workspace Files
# Purpose: Reorganize root directory according to project standards

Write-Host "Starting Workspace Cleanup..." -ForegroundColor Cyan

# 1. Move diagnose scripts to tools
$toolsDir = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\tools"
if (!(Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir }

$diagnoseData = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\diagnose-data.ts"
$diagnoseDb = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\diagnose-db.ts"

if (Test-Path $diagnoseData) { Move-Item -Path $diagnoseData -Destination "$toolsDir\diagnose-data.ts" -Force; Write-Host "Moved diagnose-data.ts" }
if (Test-Path $diagnoseDb) { Move-Item -Path $diagnoseDb -Destination "$toolsDir\diagnose-db.ts" -Force; Write-Host "Moved diagnose-db.ts" }

# 2. Move audit logs script to scripts
$scriptsDir = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\scripts"
$auditLogScript = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\fix_audit_logs.py"

if (Test-Path $auditLogScript) { Move-Item -Path $auditLogScript -Destination "$scriptsDir\fix_audit_logs.py" -Force; Write-Host "Moved fix_audit_logs.py" }

# 3. Move large XLSX to archives
$dataArchiveDir = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\archives\data"
if (!(Test-Path $dataArchiveDir)) { New-Item -ItemType Directory -Path $dataArchiveDir }

$xlsxFile = "c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\LT-L-TRIO-LGO-RD-A4-0044-0A-13.05.24.xlsx"
if (Test-Path $xlsxFile) { Move-Item -Path $xlsxFile -Destination "$dataArchiveDir\LT-L-TRIO-LGO-RD-A4-0044-0A-13.05.24.xlsx" -Force; Write-Host "Moved data file to archives" }

Write-Host "Cleanup complete!" -ForegroundColor Green
