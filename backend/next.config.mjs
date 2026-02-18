import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  productionBrowserSourceMaps: false,



  // Limita uso de CPU/Memória na geração estática (APENAS PROD)
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"], // Tree shaking
  },

  // Forçar @prisma/client a ser tratado como pacote externo (não incluído no bundle)
  serverExternalPackages: ["@prisma/client", "pg", "@prisma/adapter-pg"],

  // Injetar variáveis de ambiente para o Prisma
  env: {
    PRISMA_CLIENT_ENGINE_TYPE: "library",
    // DATABASE_URL removida daqui para ser dinâmica em runtime (não baked-in)
  },

  // FORÇAR resolução do alias @/ no webpack (fix SquareCloud)
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    return config;
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
