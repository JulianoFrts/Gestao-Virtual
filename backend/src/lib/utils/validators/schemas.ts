/**
 * Schemas de Validação Zod - GESTÃO VIRTUAL Backend
 *
 * Validação de entrada para todas as operações da API
 */

import { z } from "zod";
import { ROLE_LEVELS } from "@/lib/constants";
import { refine } from "zod/v4";

// ======================================================
// HELPERS DE NORMALIZAÇÃO
// ======================================================

// Helper para tratar parâmetros de busca opcionais que podem vir como string "null" ou "undefined" do URL
export const emptyToUndefined = (val: unknown) =>
  val === "" || val === null || val === "null" || val === "undefined"
    ? undefined
    : val;

const emptyToNull = (val: unknown) => (val === "" ? null : val);

/**
 * Remove prefixos de operadores comuns em APIs REST (ex: eq.123 -> 123)
 */
export const stripOperator = (val: unknown) => {
  if (typeof val === "string" && val.includes(".")) {
    const parts = val.split(".");
    // Se começar com eq, gte, lte, cs, etc, removemos o prefixo
    const operators = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "in", "cs"];
    if (operators.includes(parts[0])) {
      return parts.slice(1).join(".");
    }
  }
  return emptyToUndefined(val);
};

// ======================================================
// VALIDADORES REUTILIZÁVEIS
// ======================================================

/**
 * Email
 */
export const emailSchema = z
  .string()
  .email("Email inválido")
  .min(5)
  .max(255)
  .transform((v) => v.toLowerCase().trim());

/**
 * Senha forte
 */
export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(128);

/**
 * Senha simples (login)
 */
export const simplePasswordSchema = z.string().min(1);

/**
 * Nome
 */
export const nameSchema = z
  .string()
  .min(2, "Nome deve ter no mínimo 2 caracteres")
  .max(32, "Nome deve ter no máximo 32 caracteres")
  .transform((v) => v.trim());

/**
 * CUID
 */
export const cuidSchema = z.string().regex(/^c[a-z0-9]{19,29}$/, "ID inválido");

/**
 * CPF
 */
function validateCPFDigits(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +cpf[i] * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== +cpf[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += +cpf[i] * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === +cpf[10];
}

export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "CPF deve ter 11 dígitos")
  .refine(validateCPFDigits, "CPF inválido");


/**
 * CNPJ
 */
function validateCNPJDigits(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + +base[i] * w, 0) % 11;

  const d1 = calc(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if ((d1 < 2 ? 0 : 11 - d1) !== +cnpj[12]) return false;

  const d2 = calc(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return (d2 < 2 ? 0 : 11 - d2) === +cnpj[13];
}

export const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos")
  .refine(validateCNPJDigits, "CNPJ inválido");

/**
 * Telefone BR
 */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido");

// ======================================================
// ENUMS
// ======================================================

export const roleSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => Object.keys(ROLE_LEVELS).includes(v), {
    message: "Role inválida",
  })
  .transform((v) => v.toUpperCase()); // Return uppercase for database consistency

export const accountStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PENDING_VERIFICATION",
]);

// ======================================================
// AUTH
// ======================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
});

export const registerSchema = z
  .object({
    email: emailSchema,
    name: nameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Senhas não conferem",
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Senhas não conferem",
  });

// ======================================================
// USUÁRIO
// ======================================================

export const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  password: passwordSchema,
  role: roleSchema.optional().default("USER"),
  companyId: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  registrationNumber: z
    .preprocess(emptyToNull, z.string().max(50).nullable())
    .optional(),
  cpf: z.preprocess(emptyToNull, cpfSchema.optional().nullable()),
  phone: z.preprocess(emptyToNull, phoneSchema.optional().nullable()),
  functionId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
  hierarchyLevel: z.coerce.number().int().min(0).default(0),
  laborType: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  iapName: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  // Endereço
  zipCode: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
});

export const updateUserSchema = z
  .object({
    id: cuidSchema.optional(),
    email: emailSchema.optional(),
    name: nameSchema.optional(),
    fullName: nameSchema.optional(), // Alias para compatibilidade
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
    status: accountStatusSchema.optional(),
    companyId: z.preprocess(emptyToNull, z.string().optional().nullable()),
    registrationNumber: z.preprocess(
      emptyToNull,
      z.string().optional().nullable(),
    ),
    cpf: z.preprocess(emptyToNull, cpfSchema.optional().nullable()),
    phone: z.preprocess(emptyToNull, phoneSchema.optional().nullable()),
    functionId: z.preprocess(emptyToNull, z.string().optional().nullable()),
    projectId: z.preprocess(emptyToNull, z.string().optional().nullable()),
    siteId: z.string().optional().nullable(),
    hierarchyLevel: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).optional(),
    ),
    laborType: z.string().optional().nullable(),
    mfa_enabled: z.boolean().optional(),
    mfa_secret: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
    iapName: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    // Endereço
    zipCode: z.string().optional().nullable(),
    street: z.string().optional().nullable(),
    number: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Pelo menos um campo deve ser fornecido",
  });

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional().nullable(),
  image: z.string().optional().nullable(),
});

// ======================================================
// PAGINAÇÃO & FILTROS
// ======================================================

export const paginationSchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100000).default(10),
  ),
  sortBy: z.preprocess(emptyToUndefined, z.string().optional()),
  sortOrder: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("asc"),
  ),
});

export const userFiltersSchema = z.object({
  id: z.preprocess(stripOperator, z.string().optional()),
  search: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  role: z.preprocess(emptyToUndefined, roleSchema.optional()),
  status: z.preprocess(emptyToUndefined, accountStatusSchema.optional()),
  emailVerified: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  createdAfter: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  createdBefore: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  projectId: z.preprocess(stripOperator, z.string().optional()),
  siteId: z.preprocess(stripOperator, z.string().optional()),
  companyId: z.preprocess(stripOperator, z.string().optional()),
  onlyCorporate: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().optional(),
  ),
  excludeCorporate: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().optional(),
  ),
});

// ======================================================
// TIPOS INFERIDOS
// ======================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

// ======================================================
// HELPERS DE VALIDAÇÃO
// ======================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map((e) =>
      e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message,
    ),
  };
}

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
