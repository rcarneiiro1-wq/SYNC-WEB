"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase do NAVEGADOR - usado só pra subir arquivo grande direto
 * pro Storage via link assinado (`uploadToSignedUrl`), nunca pra ler/
 * escrever tabela direto daqui (RLS do site não foi desenhada pra isso).
 *
 * Por quê isso existe (12/11): toda Server Action do Next vira uma Vercel
 * Function por baixo - e a Vercel trava QUALQUER corpo de requisição em
 * 4.5MB (erro 413 `FUNCTION_PAYLOAD_TOO_LARGE`), não dá pra configurar
 * isso mais alto (nem o `experimental.serverActions.bodySizeLimit` do
 * Next ajuda, porque o limite da Vercel vem antes). Mandar o PDF/arquivo
 * dentro de um FormData pra uma Server Action (jeito antigo) sempre ia
 * falhar pra qualquer arquivo de verdade acima de uns 4MB - era
 * exatamente o caso dos PDFs de MD/GM escaneados. O fix: a Server Action
 * só gera um link assinado (sem o arquivo, só metadado - isso sim cabe
 * tranquilo no limite da Vercel), e o navegador sobe o arquivo DIRETO pro
 * Supabase Storage usando esse link, sem passar pela function.
 *
 * A chave aqui é a publishable/anon key - a MESMA que o desktop já usa
 * (core/supabase_config.py) e que o projeto já trata como não-secreta de
 * propósito. Ela só serve pra identificar o projeto (header `apikey`
 * exigido pelo gateway do Supabase) - quem de fato autoriza o upload é o
 * TOKEN assinado, gerado no servidor só depois de conferir sessão/
 * permissão. Sem essa chave configurada (`NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * nas variáveis de ambiente da Vercel), o upload direto não funciona.
 */
let clienteCache: SupabaseClient | null = null;

export function clienteNavegador(): SupabaseClient {
  if (clienteCache) return clienteCache;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error(
      "Falta configurar NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente (Vercel > Settings) - sem ela o upload direto pro Storage não funciona."
    );
  }

  clienteCache = createClient(url, chave, { auth: { persistSession: false } });
  return clienteCache;
}
