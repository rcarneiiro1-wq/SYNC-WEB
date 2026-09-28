import { supabase } from "@/lib/supabase";
import { diasSobrepostos, intervaloRealDoEmbarque, type Periodo } from "@/lib/relatorios";
import type { Embarque, Obra, Rdo } from "@/lib/embarques";
import { periodoDoEmbarque } from "@/lib/documentosPlataforma";
import type { GrupoRdoEmbarque, RdoResumoDoc, RelatorioEmbarqueDoc } from "@/lib/documentosPlataformaTipos";

/**
 * Dados do "painel do colaborador" (ideia de 11/09, a pedido do Rafael
 * depois de o Gustavo não saber quantas diárias tinha pra receber) -
 * reaproveita a MESMA conta de diária do relatório por empresa
 * (`buscarRelatorioPorEmpresa`, em relatorios.ts), só que pra UM
 * colaborador só, nunca por nome (ver `embarques.colaborador_id`,
 * adicionado agora de propósito - antes só existia `efetivo_nome`,
 * texto solto, frágil demais pra basear "mostra só o meu" nele).
 */

export type ColaboradorLogado = {
  colaboradorId: string;
  nome: string;
};

/** Acha o colaborador vinculado a um login (`usuarios.usuario`) - null se
 * essa pessoa ainda não tem colaborador vinculado (ver `colaboradores.
 * usuario_login`, do projeto de vínculo Colaborador↔Usuário de 04/09).
 * SEMPRE chamado com o `usuario` que já veio validado do cookie de sessão
 * (nunca de um valor vindo direto do cliente) - é isso que garante que
 * uma pessoa só enxerga o colaborador dela mesma, nunca de outra. */
export async function resolverColaboradorDoUsuario(usuario: string): Promise<ColaboradorLogado | null> {
  const { data, error } = await supabase
    .from("colaboradores")
    .select("id::text, nome")
    .ilike("usuario_login", usuario)
    .is("mesclado_com_id", null)
    .maybeSingle();
  if (error || !data) return null;
  return { colaboradorId: (data as unknown as { id: string; nome: string }).id, nome: (data as unknown as { id: string; nome: string }).nome };
}

export type DetalheEmbarqueColaborador = {
  embarqueId: string;
  obra: string;
  periodoNoRecorte: string;
  diariasNoRecorte: number;
  aindaAtivo: boolean;
};

export type DiariasColaborador = {
  totalDiarias: number;
  embarques: DetalheEmbarqueColaborador[];
  /** Obra do embarque ativo agora, se tiver algum - pra mostrar "você tá
   * na tal plataforma" no topo do painel, independente do período
   * escolhido (o embarque pode ter começado num período anterior). */
  plataformaAtual: string | null;
};

function formatarCurto(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** Diárias de UM colaborador dentro de um período - mesma regra de
 * sobreposição do relatório por empresa (só conta os dias que realmente
 * caem dentro do período pedido, mesmo se o embarque atravessar a
 * virada). `colaboradorId` tem que vir de `resolverColaboradorDoUsuario`,
 * nunca de entrada do usuário/cliente. */
export async function buscarDiariasColaborador(colaboradorId: string, periodo: Periodo): Promise<DiariasColaborador> {
  const COLUNAS_EMBARQUES =
    "id::text, obra_id::text, obra_nome, efetivo_nome, efetivo_funcao, data_inicio, data_fim, ativo, " +
    "status_final, justificativa_encerramento, recado_dia, recado_dia_atualizado_em, colaborador_id::text";
  const COLUNAS_OBRAS = "id::text, nome, empresa, local_flotel, local_codigo, gm_codigo, md_codigo, prefixo_rdo, data_desembarque_prevista";
  const COLUNAS_RDOS =
    "id::text, embarque_id::text, numero_rdo, data, local_atuacao, status, avanco_percentual, avanco_json, " +
    "descricao, arquivo_pdf_url, justificativa_percentual, referencias_dia_json, atualizado_em";

  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select(COLUNAS_EMBARQUES)
    .eq("colaborador_id", colaboradorId)
    .lte("data_inicio", periodo.fim)
    .or(`data_fim.gte.${periodo.inicio},data_fim.is.null`);
  if (erroEmb) throw new Error(`Não consegui buscar seus embarques: ${erroEmb.message}`);

  // embarque ativo AGORA (pra mostrar a plataforma atual), independente
  // do período escolhido na tela
  const { data: ativoRaw } = await supabase
    .from("embarques")
    .select("obra_id::text, obra_nome")
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const embarques = (embarquesRaw || []) as unknown as Embarque[];
  if (embarques.length === 0) {
    let plataformaAtual: string | null = null;
    if (ativoRaw) {
      const a = ativoRaw as unknown as { obra_id: string | null; obra_nome: string | null };
      const { data: obraAtiva } = a.obra_id
        ? await supabase.from("obras").select("nome").eq("id", a.obra_id).maybeSingle()
        : { data: null };
      plataformaAtual = (obraAtiva as unknown as { nome: string } | null)?.nome || a.obra_nome || null;
    }
    return { totalDiarias: 0, embarques: [], plataformaAtual };
  }

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);
  const [{ data: obrasRaw }, { data: rdosRaw }] = await Promise.all([
    supabase.from("obras").select(COLUNAS_OBRAS).in("id", idsObras.length ? idsObras : ["-1"]),
    supabase.from("rdos").select(COLUNAS_RDOS).in("embarque_id", idsEmbarques),
  ]);
  const obras = (obrasRaw || []) as unknown as Obra[];
  const rdos = (rdosRaw || []) as unknown as Rdo[];

  const obrasPorId = new Map(obras.map((o) => [o.id, o]));
  const rdosPorEmbarque = new Map<string, Rdo[]>();
  for (const rdo of rdos) {
    const lista = rdosPorEmbarque.get(rdo.embarque_id) || [];
    lista.push(rdo);
    rdosPorEmbarque.set(rdo.embarque_id, lista);
  }

  let totalDiarias = 0;
  const detalhes: DetalheEmbarqueColaborador[] = [];
  let plataformaAtual: string | null = null;

  for (const embarque of embarques) {
    const obra = obrasPorId.get(embarque.obra_id);
    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const { inicio, fim } = intervaloRealDoEmbarque(embarque, listaRdos);
    if (embarque.ativo) plataformaAtual = obra?.nome || embarque.obra_nome || null;
    if (!inicio) continue;

    const diarias = diasSobrepostos(inicio, fim, periodo.inicio, periodo.fim);
    if (diarias === 0) continue;

    totalDiarias += diarias;
    const inicioNoRecorte = inicio > periodo.inicio ? inicio : periodo.inicio;
    const fimNoRecorte = fim < periodo.fim ? fim : periodo.fim;
    detalhes.push({
      embarqueId: embarque.id,
      obra: obra?.nome || embarque.obra_nome || "-",
      periodoNoRecorte: `${formatarCurto(inicioNoRecorte)} → ${formatarCurto(fimNoRecorte)}`,
      diariasNoRecorte: diarias,
      aindaAtivo: Boolean(embarque.ativo),
    });
  }

  detalhes.sort((a, b) => (b.periodoNoRecorte > a.periodoNoRecorte ? 1 : -1));

  return { totalDiarias, embarques: detalhes, plataformaAtual };
}

/**
 * RDOs e Relatórios de Embarque de TODOS os embarques do colaborador
 * (17/09, a pedido do Rafael pra "Documentos Pessoais" do Meu Painel) -
 * SEM filtro de período, ao contrário de `buscarDiariasColaborador` acima:
 * a ideia é a pessoa ver tudo que já lançou, desde sempre, não só o
 * período escolhido na tela. `colaboradorId` sempre vem de
 * `resolverColaboradorDoUsuario` - mesma garantia de segurança da diária,
 * nunca um id vindo do cliente.
 *
 * Reaproveita o MESMO jeito de agrupar RDO por embarque (e a mesma regra
 * de período/"em andamento") já usado em `buscarDocumentosPlataforma`
 * (documentosPlataforma.ts, tela de gerência) - só troca o filtro de
 * "embarques dessa OBRA" por "embarques desse COLABORADOR", pra não ter
 * a mesma lógica duplicada em dois lugares podendo divergir com o tempo.
 */
export type MeusDocumentos = {
  gruposRdo: GrupoRdoEmbarque[];
  relatoriosEmbarque: RelatorioEmbarqueDoc[];
};

export async function buscarDocumentosColaborador(colaboradorId: string): Promise<MeusDocumentos> {
  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select("id::text, efetivo_nome, data_inicio, data_fim, ativo")
    .eq("colaborador_id", colaboradorId)
    .order("data_inicio", { ascending: false });
  if (erroEmb) throw new Error(`Não consegui buscar seus RDOs/relatórios: ${erroEmb.message}`);

  const embarques = (embarquesRaw as unknown as {
    id: string; efetivo_nome: string | null; data_inicio: string | null; data_fim: string | null; ativo: boolean;
  }[]) || [];
  const idsEmbarques = embarques.map((e) => e.id);

  if (idsEmbarques.length === 0) {
    return { gruposRdo: [], relatoriosEmbarque: [] };
  }

  const [{ data: rdosRaw }, { data: anexosRaw }] = await Promise.all([
    supabase
      .from("rdos")
      .select("id::text, embarque_id::text, numero_rdo, data, arquivo_pdf_url")
      .in("embarque_id", idsEmbarques)
      .order("numero_rdo", { ascending: true }),
    supabase
      .from("anexos_embarque")
      .select("id::text, embarque_id::text, nome_arquivo, url_nuvem, enviado_por, enviado_em")
      .in("embarque_id", idsEmbarques)
      // mesma regra já usada em documentosPlataforma.ts: registros antigos
      // (de antes da coluna `tipo` existir) ficaram com `tipo = NULL`, mas
      // TODOS eram Relatório de Embarque na época - conta como tal também
      .or("tipo.eq.relatorio_embarque,tipo.is.null")
      .order("enviado_em", { ascending: false }),
  ]);

  type RdoRaw = { id: string; embarque_id: string; numero_rdo: number; data: string | null; arquivo_pdf_url: string | null };
  const rdosBrutos = (rdosRaw as unknown as RdoRaw[]) || [];

  const rdosPorEmbarque = new Map<string, RdoResumoDoc[]>();
  for (const r of rdosBrutos) {
    const lista = rdosPorEmbarque.get(r.embarque_id) || [];
    lista.push({ id: r.id, numeroRdo: r.numero_rdo, data: r.data, url: r.arquivo_pdf_url });
    rdosPorEmbarque.set(r.embarque_id, lista);
  }

  const gruposRdo: GrupoRdoEmbarque[] = embarques
    .map((emb): GrupoRdoEmbarque | null => {
      const rdos = (rdosPorEmbarque.get(emb.id) || []).sort((a, b) => a.numeroRdo - b.numeroRdo);
      if (rdos.length === 0) return null;
      const colaborador = emb.efetivo_nome || "(sem nome)";
      return {
        embarqueId: emb.id,
        colaborador,
        periodo: periodoDoEmbarque(emb.data_inicio, emb.data_fim, emb.ativo),
        enviadoPor: colaborador,
        totalRdos: rdos.length,
        rdos,
        emAndamento: emb.ativo || !emb.data_fim,
      };
    })
    .filter((g): g is GrupoRdoEmbarque => g !== null);

  const colaboradorPorEmbarque = new Map(embarques.map((e) => [e.id, e.efetivo_nome || "(sem nome)"]));
  const relatoriosEmbarque: RelatorioEmbarqueDoc[] = ((anexosRaw as unknown as {
    id: string; embarque_id: string; nome_arquivo: string; url_nuvem: string | null;
    enviado_por: string | null; enviado_em: string | null;
  }[]) || []).map((a) => ({
    id: a.id,
    embarqueId: a.embarque_id,
    colaborador: colaboradorPorEmbarque.get(a.embarque_id) || "(sem nome)",
    nomeArquivo: a.nome_arquivo,
    enviadoPor: a.enviado_por,
    enviadoEm: a.enviado_em,
    url: a.url_nuvem,
  }));

  return { gruposRdo, relatoriosEmbarque };
}

const MESES_ABREV_TIMELINE = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function mesAnoBr(dataIso: string): string {
  const [ano, mes] = dataIso.slice(0, 10).split("-");
  const nomeMes = MESES_ABREV_TIMELINE[Number(mes) - 1] ?? mes;
  return `${nomeMes}/${ano}`;
}

export type EventoLinhaDoTempo = {
  embarqueId: string;
  obra: string;
  periodo: string;
  emAndamento: boolean;
};

export type LinhaDoTempoColaborador = {
  totalEmbarques: number;
  totalDiasTrabalhados: number;
  totalPlataformas: number;
  /** "Mar/2024" - mês/ano do primeiro embarque, ou null se nunca teve
   * nenhum embarque registrado ainda. */
  comAGenteDesde: string | null;
  /** Mais recente primeiro - pra ficar igual a lista de "Diárias" e de
   * "Documentos Pessoais" acima dela no painel. */
  eventos: EventoLinhaDoTempo[];
};

/**
 * "Linha do Tempo" do colaborador (17/09, a pedido do Rafael, ideia de
 * gamificação/reconhecimento pro Meu Painel) - um resumo de TODA a
 * trajetória da pessoa na empresa: quantos embarques, quantos dias
 * trabalhados (somados) e em quantas plataformas diferentes, desde
 * quando ela está com a gente, mais a lista cronológica dos embarques.
 *
 * SEM filtro de período, igual `buscarDocumentosColaborador` - é a
 * carreira inteira, não um mês. `colaboradorId` sempre vem de
 * `resolverColaboradorDoUsuario` (mesma garantia de segurança das
 * outras buscas desse arquivo).
 *
 * A conta de "dias trabalhados" reaproveita EXATAMENTE a mesma dupla
 * `intervaloRealDoEmbarque` + `diasSobrepostos` usada em
 * `buscarDiariasColaborador` (e no relatório por empresa) - só que sem
 * recortar por período, pra não ter uma segunda régua de "quantos dias
 * é um embarque" que possa divergir da diária de verdade com o tempo.
 */
export async function buscarLinhaDoTempoColaborador(colaboradorId: string): Promise<LinhaDoTempoColaborador> {
  const COLUNAS_EMBARQUES =
    "id::text, obra_id::text, obra_nome, efetivo_nome, efetivo_funcao, data_inicio, data_fim, ativo, " +
    "status_final, justificativa_encerramento, recado_dia, recado_dia_atualizado_em, colaborador_id::text";

  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select(COLUNAS_EMBARQUES)
    .eq("colaborador_id", colaboradorId)
    .order("data_inicio", { ascending: true });
  if (erroEmb) throw new Error(`Não consegui buscar sua linha do tempo: ${erroEmb.message}`);

  const embarques = (embarquesRaw || []) as unknown as Embarque[];
  if (embarques.length === 0) {
    return { totalEmbarques: 0, totalDiasTrabalhados: 0, totalPlataformas: 0, comAGenteDesde: null, eventos: [] };
  }

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);
  const [{ data: obrasRaw }, { data: rdosRaw }] = await Promise.all([
    supabase.from("obras").select("id::text, nome").in("id", idsObras.length ? idsObras : ["-1"]),
    supabase.from("rdos").select("id::text, embarque_id::text, data").in("embarque_id", idsEmbarques),
  ]);

  const obrasPorId = new Map(
    ((obrasRaw || []) as unknown as { id: string; nome: string | null }[]).map((o) => [o.id, o.nome])
  );
  const rdosPorEmbarque = new Map<string, Rdo[]>();
  for (const r of (rdosRaw || []) as unknown as { embarque_id: string; data: string | null }[]) {
    const lista = rdosPorEmbarque.get(r.embarque_id) || [];
    lista.push({ data: r.data } as Rdo);
    rdosPorEmbarque.set(r.embarque_id, lista);
  }

  let totalDiasTrabalhados = 0;
  const plataformas = new Set<string>();
  const eventos: EventoLinhaDoTempo[] = [];

  for (const embarque of embarques) {
    const nomeObra = obrasPorId.get(embarque.obra_id) || embarque.obra_nome || "-";
    plataformas.add(nomeObra);

    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const { inicio, fim } = intervaloRealDoEmbarque(embarque, listaRdos);
    if (inicio) {
      // limites bem largos = pega o intervalo inteiro (sem recorte de período)
      totalDiasTrabalhados += diasSobrepostos(inicio, fim, "0001-01-01", "9999-12-31");
    }

    eventos.push({
      embarqueId: embarque.id,
      obra: nomeObra,
      periodo: periodoDoEmbarque(embarque.data_inicio, embarque.data_fim, embarque.ativo),
      emAndamento: embarque.ativo || !embarque.data_fim,
    });
  }

  eventos.reverse(); // a busca veio do mais antigo pro mais novo (pra achar "desde quando" certo) - inverte pra exibir

  return {
    totalEmbarques: embarques.length,
    totalDiasTrabalhados,
    totalPlataformas: plataformas.size,
    comAGenteDesde: embarques[0].data_inicio ? mesAnoBr(embarques[0].data_inicio) : null,
    eventos,
  };
}
