import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente admin - usa a service_role key, que IGNORA todas as políticas
 * de segurança do banco (RLS). Só existe pra checar login (ler a tabela
 * "usuarios", que não é mais de leitura pública). O "server-only" no
 * topo garante que, se alguém sem querer importar esse arquivo de um
 * componente client, o build já quebra avisando - essa chave nunca pode
 * chegar no navegador.
 */
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente (Vercel > Settings).");
  }
  return createClient(url, chave, { auth: { persistSession: false } });
}
