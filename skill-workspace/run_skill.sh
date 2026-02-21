#!/usr/bin/env bash
set -euo pipefail

# Carregar .env se existir
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "Iniciando Skill Runner..."
node skill-runner.js
