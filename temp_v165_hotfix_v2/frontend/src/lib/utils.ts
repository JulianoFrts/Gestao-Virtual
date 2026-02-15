import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}


export function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function safeDate(date: string | number | Date | null | undefined): Date | null {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Formata um nome completo para conformidade com LGPD (ex: Juliano Freitas -> Juliano F.)
 */
export function formatNameForLGPD(fullName: string | undefined): string {
    if (!fullName) return "Colaborador";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return fullName;
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName} ${lastName.charAt(0)}.`;
}
