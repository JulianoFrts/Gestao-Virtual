/**
 * JWT Utility - GESTÃO VIRTUAL Backend
 */

import { SignJWT } from "jose";
import { logger } from "@/lib/utils/logger";

const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1d";

/**
 * Gera um token JWT para um usuário
 */
export async function generateToken(payload: {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  companyId?: string | null;
  projectId?: string | null;
}) {
  if (!jwtSecret) {
    logger.error("JWT_SECRET não configurada");
    throw new Error("Configuração de segurança pendente no servidor");
  }

  const secret = new TextEncoder().encode(jwtSecret);

  return await new SignJWT({
    sub: payload.id, // Subject (reclamado por getCurrentSession)
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: payload.status,
    companyId: payload.companyId,
    projectId: payload.projectId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(jwtExpiresIn)
    .sign(secret);
}
