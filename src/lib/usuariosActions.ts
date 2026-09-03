"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NOME_COOKIE_USUARIO, validarCookieSessao, type SessaoUsuario } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { gerarHashSenha } from "@/lib/senha";

export type ResultadoUsuario = { sucesso: true; usuario: string } | { sucesso: false; erro: string };

/** Confere de novo, na Server Action, que quem chama é admin - mesmo
 * padrão já usado em adminActions.ts/anexosActions.ts (a página já
 * esconde o botão de quem não é admin, mas uma Server Action pode em
 * teoria ser chamada direto). Por enquanto só admin mexe em cadastro de
 * usuário (pedido do Rafael, 03/09) - a ideia é criar uma permissão
 * própria pra isso mais pra frente e liberar pra mais gente (ex:
 * Geraldo) sem precisar ser admin completo. */
async function exigirAdmin(): Promise<SessaoUsuario> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao || !sessao.ehAdmin) {
    throw new Error("Essa ação é restrita ao administrador.");
  }
  return sessao;
}

export type DadosUsuarioForm = {
  /** login ANTES da edição - null quando é usuário novo. Existe pra
   * permitir trocar o login de alguém já cadastrado (o UPDATE localiza
   * a linha pelo login antigo e grava o novo). */
  usuarioOriginal: string | null;
  nome: string;
  funcao: string;
  usuario: string;
  /** vazio ao editar = manter a senha atual (mesma regra do desktop) */
  senha: string;
  email: string;
  telefone: string;
  empresa: string;
  permissoes: string[];
  ehAdmin: boolean;
};

/** Cria ou atualiza um usuário - mesma validação do desktop
 * (modulos/usuarios/telas.py `salvar`): nome+login obrigatórios, senha
 * obrigatória só pra usuário novo, login único (sem diferenciar
 * maiúscula/minúscula). */
export async function salvarUsuario(dados: DadosUsuarioForm): Promise<ResultadoUsuario> {
  try {
    await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }

  const nome = dados.nome.trim();
  const usuario = dados.usuario.trim();
  if (!nome || !usuario) {
    return { sucesso: false, erro: "Preenche pelo menos o nome e o usuário (login)." };
  }

  const editando = Boolean(dados.usuarioOriginal);
  if (!editando && !dados.senha) {
    return { sucesso: false, erro: "Define uma senha pro usuário novo." };
  }

  const admin = criarClienteAdmin();

  const { data: existente } = await admin.from("usuarios").select("usuario").ilike("usuario", usuario).maybeSingle();
  if (existente && existente.usuario.toLowerCase() !== (dados.usuarioOriginal || "").toLowerCase()) {
    return { sucesso: false, erro: "Já tem alguém cadastrado com esse login. Escolhe outro." };
  }

  const linha: Record<string, unknown> = {
    usuario,
    nome,
    funcao: dados.funcao.trim() || null,
    email: dados.email.trim() || null,
    telefone: dados.telefone.trim() || null,
    empresa: dados.empresa.trim() || null,
    permissoes: JSON.stringify(dados.permissoes),
    eh_admin: dados.ehAdmin,
  };
  if (dados.senha) {
    const { hash, salt } = gerarHashSenha(dados.senha);
    linha.senha_hash = hash;
    linha.senha_salt = salt;
  }

  if (editando) {
    const { error } = await admin.from("usuarios").update(linha).eq("usuario", dados.usuarioOriginal as string);
    if (error) return { sucesso: false, erro: `Não consegui salvar: ${error.message}` };
  } else {
    linha.ativo = true;
    const { error } = await admin.from("usuarios").insert(linha);
    if (error) return { sucesso: false, erro: `Não consegui criar: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  return { sucesso: true, usuario };
}

/** Ativa/desativa (login para de funcionar, mas o cadastro continua -
 * diferente de excluir, que é definitivo). Mesmo botão "Desativar/
 * Reativar usuário" do desktop. */
export async function definirAtivoUsuario(usuarioLogin: string, ativo: boolean): Promise<ResultadoUsuario> {
  try {
    await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!usuarioLogin) return { sucesso: false, erro: "Usuário não identificado." };

  const admin = criarClienteAdmin();
  const { error } = await admin.from("usuarios").update({ ativo }).eq("usuario", usuarioLogin);
  if (error) return { sucesso: false, erro: `Não consegui atualizar: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  return { sucesso: true, usuario: usuarioLogin };
}

const EXTENSOES_ASSINATURA = ["jpg", "jpeg", "png", "heic"];
const TAMANHO_MAXIMO_ASSINATURA = 8 * 1024 * 1024; // 8MB

/** Sobe a imagem da assinatura pro mesmo bucket público que o desktop usa
 * (`assinaturas`) - aqui sem cache local (o web sempre busca a URL na
 * hora), então é bem mais simples que o fluxo do desktop (que baixa e
 * guarda uma cópia no computador pra funcionar offline). O nome do
 * arquivo no bucket usa o LOGIN (em vez do id numérico que o desktop usa,
 * que só existe no SQLite local de cada instalação) - único por natureza,
 * já que login duplicado não é permitido. */
export async function salvarAssinaturaUsuario(formData: FormData): Promise<ResultadoUsuario> {
  try {
    await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }

  const usuarioLogin = formData.get("usuario");
  const arquivo = formData.get("arquivo");
  if (typeof usuarioLogin !== "string" || !usuarioLogin) {
    return { sucesso: false, erro: "Usuário não identificado - salva o cadastro primeiro." };
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { sucesso: false, erro: "Nenhum arquivo selecionado." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_ASSINATURA) {
    return { sucesso: false, erro: "Arquivo muito grande (máximo 8MB)." };
  }
  const extensao = (arquivo.name.split(".").pop() || "").toLowerCase();
  if (!EXTENSOES_ASSINATURA.includes(extensao)) {
    return { sucesso: false, erro: "Tipo de arquivo não permitido - usa JPG, PNG ou HEIC." };
  }

  const admin = criarClienteAdmin();
  const nomeArquivo = usuarioLogin.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const caminhoNoBucket = `${nomeArquivo}.${extensao}`;
  const contentType = `image/${extensao === "jpg" ? "jpeg" : extensao}`;
  const bytes = await arquivo.arrayBuffer();

  const { error: erroUpload } = await admin.storage
    .from("assinaturas")
    .upload(caminhoNoBucket, bytes, { contentType, upsert: true });
  if (erroUpload) return { sucesso: false, erro: `Não consegui subir a assinatura: ${erroUpload.message}` };

  const { data: urlPublica } = admin.storage.from("assinaturas").getPublicUrl(caminhoNoBucket);
  // "?v=" no final evita o navegador continuar mostrando a assinatura
  // antiga em cache depois de trocar (mesmo truque do desktop)
  const urlComCacheBuster = `${urlPublica.publicUrl}?v=${Date.now()}`;

  const { error: erroUpdate } = await admin
    .from("usuarios")
    .update({ assinatura_url: urlComCacheBuster })
    .eq("usuario", usuarioLogin);
  if (erroUpdate) return { sucesso: false, erro: `A assinatura subiu, mas não consegui salvar: ${erroUpdate.message}` };

  revalidatePath("/admin/usuarios");
  return { sucesso: true, usuario: usuarioLogin };
}
