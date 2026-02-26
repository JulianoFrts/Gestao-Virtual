import { z } from "zod";
import { emailSchema, passwordSchema, simplePasswordSchema, nameSchema } from "./base";

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
