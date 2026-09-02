"use server";

import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";

// Mesmo bucket e mesmo padrão de caminho que o desktop usa (modulos/rdo/
// sync.py, função `enviar_anexo_embarque`) - tem que ser IGUAL pros dois
// lados lerem os arquivos um do outro sem problema.
const NOME_BUCKET_ANEXOS = "relatorios-assinados";
const EXTENSOES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png", "heic"];
const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

export type ResultadoAnexo = { sucesso: true } | { sucesso: false; erro: string };

/** Confere se tem uma sessão válida (mesmo login usado no resto do site) -
 * a página em si já fica atrás do login (proxy.ts), mas uma Server Action
 * pode em teoria ser chamada direto, então confere de novo aqui. */
async function usuarioLogado(): Promise<string | null> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  return sessao?.nome ?? null;
}

/** Gera um ID único (bigint, sempre como STRING - nunca como `number`,
 * senão perde precisão, mesmo problema já documentado em embarques.ts)
 * pro novo anexo. O desktop usa o autoincrement local do SQLite pra isso
 * (um número pequeno, tipo 1, 2, 3...) - aqui gera um número bem maior
 * (timestamp em milissegundos + 3 dígitos aleatórios no fim), pra nunca
 * colidir com os IDs pequenos que vêm de lá. */
function gerarIdAnexo(): string {
  const agora = Date.now().toString();
  const sufixo = Math.floor(100 + Math.random() * 900).toString();
  return `${agora}${sufixo}`;
}

/** Sobe um relatório/RDO assinado (o "relatório de embarque" manual, foto
 * ou scan) pro Storage do Supabase e registra a linha em `anexos_embarque`
 * - mesmo fluxo que o desktop faz em `anexar_arquivo_embarque()`. Usa o
 * cliente admin (service role) porque essa Server Action já roda só no
 * servidor - nunca expõe a chave pro navegador. */
export async function subirAnexoEmbarque(formData: FormData): Promise<ResultadoAnexo> {
  const nomeUsuario = await usuarioLogado();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Sessão expirada - atualiza a página e faz login de novo." };
  }

  const embarqueId = formData.get("embarqueId");
  const arquivo = formData.get("arquivo");

  if (typeof embarqueId !== "string" || !embarqueId) {
    return { sucesso: false, erro: "Embarque não identificado." };
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

  const anexoId = gerarIdAnexo();
  const contentType = extensao === "pdf" ? "application/pdf" : `image/${extensao === "jpg" ? "jpeg" : extensao}`;
  const caminhoNoBucket = `embarque_${embarqueId}/anexo_${anexoId}.${extensao}`;

  const admin = criarClienteAdmin();
  const bytes = await arquivo.arrayBuffer();

  const { error: erroUpload } = await admin.storage
    .from(NOME_BUCKET_ANEXOS)
    .upload(caminhoNoBucket, bytes, { contentType, upsert: true });
  if (erroUpload) {
    return { sucesso: false, erro: `Não consegui subir o arquivo: ${erroUpload.message}` };
  }

  const { data: urlPublica } = admin.storage.from(NOME_BUCKET_ANEXOS).getPublicUrl(caminhoNoBucket);

  // guarda o NOME ORIGINAL do arquivo (o que a pessoa deu ao selecionar) -
  // é esse nome que precisa vir de volta quando alguém baixar depois,
  // não o nome interno do bucket (embarque_.../anexo_....ext)
  const { error: erroInsert } = await admin.from("anexos_embarque").insert({
    id: anexoId,
    embarque_id: embarqueId,
    nome_arquivo: arquivo.name,
    url_nuvem: urlPublica.publicUrl,
    enviado_por: nomeUsuario,
  });
  if (erroInsert) {
    return { sucesso: false, erro: `O arquivo subiu, mas não consegui registrar: ${erroInsert.message}` };
  }

  return { sucesso: true };
}

/** Remove um anexo (arquivo no Storage + linha na tabela). */
export async function removerAnexoEmbarque(anexoId: string): Promise<ResultadoAnexo> {
  const nomeUsuario = await usuarioLogado();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Sessão expirada - atualiza a página e faz login de novo." };
  }
  if (!anexoId) {
    return { sucesso: false, erro: "Anexo não identificado." };
  }

  const admin = criarClienteAdmin();

  // busca o caminho de verdade no bucket a partir da URL pública guardada,
  // em vez de tentar remontar - mais seguro se o padrão de nome mudar um dia
  const { data: linha } = await admin
    .from("anexos_embarque")
    .select("url_nuvem")
    .eq("id", anexoId)
    .maybeSingle();

  if (linha?.url_nuvem) {
    const marcador = `/storage/v1/object/public/${NOME_BUCKET_ANEXOS}/`;
    const indice = (linha.url_nuvem as string).indexOf(marcador);
    if (indice !== -1) {
      const caminho = decodeURIComponent((linha.url_nuvem as string).slice(indice + marcador.length));
      await admin.storage.from(NOME_BUCKET_ANEXOS).remove([caminho]);
    }
  }

  const { error: erroDelete } = await admin.from("anexos_embarque").delete().eq("id", anexoId);
  if (erroDelete) {
    return { sucesso: false, erro: `Não consegui remover: ${erroDelete.message}` };
  }
  return { sucesso: true };
}
