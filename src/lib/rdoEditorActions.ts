"use server";

import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { corrigirPdfRdo } from "@/lib/rdoPdfPatch";

const NOME_BUCKET_RDOS_PDF = "rdos-pdf";

/** Mesma permissão usada no resto da área de gerência (Documentos da
 * Plataforma, Histórico) - "editar RDO" é coisa de coordenação, não do
 * colaborador embarcado. */
async function usuarioComPermissao(): Promise<string | null> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) return null;
  const temAcesso = sessao.ehAdmin || Boolean(sessao.permissoes?.includes("gerenciamento_embarques"));
  return temAcesso ? sessao.nome : null;
}

export type RdoParaEditar = {
  id: string;
  numeroRdo: number;
  data: string;
  localAtuacao: string;
  descricao: string;
  arquivoPdfUrl: string | null;
  colaborador: string;
  obraNome: string;
};

export type ResultadoBuscarRdo = { sucesso: true; rdo: RdoParaEditar } | { sucesso: false; erro: string };

/** Busca os dados atuais de um RDO pra preencher o formulário de edição -
 * só os campos que de fato existem na nuvem e aparecem impressos no PDF
 * (ver nota em `rdoPdfPatch.ts` sobre por que horário/PT/intervalo ficam
 * de fora por enquanto: não são sincronizados do desktop pra cá hoje). */
export async function buscarRdoParaEditar(rdoId: string): Promise<ResultadoBuscarRdo> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }
  if (!rdoId) {
    return { sucesso: false, erro: "RDO não identificado." };
  }

  const admin = criarClienteAdmin();
  // id/embarque_id SEMPRE como ::text - são bigint grandes de verdade
  // (timestamp em milissegundos + sufixo), acima do que um `number` do
  // JS consegue guardar sem perder precisão (mesmo cuidado já documentado
  // em `anexosActions.ts`/`documentosPlataforma.ts`).
  const { data: linha, error } = await admin
    .from("rdos")
    .select("id::text, numero_rdo, data, local_atuacao, descricao, arquivo_pdf_url, embarque_id::text")
    .eq("id", rdoId)
    .maybeSingle();

  if (error || !linha) {
    return { sucesso: false, erro: `Não achei esse RDO: ${error?.message ?? "não encontrado"}` };
  }

  // join manual (mesmo padrão já usado em documentosPlataforma.ts) em vez
  // do embed aninhado do Supabase - só pra mostrar quem/qual obra no modal
  const { data: embarque } = await admin
    .from("embarques")
    .select("efetivo_nome, obra_nome")
    .eq("id", linha.embarque_id as string)
    .maybeSingle();

  return {
    sucesso: true,
    rdo: {
      id: linha.id as string,
      numeroRdo: linha.numero_rdo as number,
      data: (linha.data as string) ?? "",
      localAtuacao: (linha.local_atuacao as string) ?? "",
      descricao: (linha.descricao as string) ?? "",
      arquivoPdfUrl: (linha.arquivo_pdf_url as string) ?? null,
      colaborador: (embarque?.efetivo_nome as string) ?? "-",
      obraNome: (embarque?.obra_nome as string) ?? "-",
    },
  };
}

export type ResultadoSalvarEdicao =
  | { sucesso: true; avisoPdf?: string }
  | { sucesso: false; erro: string };

/** Salva a edição de um RDO: atualiza o banco (sempre) e tenta corrigir o
 * PDF já gerado (melhor esforço - se o PDF não puder ser corrigido por
 * algum motivo, o banco já ficou certo mesmo assim, e a função devolve um
 * aviso em vez de falhar a operação inteira). Mesma lógica que foi feita
 * na mão (Python/pikepdf) pro incidente de 12/11 - ver NOVIDADES/histórico
 * do projeto - só que agora como uma Server Action de verdade. */
export async function salvarEdicaoRdo(dados: {
  rdoId: string;
  novoLocal: string;
  novaDescricao: string;
}): Promise<ResultadoSalvarEdicao> {
  const nomeUsuario = await usuarioComPermissao();
  if (!nomeUsuario) {
    return { sucesso: false, erro: "Você não tem acesso a essa área, ou sua sessão expirou." };
  }
  if (!dados.rdoId) {
    return { sucesso: false, erro: "RDO não identificado." };
  }

  const admin = criarClienteAdmin();

  const { data: linhaAtual, error: erroBusca } = await admin
    .from("rdos")
    .select("arquivo_pdf_url")
    .eq("id", dados.rdoId)
    .maybeSingle();
  if (erroBusca || !linhaAtual) {
    return { sucesso: false, erro: `Não achei esse RDO: ${erroBusca?.message ?? "não encontrado"}` };
  }

  const { error: erroUpdate } = await admin
    .from("rdos")
    .update({
      local_atuacao: dados.novoLocal,
      descricao: dados.novaDescricao,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", dados.rdoId);
  if (erroUpdate) {
    return { sucesso: false, erro: `Não consegui salvar no banco: ${erroUpdate.message}` };
  }

  // a partir daqui é melhor esforço - o dado já está certo no banco
  // mesmo se o PDF não puder ser corrigido por algum motivo
  const urlPdf = linhaAtual.arquivo_pdf_url as string | null;
  if (!urlPdf) {
    return { sucesso: true, avisoPdf: "Esse RDO ainda não tem um PDF gerado - só o banco foi atualizado." };
  }

  try {
    const resposta = await fetch(urlPdf);
    if (!resposta.ok) {
      return { sucesso: true, avisoPdf: `Banco atualizado, mas não consegui baixar o PDF pra corrigir (HTTP ${resposta.status}).` };
    }
    const bytesOriginais = new Uint8Array(await resposta.arrayBuffer());

    const { bytes: bytesCorrigidos, transbordouDescricao } = await corrigirPdfRdo(bytesOriginais, {
      novoLocal: dados.novoLocal,
      novaDescricao: dados.novaDescricao,
    });

    const marcador = `/storage/v1/object/public/${NOME_BUCKET_RDOS_PDF}/`;
    const indice = urlPdf.indexOf(marcador);
    if (indice === -1) {
      return { sucesso: true, avisoPdf: "Banco atualizado, mas não reconheci o caminho do PDF no Storage pra corrigir." };
    }
    const caminhoNoBucket = decodeURIComponent(urlPdf.slice(indice + marcador.length));

    const { error: erroUpload } = await admin.storage
      .from(NOME_BUCKET_RDOS_PDF)
      .upload(caminhoNoBucket, bytesCorrigidos, { contentType: "application/pdf", upsert: true });
    if (erroUpload) {
      return { sucesso: true, avisoPdf: `Banco atualizado, mas não consegui salvar o PDF corrigido: ${erroUpload.message}` };
    }

    if (transbordouDescricao) {
      return {
        sucesso: true,
        avisoPdf:
          "Banco e PDF atualizados, mas a descrição nova é mais comprida do que o espaço original no RDO - pode ter ficado invadindo a área abaixo no PDF. Se isso importar, me avisa que eu ajusto.",
      };
    }
    return { sucesso: true };
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : "erro desconhecido";
    return { sucesso: true, avisoPdf: `Banco atualizado, mas não consegui corrigir o PDF automaticamente: ${detalhe}` };
  }
}
