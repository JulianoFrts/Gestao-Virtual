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
    
    // Se for string YYYY-MM-DD (e.g., vindo da API do Supabase), parse para local time,
    // pois 'new Date("2026-02-20")' é UTC midnight e vira 2026-02-19 em fusos negativos
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

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
