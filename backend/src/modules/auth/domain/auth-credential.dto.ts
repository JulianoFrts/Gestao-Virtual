export interface AuthCredential {
  id: string;
  email: string;
  login?: string | null;
  password?: string | null;
  userId: string;
  mfaEnabled: boolean;
  mfaSecret?: string | null;
  status: string;
  systemUse: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: Record<string, unknown>; // To be typed properly with User entity later
}

export interface CreateAuthCredentialDTO {
  email: string;
  login?: string;
  password?: string;
  userId: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  status?: string;
  systemUse?: boolean;
}

export interface UpdateAuthCredentialDTO {
  email?: string;
  login?: string;
  password?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  status?: string;
  systemUse?: boolean;
}
