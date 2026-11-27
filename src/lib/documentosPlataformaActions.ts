"use server";

import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { CATEGORIAS_DOCUMENTO, type CategoriaDocumento } from "@/lib/documentosPlataformaTipos";
import { resolverGrupoPlataforma, obraIdCanonicoDoGrupo } from "@/lib/documentosPlataforma";

const NOME_BUCKET_DOCUMENTOS = "documentos-plataforma";
const EXTENSOES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png", "heic"];
// 14/09: combinado com o Rafael - 50MB (bem acima do limite de 20MB usado
// nos anexos de embarque), já que documento geral (isométrico, planta) pode
// ser um PDF grande de verdade, escaneado em alta resolução.
const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024;

export type ResultadoDocumento = { sucesso: true } | { sucesso: false; erro: string };

export type ResultadoPrepararUpload =
  | { sucesso: true; signedUrl: string; token: string; caminhoNoBucket: string; documentoId: string; contentType: string }
  | { sucesso: false; erro: string };

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

/** PASSO 1 de 2 do upload de documento GERAL (Isométricos/P&ID/Plantas/
 * MD-GM-SS-WO/Outros) - 12/11: substituiu o `uploadDocumentoPlataforma`
 * antigo (que recebia o arquivo inteiro aqui dentro). Causa raiz do "upload
 * sempre falha" que o Rafael reportou (os PDFs de MD/GM escaneados, mas
 * valeria pra qualquer arquivo real acima de uns 4MB): toda Server Action
 * roda como uma Vercel Function, e a Vercel trava QUALQUER corpo de
 * requisição em 4.5MB (erro 413) - isso acontece ANTES do nosso próprio
 * limite de 50MB sequer ser conferido, então nunca dava pra saber pelo
 * erro. Essa função aqui NÃO recebe mais o arquivo - só os metadados (nome/
 * tamanho/categoria/plataforma), que cabem tranquilo no limite da Vercel -
 * e devolve um link assinado do Supabase Storage. O navegador sobe o
 * arquivo DIRETO pra esse link (`uploadToSignedUrl`, ver
 * `src/lib/supabase-browser.ts`), sem passar pela function. Depois do
 * upload direto, `confirmarUploadDocumentoPlataforma` (abaixo) registra o
 * documento na tabela - mesma lógica de antes, só que em duas etapas. */
export async function prepararUploadDocumentoPlataforma(
  grupoKeyBruto: string,
  categoriaBruta: string,
  nomeArquivoBruto: string,
  tamanhoBytes: number
): Promise<ResultadoPrepararUpload> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }

  // 14/09: o que chega aqui é o GRUPO da plataforma (código normalizado -
  // ver `chaveDeGrupo` em documentosPlataforma.ts), não mais 1 `obras.id`
  // direto - pode representar mais de uma obra cadastrada de verdade
  // (cadastro duplicado da mesma plataforma física). Resolve pro id real
  // ANTES de gravar, já que `documentos_plataforma.obra_id` é bigint de
  // verdade, referenciando 1 obra só.
  if (!grupoKeyBruto) {
    return { sucesso: false, erro: "Plataforma não identificada." };
  }
  const grupo = await resolverGrupoPlataforma(grupoKeyBruto);
  if (!grupo) {
    return { sucesso: false, erro: "Não achei essa plataforma no cadastro." };
  }
  const obraId = obraIdCanonicoDoGrupo(grupo.obraIds);
  const categoria: CategoriaDocumento | null = (CATEGORIAS_DOCUMENTO as readonly string[]).includes(categoriaBruta)
    ? (categoriaBruta as CategoriaDocumento)
    : null;
  if (!categoria) {
    return { sucesso: false, erro: "Categoria inválida." };
  }
  if (!nomeArquivoBruto || !tamanhoBytes || tamanhoBytes <= 0) {
    return { sucesso: false, erro: "Nenhum arquivo selecionado." };
  }
  if (tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
    return { sucesso: false, erro: `Arquivo muito grande (máximo ${TAMANHO_MAXIMO_BYTES / 1024 / 1024}MB).` };
  }
  const extensao = (nomeArquivoBruto.split(".").pop() || "").toLowerCase();
  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return { sucesso: false, erro: "Tipo de arquivo não permitido - usa PDF, JPG, PNG ou HEIC." };
  }

  const documentoId = gerarIdDocumento();
  const contentType = extensao === "pdf" ? "application/pdf" : `image/${extensao === "jpg" ? "jpeg" : extensao}`;
  const caminhoNoBucket = `obra_${obraId}/${categoria}/${documentoId}.${extensao}`;

  const admin = criarClienteAdmin();
  const { data, error } = await admin.storage.from(NOME_BUCKET_DOCUMENTOS).createSignedUploadUrl(caminhoNoBucket);
  if (error || !data) {
    return { sucesso: false, erro: `Não consegui preparar o upload: ${error?.message ?? "erro desconhecido"}` };
  }

  return { sucesso: true, signedUrl: data.signedUrl, token: data.token, caminhoNoBucket, documentoId, contentType };
}

/** PASSO 2 de 2 - chamado pelo navegador DEPOIS do upload direto pro
 * Storage ter dado certo (ver `prepararUploadDocumentoPlataforma` acima).
 * Confere sessão/permissão de novo (nunca confia só no que rolou no
 * navegador) e registra a linha em `documentos_plataforma` - mesma lógica
 * de limpeza de órfão que já existia antes, caso o INSERT falhe. */
export async function confirmarUploadDocumentoPlataforma(dados: {
  documentoId: string;
  grupoKey: string;
  categoria: string;
  caminhoNoBucket: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  // 27/11: observação livre opcional (pedido do Rafael) - digitada no
  // momento do upload, pra já nascer identificado (ex: "MD de escaneamento
  // de linhas"). String vazia é tratada como "sem observação" (null), não
  // grava "" no banco.
  observacao?: string | null;
}): Promise<ResultadoDocumento> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }

  const grupo = await resolverGrupoPlataforma(dados.grupoKey);
  if (!grupo) {
    return { sucesso: false, erro: "Não achei essa plataforma no cadastro." };
  }
  const obraId = obraIdCanonicoDoGrupo(grupo.obraIds);
  const categoria: CategoriaDocumento | null = (CATEGORIAS_DOCUMENTO as readonly string[]).includes(dados.categoria)
    ? (dados.categoria as CategoriaDocumento)
    : null;
  if (!categoria) {
    return { sucesso: false, erro: "Categoria inválida." };
  }

  const observacao = dados.observacao?.trim() || null;

  const admin = criarClienteAdmin();
  const { error: erroInsert } = await admin.from("documentos_plataforma").insert({
    id: dados.documentoId,
    obra_id: obraId,
    categoria,
    nome_arquivo: dados.nomeArquivo,
    caminho_storage: dados.caminhoNoBucket,
    tamanho_bytes: dados.tamanhoBytes,
    enviado_por: nomeUsuario,
    observacao,
  });
  if (erroInsert) {
    // melhor esforço: se o registro falhar, remove o arquivo órfão do
    // Storage também, pra não repetir o mesmo tipo de vazamento silencioso
    // já achado e corrigido nos anexos de embarque (ver "sétima entrega")
    await admin.storage.from(NOME_BUCKET_DOCUMENTOS).remove([dados.caminhoNoBucket]);
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

/** 27/11 (pedido do Rafael): adiciona/edita a observação de um documento já
 * enviado - cobre o caso dele mesmo ("já estive aqui há 30 dias, só não
 * subi o MD") de querer identificar um documento antigo que subiu sem
 * nota nenhuma, sem precisar reenviar o arquivo. String vazia limpa a
 * observação (volta pra null). */
export async function atualizarObservacaoDocumentoPlataforma(
  documentoId: string,
  observacao: string
): Promise<ResultadoDocumento> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }
  if (!documentoId) {
    return { sucesso: false, erro: "Documento não identificado." };
  }

  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("documentos_plataforma")
    .update({ observacao: observacao.trim() || null })
    .eq("id", documentoId);
  if (error) {
    return { sucesso: false, erro: `Não consegui salvar a observação: ${error.message}` };
  }
  return { sucesso: true };
}
