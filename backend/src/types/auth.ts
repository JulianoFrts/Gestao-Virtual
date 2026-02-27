/**
 * Types de Autenticação - GESTÃO VIRTUAL Backend
 *
 * Extensão dos tipos do NextAuth para incluir campos customizados
 */

import type { Role, AccountStatus } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// =============================================
// EXTENSÕES DO NEXT-AUTH
// =============================================

declare module "next-auth" {
  /**
   * Sessão extendida com campos do usuário
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      status: AccountStatus;
      image?: string | null;
      companyId?: string | null;
      projectId?: string | null;
      siteId?: string | null;
      hierarchyLevel?: number | null;
      permissions?: Record<string, boolean> | null;
    };
  }

  /**
   * Usuário extendido com campos adicionais
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    status: AccountStatus;
    companyId?: string | null;
    projectId?: string | null;
    siteId?: string | null;
    hierarchyLevel?: number | null;
    permissions?: Record<string, boolean> | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT extendido com campos do usuário
   */
  interface JWT {
    id: string;
    email: string;
    role: Role;
    status: AccountStatus;
  }
}

// =============================================
// TIPOS DE CREDENCIAIS
// =============================================

/**
 * Credenciais de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Dados de registro
 */
export interface RegisterData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

/**
 * Dados de reset de senha
 */
export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Dados de verificação de email
 */
export interface VerifyEmailData {
  token: string;
}

// =============================================
// TIPOS DE RESPOSTA
// =============================================

/**
 * Resposta de autenticação com sucesso
 */
export interface AuthSuccessResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
  accessToken?: string;
  expiresAt?: string;
}

/**
 * Informações de sessão ativa
 */
export interface ActiveSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expires: Date;
  current: boolean;
}
