# Restore Database Script
# Usage: .\backend\prisma\scripts\restore-db.ps1 <backup_file_path>

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (!(Test-Path $BackupFile)) {
    Write-Host "Arquivo de backup não encontrado: $BackupFile" -ForegroundColor Red
    exit
}

Write-Host "Iniciando restauração do banco de dados 'gestao' a partir de $BackupFile..." -ForegroundColor Cyan

# 1. Parar serviços que podem estar usando o banco (opcional, mas recomendado)
# 2. Dropar e Recriar o banco ou apenas limpar? O mais seguro é psql simples se for dump total
# Vamos usar o cat e pipe para o docker exec psql

cat $BackupFile | docker exec -i gestao psql -U docker -d gestao

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restauração concluída com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro ao realizar restauração." -ForegroundColor Red
}
