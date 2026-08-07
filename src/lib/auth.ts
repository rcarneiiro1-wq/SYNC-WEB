/**
 * Proteção simples por senha - pensada pra um teste interno, não pra
 * dado super sensível. Se isso virar produção de verdade com mais gente
 * usando, vale trocar por um login de verdade (ex: Supabase Auth).
 *
 * A proteção é OPCIONAL: se a variável SITE_PASSWORD estiver vazia (ou
 * não configurada) no Vercel, o site fica aberto pra qualquer um com o
 * link - útil numa fase de "deixa a galera só dar uma olhada". Pra
 * travar de novo, é só preencher SITE_PASSWORD nas variáveis de
 * ambiente do Vercel e fazer um novo deploy - sem mexer em código.
 *
 * Usa Web Crypto (funciona tanto no middleware, que roda no Edge
 * Runtime, quanto nas Server Actions) - por isso não usa o módulo
 * "crypto" do Node direto.
 */

const NOME_COOKIE = "sync_sessao";
const SAL = "sync-erp-embarque-v1"; // só pra não gravar a senha crua em lugar nenhum

async function hash(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** true se SITE_PASSWORD estiver configurada (com algum valor não-vazio) -
 * quando false, o site fica livre, sem pedir senha nenhuma. */
export function protecaoAtiva(): boolean {
  return Boolean(process.env.SITE_PASSWORD && process.env.SITE_PASSWORD.trim());
}

export async function valorEsperadoDoCookie(): Promise<string> {
  const senha = process.env.SITE_PASSWORD || "";
  return hash(senha + SAL);
}

export async function senhaEstaCorreta(tentativa: string): Promise<boolean> {
  const senha = process.env.SITE_PASSWORD;
  if (!senha) return false;
  return tentativa === senha;
}

export { NOME_COOKIE };
