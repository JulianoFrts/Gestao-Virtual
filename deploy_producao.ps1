# Deploy Script para Gestão Virtual
# Executa build e sobe containers em produção

Write-Host "🚀 Iniciando Deploy do Gestão Virtual..." -ForegroundColor Cyan

# 1. Verificar Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker não encontrado! Instale o Docker Desktop." -ForegroundColor Red
    exit 1
}

# 2. Verificar .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Arquivo .env não encontrado na raiz!" -ForegroundColor Yellow
    Write-Host "   Criando um arquivo .env de exemplo..."
    
    $envContent = @"
POSTGRES_USER=orion
POSTGRES_PASSWORD=OrionPass123
POSTGRES_DB=orion_db
DATABASE_URL=postgresql://orion:OrionPass123@db:5432/orion_db
# EM PRODUÇÃO COM DOCKER ISOLADO: Front acessa Back via 'backend:3000' interno, mas NextAuth precisa saber da URL pública
NEXTAUTH_URL=http://localhost:5173
NEXTAUTH_SECRET=changeme_in_production
JWT_SECRET=changeme_in_production
NODE_ENV=production
"@
    Set-Content -Path ".env" -Value $envContent
    Write-Host "✅ Arquivo .env criado. EDITE-O COM SUAS SENHAS SEGURAS!" -ForegroundColor Yellow
    
    # Pausa para o usuário editar se quiser
    Read-Host "Pressione ENTER para continuar o deploy (ou Ctrl+C para editar o .env primeiro)"
}

# 3. Derrubar versão anterior
Write-Host "⬇️ Parando containers antigos..." -ForegroundColor Cyan
docker-compose down

# 4. Construir e Subir
Write-Host "🏗️ Construindo e iniciando containers (isso pode demorar)..." -ForegroundColor Cyan
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha no docker-compose up." -ForegroundColor Red
    exit 1
}

# 5. Aguardar Banco de Dados
Write-Host "⏳ Aguardando banco de dados inicializar..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# 6. Migrations
Write-Host "🔄 Executando migrações do banco..." -ForegroundColor Cyan
docker-compose exec -T backend npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Falha nas migrações. Verifique os logs." -ForegroundColor Yellow
} else {
    Write-Host "✅ Migrações aplicadas!" -ForegroundColor Green
}

# 7. Seed (Opcional - perguntar?)
# Por padrão, vamos pular ou rodar apenas seed de permissões essenciais se necessário.
# docker-compose exec -T backend npm run seed:matrix

Write-Host "✅ Deploy Concluído!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:5173"
Write-Host "   Backend:  http://localhost:3000"
Write-Host "   Obs: Para ver logs, use: docker-compose logs -f"
