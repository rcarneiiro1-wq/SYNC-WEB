"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { verificarSenha } from "@/lib/senha";
import { criarCookieSessao, NOME_COOKIE_USUARIO } from "@/lib/auth-usuario";

export async function entrar(formData: FormData) {
  const usuario = String(formData.get("usuario") || "").trim();
  const senha = String(formData.get("senha") || "");
  const proximo = String(formData.get("proximo") || "/");

  if (!usuario || !senha) {
    redirect(`/login?erro=1&proximo=${encodeURIComponent(proximo)}`);
  }

  const admin = criarClienteAdmin();
  const { data: linha } = await admin
    .from("usuarios")
    .select("usuario, nome, senha_hash, senha_salt, eh_admin, ativo, permissoes")
    .ilike("usuario", usuario)
    .maybeSingle();

  const senhaCorreta = linha?.ativo !== false && linha
    ? verificarSenha(senha, linha.senha_hash, linha.senha_salt)
    : false;

  if (!senhaCorreta || !linha) {
    redirect(`/login?erro=1&proximo=${encodeURIComponent(proximo)}`);
  }

  // senha certa, mas isso não basta - precisa ter a permissão específica
  // de acesso web (ou ser admin, que já tem acesso a tudo). Sem essa
  // checagem, todo mundo que já tem conta no desktop entraria no site
  // sem ninguém ter liberado de propósito.
  let permissoes: string[] = [];
  try {
    permissoes = JSON.parse(linha.permissoes || "[]");
  } catch {
    permissoes = [];
  }
  const temAcessoWeb = Boolean(linha.eh_admin) || permissoes.includes("acesso_web");

  if (!temAcessoWeb) {
    redirect(`/login?erro=sem_permissao&proximo=${encodeURIComponent(proximo)}`);
  }

  const cookieValor = await criarCookieSessao({
    usuario: linha.usuario,
    nome: linha.nome,
    ehAdmin: Boolean(linha.eh_admin),
  });
  const jar = await cookies();
  jar.set(NOME_COOKIE_USUARIO, cookieValor, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias - não precisa logar de novo toda hora
    path: "/",
  });

  redirect(proximo || "/");
}
