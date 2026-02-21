# Start Docker Database
# Purpose: Launches the local PostgreSQL container

Write-Host "Starting Docker Compose (Database)..." -ForegroundColor Cyan

& 'C:\Program Files\Docker\Docker\resources\bin\docker.EXE' compose -f 'c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\docker-compose.yml' up -d --build

Write-Host "Database is starting up!" -ForegroundColor Green
