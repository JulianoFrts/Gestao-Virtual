import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados para o cliente Admin.");
}

/**
 * Cliente Supabase com privilégios de Service Role (Admin).
 * USE COM CAUTELA: Este cliente ignora as regras de RLS (Row Level Security).
 */
export const supabaseAdmin = createClient(
    supabaseUrl || "",
    supabaseServiceKey || "",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
