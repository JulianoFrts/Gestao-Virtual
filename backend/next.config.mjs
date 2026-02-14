/** @type {import('next').NextConfig} **/
const nextConfig = {
  // Habilitar output standalone para Docker
  output: "standalone",

  // Habilitar strict mode do React
  reactStrictMode: false,

  // Desabilitar powered by header por segurança
  poweredByHeader: true,

  // OTIMIZAÇÃO PARA BAIXA MEMÓRIA (SquareCloud 1GB):
  // 1. Ignora verificação de tipos e lint (já configurado).
  // 2. Desabilita geração estática paralela e source maps.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  productionBrowserSourceMaps: false,
  
  // Limita uso de CPU/Memória na geração estática
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  // Forçar @prisma/client a ser tratado como pacote externo (não incluído no bundle)
  serverExternalPackages: ["@prisma/client"],

  // Injetar variáveis de ambiente para o Prisma
  env: {
    PRISMA_CLIENT_ENGINE_TYPE: "library",
    // DATABASE_URL removida daqui para ser dinâmica em runtime (não baked-in)
  },

  // Headers de segurança adicionais
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
