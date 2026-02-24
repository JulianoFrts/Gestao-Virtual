/**
 * Input Validators & Masks
 * 
 * Validações e máscaras centralizadas para campos de input.
 * Uso: import { maskPhone, validateCPF } from '@/utils/inputValidators';
 */

// ============================================================
// TIPOS
// ============================================================

export interface ValidationResult {
    isValid: boolean;
    message: string;
}

export interface PasswordOptions {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecialChar?: boolean;
}

// ============================================================
// MÁSCARAS DE FORMATAÇÃO
// ============================================================

/**
 * Máscara para CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Máscara para CNPJ: 00.000.000/0000-00
 */
export function maskCNPJ(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Máscara para Telefone Brasileiro: (00) 00000-0000 ou (00) 0000-0000
 */
export function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 10) {
        // Telefone fixo: (00) 0000-0000
        return digits
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    // Celular: (00) 00000-0000
    return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/**
 * Máscara para CEP: 00000-000
 */
export function maskCEP(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/**
 * Máscara para Data: DD/MM/YYYY
 */
export function maskDate(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2');
}

/**
 * Máscara para Matrícula: Alfanumérico com hífen
 */
export function maskRegistrationNumber(value: string): string {
    // Remove caracteres especiais exceto números, letras e hífen
    return value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 20);
}

/**
 * Máscara para Moeda BRL: R$ 0.000,00
 */
export function maskCurrency(value: string): string {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits || '0', 10) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Máscara para Números Genéricos: 1.000.000
 */
export function maskNumber(value: string | number): string {
    if (value === undefined || value === null || value === '') return '';
    const val = typeof value === 'number' ? value.toString() : value;
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('pt-BR');
}

// ============================================================
// REMOÇÃO DE MÁSCARAS
// ============================================================

/**
 * Remove máscara do CPF, retornando apenas dígitos
 */
export function unmaskCPF(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Remove máscara do CNPJ, retornando apenas dígitos
 */
export function unmaskCNPJ(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Remove máscara do telefone, retornando apenas dígitos
 */
export function unmaskPhone(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Remove máscara genérica (apenas dígitos)
 */
export function unmaskDigits(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Converte string formatada (R$ 1.234,56) em número (1234.56)
 */
export function parseCurrency(value: string): number {
    const digits = value.replace(/\D/g, '');
    return parseInt(digits || '0', 10) / 100;
}

/**
 * Converte string formatada (1.234) em número (1234)
 */
export function parseNumber(value: string): number {
    const digits = value.replace(/\D/g, '');
    return parseInt(digits || '0', 10);
}

// ============================================================
// VALIDAÇÕES
// ============================================================

/**
 * Valida CPF com dígitos verificadores
 */
export function isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');

    if (digits.length !== 11) return false;

    // Verifica se todos os dígitos são iguais (inválido)
    if (/^(\d)\1{10}$/.test(digits)) return false;

    // Cálculo do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(digits[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[9])) return false;

    // Cálculo do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(digits[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[10])) return false;

    return true;
}

/**
 * Valida CNPJ com dígitos verificadores
 */
export function isValidCNPJ(cnpj: string): boolean {
    const digits = cnpj.replace(/\D/g, '');

    if (digits.length !== 14) return false;

    // Verifica se todos os dígitos são iguais (inválido)
    if (/^(\d)\1{13}$/.test(digits)) return false;

    // Cálculo do primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(digits[i]) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(digits[12])) return false;

    // Cálculo do segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
        sum += parseInt(digits[i]) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(digits[13])) return false;

    return true;
}

/**
 * Valida Email (RFC 5322 simplificado)
 */
export function isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida Telefone Brasileiro (10 ou 11 dígitos)
 */
export function isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
}

/**
 * Valida Senha com opções configuráveis
 */
export function isValidPassword(password: string, options: PasswordOptions = {}): boolean {
    const {
        minLength = 6,
        requireUppercase = false,
        requireLowercase = false,
        requireNumber = false,
        requireSpecialChar = false
    } = options;

    if (password.length < minLength) return false;
    if (requireUppercase && !/[A-Z]/.test(password)) return false;
    if (requireLowercase && !/[a-z]/.test(password)) return false;
    if (requireNumber && !/\d/.test(password)) return false;
    if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

    return true;
}

/**
 * Valida Nome (mínimo 2 caracteres, sem números)
 */
export function isValidName(name: string): boolean {
    const trimmed = name.trim();
    return trimmed.length >= 2 && !/\d/.test(trimmed);
}

/**
 * Valida Latitude (-90 a 90)
 */
export function isValidLatitude(lat: number): boolean {
    return !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Valida Longitude (-180 a 180)
 */
export function isValidLongitude(lng: number): boolean {
    return !isNaN(lng) && lng >= -180 && lng <= 180;
}

// ============================================================
// VALIDAÇÕES COM MENSAGEM DE ERRO
// ============================================================

export function validateCPF(cpf: string): ValidationResult {
    const digits = cpf.replace(/\D/g, '');

    if (digits.length === 0) {
        return { isValid: false, message: 'CPF é obrigatório' };
    }
    if (digits.length !== 11) {
        return { isValid: false, message: 'CPF deve ter 11 dígitos' };
    }
    if (!isValidCPF(cpf)) {
        return { isValid: false, message: 'CPF inválido' };
    }
    return { isValid: true, message: '' };
}

export function validateCNPJ(cnpj: string): ValidationResult {
    const digits = cnpj.replace(/\D/g, '');

    if (digits.length === 0) {
        return { isValid: false, message: 'CNPJ é obrigatório' };
    }
    if (digits.length !== 14) {
        return { isValid: false, message: 'CNPJ deve ter 14 dígitos' };
    }
    if (!isValidCNPJ(cnpj)) {
        return { isValid: false, message: 'CNPJ inválido' };
    }
    return { isValid: true, message: '' };
}

export function validateEmail(email: string): ValidationResult {
    if (!email || email.trim() === '') {
        return { isValid: false, message: 'Email é obrigatório' };
    }
    if (!isValidEmail(email)) {
        return { isValid: false, message: 'Formato de email inválido' };
    }
    return { isValid: true, message: '' };
}

export function validatePhone(phone: string): ValidationResult {
    const digits = phone.replace(/\D/g, '');

    if (digits.length === 0) {
        return { isValid: true, message: '' }; // Telefone é opcional
    }
    if (!isValidPhone(phone)) {
        return { isValid: false, message: 'Telefone deve ter 10 ou 11 dígitos' };
    }
    return { isValid: true, message: '' };
}

export function validatePassword(password: string, options?: PasswordOptions): ValidationResult {
    const minLength = options?.minLength || 6;

    if (!password) {
        return { isValid: false, message: 'Senha é obrigatória' };
    }
    if (password.length < minLength) {
        return { isValid: false, message: `Senha deve ter pelo menos ${minLength} caracteres` };
    }
    if (options?.requireUppercase && !/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Senha deve conter letra maiúscula' };
    }
    if (options?.requireNumber && !/\d/.test(password)) {
        return { isValid: false, message: 'Senha deve conter número' };
    }
    if (options?.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: 'Senha deve conter caractere especial' };
    }
    return { isValid: true, message: '' };
}

export function validateName(name: string): ValidationResult {
    if (!name || name.trim() === '') {
        return { isValid: false, message: 'Nome é obrigatório' };
    }
    if (name.trim().length < 2) {
        return { isValid: false, message: 'Nome deve ter pelo menos 2 caracteres' };
    }
    if (/\d/.test(name)) {
        return { isValid: false, message: 'Nome não pode conter números' };
    }
    return { isValid: true, message: '' };
}

// ============================================================
// HANDLER GENÉRICO PARA INPUTS
// ============================================================

export type InputType = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'date' | 'currency' | 'number' | 'registration' | 'text' | 'email' | 'password';

/**
 * Aplica máscara automaticamente baseado no tipo
 */
export function applyMask(value: string, type: InputType): string {
    switch (type) {
        case 'cpf': return maskCPF(value);
        case 'cnpj': return maskCNPJ(value);
        case 'phone': return maskPhone(value);
        case 'cep': return maskCEP(value);
        case 'date': return maskDate(value);
        case 'currency': return maskCurrency(value);
        case 'number': return maskNumber(value);
        case 'registration': return maskRegistrationNumber(value);
        default: return value;
    }
}

/**
 * Valida automaticamente baseado no tipo
 */
export function validateInput(value: string, type: InputType): ValidationResult {
    switch (type) {
        case 'cpf': return validateCPF(value);
        case 'cnpj': return validateCNPJ(value);
        case 'phone': return validatePhone(value);
        case 'email': return validateEmail(value);
        case 'password': return validatePassword(value);
        default: return { isValid: true, message: '' };
    }
}
