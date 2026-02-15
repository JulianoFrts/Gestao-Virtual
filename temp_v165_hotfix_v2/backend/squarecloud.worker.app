DISPLAY_NAME=Orion Worker
DESCRIPTION=Processamento em Segundo Plano (Importações/Auditoria)
MAIN=worker.ts
MEMORY=512
VERSION=recommended
START=npx tsx worker.ts
AUTORESTART=true
