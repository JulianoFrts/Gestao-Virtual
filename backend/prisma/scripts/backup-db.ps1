# Backup Database Script
# Usage: .\backend\prisma\scripts\backup-db.ps1

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $PSScriptRoot "..\backups"
$BackupFile = Join-Path $BackupDir "gestao_backup_$Timestamp.sql"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir
}

Write-Host "Iniciando backup do banco de dados 'gestao'..." -ForegroundColor Cyan

# Executar pg_dump dentro do container
docker exec gestao pg_dump -U docker -d gestao > $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup concluído com sucesso: $BackupFile" -ForegroundColor Green
} else {
    Write-Host "Erro ao realizar backup." -ForegroundColor Red
}
