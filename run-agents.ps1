# Run Agent Orchestrator from Root
# Purpose: Convenient shortcut to run the agent pipeline

Write-Host "Iniciando Orquestrador de Agentes..." -ForegroundColor Cyan

# Verifica se a pasta existe
if (Test-Path "skill-workspace") {
    node skill-workspace/skill-runner.js
} else {
    Write-Host "Erro: Pasta skill-workspace não encontrada!" -ForegroundColor Red
}
