# ==================================================
# Dockerfile - GESTÃO VIRTUAL Front-End
# ==================================================

# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências com legacy-peer-deps para compatibilidade
RUN npm install --legacy-peer-deps

# Copiar código fonte
COPY . .

# Build da aplicação
ENV VITE_DB_MODE=local
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS runner

# Copiar arquivos do build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx (opcional, mas recomendado para SPAs)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
