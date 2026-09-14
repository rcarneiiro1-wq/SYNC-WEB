"use server";

import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { CATEGORIAS_DOCUMENTO, type CategoriaDocumento } from "@/lib/documentosPlataformaTipos";

const NOME_BUCKET_DOCUMENTOS = "documentos-plataforma";
const EXTENSOES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png", "heic"];
// 14/09: combinado com o Rafael - 50MB (bem acima do limite de 20MB usado
// nos anexos de embarque), já que documento geral (isométrico, planta) pode
// ser um PDF grande de verdade, escaneado em alta resolução.
const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024;

export type ResultadoDocumento = { sucesso: true } | { sucesso: false; erro: string };

/** Confere sessão E permissão - "Documentos da Plataforma"/"Upload de
 * Arquivos" reaproveita a MESMA permissão de "gerenciamento_embarques" já
 * existente (decisão do Rafael, 14/09: não criar uma permissão nova agora,
 * já que os dois fica com a mesma gerência por enquanto - ajusta quem vê
 * cada coisa depois, quando o colaborador também precisar entrar aqui). */
async function usuarioComPermissao(): Promise<string | null> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) return null;
  const temAcesso = sessao.ehAdmin || Boolean(sessao.permissoes?.includes("gerenciamento_embarques"));
  return temAcesso ? sessao.nome : null;
}

function gerarIdDocumento(): string {
  const agora = Date.now().toString();
  const sufixo = Math.floor(100 + Math.random() * 900).toString();
  return `${agora}${sufixo}`;
}

/** Sobe um documento GERAL (Isométricos/P&ID/Plantas/Outros) de uma
 * plataforma - upload manual, só gerência por enquanto (ver nota acima).
 * Diferente dos anexos de embarque (RDO/Relatório), aqui NUNCA substitui um
 * arquivo existente - cada envio é um documento novo na biblioteca. */
export async function uploadDocumentoPlataforma(formData: FormData): Promise<ResultadoDocumento> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }

  const obraId = formData.get("obraId");
  const categoriaBruta = formData.get("categoria");
  const arquivo = formData.get("arquivo");

  if (typeof obraId !== "string" || !obraId) {
    return { sucesso: false, erro: "Plataforma não identificada." };
  }
  const categoria: CategoriaDocumento | null =
    typeof categoriaBruta === "string" && (CATEGORIAS_DOCUMENTO as readonly string[]).includes(categoriaBruta)
      ? (categoriaBruta as CategoriaDocumento)
      : null;
  if (!categoria) {
    return { sucesso: false, erro: "Categoria inválida." };
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { sucesso: false, erro: "Nenhum arquivo selecionado." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { sucesso: false, erro: `Arquivo muito grande (máximo ${TAMANHO_MAXIMO_BYTES / 1024 / 1024}MB).` };
  }
  const extensao = (arquivo.name.split(".").pop() || "").toLowerCase();
  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return { sucesso: false, erro: "Tipo de arquivo não permitido - usa PDF, JPG, PNG ou HEIC." };
  }

  const documentoId = gerarIdDocumento();
  const contentType = extensao === "pdf" ? "application/pdf" : `image/${extensao === "jpg" ? "jpeg" : extensao}`;
  const caminhoNoBucket = `obra_${obraId}/${categoria}/${documentoId}.${extensao}`;

  const admin = criarClienteAdmin();
  const bytes = await arquivo.arrayBuffer();

  const { error: erroUpload } = await admin.storage
    .from(NOME_BUCKET_DOCUMENTOS)
    .upload(caminhoNoBucket, bytes, { contentType, upsert: false });
  if (erroUpload) {
    return { sucesso: false, erro: `Não consegui subir o arquivo: ${erroUpload.message}` };
  }

  const { error: erroInsert } = await admin.from("documentos_plataforma").insert({
    id: documentoId,
    obra_id: obraId,
    categoria,
    nome_arquivo: arquivo.name,
    caminho_storage: caminhoNoBucket,
    tamanho_bytes: arquivo.size,
    enviado_por: nomeUsuario,
  });
  if (erroInsert) {
    // melhor esforço: se o registro falhar, remove o arquivo órfão do
    // Storage também, pra não repetir o mesmo tipo de vazamento silencioso
    // já achado e corrigido nos anexos de embarque (ver "sétima entrega")
    await admin.storage.from(NOME_BUCKET_DOCUMENTOS).remove([caminhoNoBucket]);
    return { sucesso: false, erro: `Não consegui registrar o documento: ${erroInsert.message}` };
  }

  return { sucesso: true };
}

/** Remove um documento geral (arquivo no Storage + linha na tabela). */
export async function removerDocumentoPlataforma(documentoId: string): Promise<ResultadoDocumento> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }
  if (!documentoId) {
    return { sucesso: false, erro: "Documento não identificado." };
  }

  const admin = criarClienteAdmin();
  const { data: linha } = await admin
    .from("documentos_plataforma")
    .select("caminho_storage")
    .eq("id", documentoId)
    .maybeSingle();

  if (linha?.caminho_storage) {
    await admin.storage.from(NOME_BUCKET_DOCUMENTOS).remove([linha.caminho_storage as string]);
  }

  const { error: erroDelete } = await admin.from("documentos_plataforma").delete().eq("id", documentoId);
  if (erroDelete) {
    return { sucesso: false, erro: `Não consegui remover: ${erroDelete.message}` };
  }
  return { sucesso: true };
}
