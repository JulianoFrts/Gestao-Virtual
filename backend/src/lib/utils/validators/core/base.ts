import { z } from "zod";
import { CONSTANTS } from "@/lib/constants";

// ======================================================
// HELPERS DE NORMALIZAÇÃO
// ======================================================

export const emptyToUndefined = (input: unknown) =>
  input === "" || input === null || input === "null" || input === "undefined"
    ? undefined
    : input;

export const emptyToNull = (input: unknown) => (input === "" ? null : input);

export const stripOperator = (input: unknown) => {
  if (typeof input === "string" && input.includes(".")) {
    const parts = input.split(".");
    const operators = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "in", "cs"];
    if (operators.includes(parts[0])) {
      return parts.slice(1).join(".");
    }
  }
  return emptyToUndefined(input);
};

// ======================================================
// VALIDADORES ATÔMICOS
// ======================================================

export const emailSchema = z
  .string()
  .email("Email inválido")
  .min(CONSTANTS.VALIDATION.STRING.MIN_EMAIL)
  .max(CONSTANTS.VALIDATION.STRING.MAX_NAME)
  .transform((v) => v.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(CONSTANTS.AUTH.PASSWORD.MIN_LENGTH)
  .max(CONSTANTS.AUTH.PASSWORD.MAX_LENGTH);

export const simplePasswordSchema = z.string().min(1);

export const nameSchema = z
  .string()
  .min(CONSTANTS.VALIDATION.STRING.MIN_NAME)
  .max(CONSTANTS.VALIDATION.STRING.MAX_NAME)
  .transform((v) => v.trim());

export const cuidSchema = z.string().regex(/^c[a-z0-9]{19,29}$/, "ID inválido");

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

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido");
