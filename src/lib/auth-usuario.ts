/**
 * Sessão de login POR PESSOA - reaproveita os mesmos usuário/senha já
 * cadastrados no desktop (tabela "usuarios" do Supabase), em vez de uma
 * senha única compartilhada.
 *
 * Usa só Web Crypto (crypto.subtle) porque esse arquivo é importado
 * tanto pelo proxy.ts (middleware, roda no Edge Runtime - não tem o
 * módulo "crypto" completo do Node) quanto pela Server Action de login
 * (roda em Node normal) - assim funciona igual nos dois lugares.
 */

const NOME_COOKIE_USUARIO = "sync_usuario";

export type SessaoUsuario = {
  usuario: string;
  nome: string;
  ehAdmin: boolean;
  funcao?: string;
};

/** A chave de assinatura é a própria service_role key - já é um segredo
 * forte, guardado só no servidor, não precisa inventar outro. */
function chaveDeAssinatura(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

async function assinar(mensagem: string): Promise<string> {
  const chaveCripto = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(chaveDeAssinatura()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chaveCripto, new TextEncoder().encode(mensagem));
  return Array.from(new Uint8Array(assinatura)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function paraBase64Url(texto: string): string {
  return Buffer.from(texto, "utf-8").toString("base64url");
}

function deBase64Url(texto: string): string {
  return Buffer.from(texto, "base64url").toString("utf-8");
}

/** Monta o valor do cookie: payload (usuário/nome/admin) + assinatura,
 * pra ninguém conseguir forjar "sou admin" só editando o cookie na mão -
 * sem saber a service_role key, a assinatura nunca vai bater. */
export async function criarCookieSessao(sessao: SessaoUsuario): Promise<string> {
  const payload = paraBase64Url(JSON.stringify(sessao));
  const assinatura = await assinar(payload);
  return `${payload}.${assinatura}`;
}

/** Confere a assinatura e devolve os dados da sessão - null se o cookie
 * não existir, estiver malformado, ou a assinatura não bater (adulterado
 * ou de uma versão antiga com outra chave). */
export async function validarCookieSessao(valorCookie: string | undefined): Promise<SessaoUsuario | null> {
  if (!valorCookie) return null;
  const [payload, assinatura] = valorCookie.split(".");
  if (!payload || !assinatura) return null;
  const assinaturaEsperada = await assinar(payload);
  if (assinatura !== assinaturaEsperada) return null;
  try {
    return JSON.parse(deBase64Url(payload)) as SessaoUsuario;
  } catch {
    return null;
  }
}

export { NOME_COOKIE_USUARIO };
