import { supabase } from "@/lib/supabase";
import { diasSobrepostos, intervaloRealDoEmbarque, type Periodo } from "@/lib/relatorios";
import type { Embarque, Obra, Rdo } from "@/lib/embarques";

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
