import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Erro de propósito bem claro, pra não ficar tentando adivinhar por que
  // a página veio em branco - falta configurar as variáveis de ambiente
  // no Vercel (Settings > Environment Variables).
  throw new Error(
    "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Configura elas no .env.local (local) ou no Vercel (produção)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
