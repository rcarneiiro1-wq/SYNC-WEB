import { supabase } from "@/lib/supabase";

export type Embarque = {
  id: number;
  obra_id: number;
  obra_nome: string | null;
  efetivo_nome: string | null;
  efetivo_funcao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean;
};

export type Obra = {
  id: number;
  nome: string | null;
  empresa: string | null;
  local_flotel: string | null;
  local_codigo: string | null;
  prefixo_rdo: string | null;
  data_desembarque_prevista: string | null;
};

export type Rdo = {
  id: number;
  embarque_id: number;
  numero_rdo: number;
  data: string | null;
  local_atuacao: string | null;
  status: string | null;
  avanco_percentual: number | null;
  avanco_json: string | null;
};

export type ItensPorStatus = {
  concluido: string[];
  em_andamento: string[];
  a_iniciar: string[];
};

export type LinhaEmbarque = {
  embarque: Embarque;
  obra: Obra | null;
  totalRdos: number;
  percentual: number | null;
  diasEmbarcado: number | null;
  dataInicioReal: string | null;
  itensAvanco: ItensPorStatus;
  rdosPendentes: number;
};

/** % de avanço do RDO mais recente - mesma prioridade do desktop:
 * usa o percentual informado manualmente, só calcula em cima da lista
 * de itens se não tiver o manual. */
function percentualDoRdo(rdo: Rdo | undefined): number | null {
  if (!rdo) return null;
  if (rdo.avanco_percentual !== null && rdo.avanco_percentual !== undefined) {
    return rdo.avanco_percentual;
  }
  if (!rdo.avanco_json) return null;
  try {
    const avanco = JSON.parse(rdo.avanco_json) as Record<string, string>;
    const valores = Object.values(avanco);
    if (valores.length === 0) return null;
    const concluidos = valores.filter((v) => v === "concluido").length;
    return Math.round((concluidos / valores.length) * 100);
  } catch {
    return null;
  }
}

/** Separa os itens do escopo (FLARE, PROA, HELIDEK...) por status, com
 * base no RDO mais recente - pra dar a mesma clareza que o hub do
 * desktop já mostra: o que já foi feito, o que está rolando agora, e o
 * que ainda nem começou. */
function itensPorStatusDoRdo(rdo: Rdo | undefined): ItensPorStatus {
  const vazio: ItensPorStatus = { concluido: [], em_andamento: [], a_iniciar: [] };
  if (!rdo?.avanco_json) return vazio;
  try {
    const avanco = JSON.parse(rdo.avanco_json) as Record<string, string>;
    for (const [item, status] of Object.entries(avanco)) {
      if (status === "concluido") vazio.concluido.push(item);
      else if (status === "em_andamento") vazio.em_andamento.push(item);
      else vazio.a_iniciar.push(item);
    }
    return vazio;
  } catch {
    return vazio;
  }
}

function diasDesde(dataIso: string | null): number | null {
  if (!dataIso) return null;
  // tanto "embarques.data_inicio" (AAAA-MM-DD) quanto "rdos.data"
  // (AAAA-MM-DD HH:MM:SS, é assim que o sqlite grava datetime por padrão)
  // vêm com os 10 primeiros caracteres em ISO - pega só essa parte,
  // funciona pros dois formatos
  const somenteData = dataIso.slice(0, 10);
  const inicio = new Date(somenteData + "T00:00:00");
  if (Number.isNaN(inicio.getTime())) return null;
  const hoje = new Date();
  const diffMs = hoje.setHours(0, 0, 0, 0) - inicio.setHours(0, 0, 0, 0);
  // +1 pra contar de forma INCLUSIVA (o próprio dia de início já conta como
  // "dia 1 a bordo") - mesma convenção usada no desktop pro "Dias" do
  // histórico de embarques (lá é (mais_recente - mais_antiga).days + 1)
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

/** A data "oficial" de início é quando alguém clicou em Iniciar Embarque -
 * mas é comum a pessoa só lançar o primeiro RDO depois, às vezes com data
 * atrasada (anterior ao clique). "Dias a bordo" fica mais correto usando
 * a data mais antiga entre as duas, não só o clique administrativo -
 * senão dá exatamente o problema visto na prática: embarque criado hoje,
 * mas com RDO de ontem, mostrando "0 dias" mesmo já tendo 1 dia documentado. */
function dataMaisAntiga(dataInicio: string | null, rdos: Rdo[]): string | null {
  const candidatas = [dataInicio, ...rdos.map((r) => r.data)].filter(
    (d): d is string => Boolean(d)
  );
  if (candidatas.length === 0) return null;
  return candidatas.reduce((menor, atual) => (atual.slice(0, 10) < menor.slice(0, 10) ? atual : menor));
}

/** "AAAA-MM-DD" ou "AAAA-MM-DD HH:MM:SS" -> "DD/MM/AAAA", igual o resto
 * do sistema (desktop) mostra as datas. */
export function formatarDataBr(dataIso: string | null): string {
  if (!dataIso) return "-";
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

export type LinhaHistorico = {
  embarque: Embarque;
  obra: Obra | null;
  totalRdos: number;
  percentualFinal: number | null;
  dias: number | null;
  pendentes: number;
  itensAvanco: ItensPorStatus;
};

/** "Dias" do histórico usa só o intervalo real coberto pelos RDOs (do mais
 * antigo ao mais recente) - igual o desktop já faz no Histórico de
 * embarques finalizados. Diferente do "dias a bordo" dos embarques ATIVOS
 * (que usa hoje como referência), aqui o embarque já acabou, então o que
 * importa é só o que os RDOs realmente cobriram. */
function diasEntreRdos(rdos: Rdo[]): number | null {
  const datas = rdos.map((r) => r.data).filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10));
  if (datas.length === 0) return null;
  const minData = datas.reduce((a, b) => (a < b ? a : b));
  const maxData = datas.reduce((a, b) => (a > b ? a : b));
  const diffMs = new Date(maxData + "T00:00:00").getTime() - new Date(minData + "T00:00:00").getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export async function buscarEmbarquesFinalizados(): Promise<LinhaHistorico[]> {
  const { data: embarques, error: erroEmb } = await supabase
    .from("embarques")
    .select("*")
    .eq("ativo", false)
    .order("data_inicio", { ascending: false });

  if (erroEmb) throw new Error(`Não consegui buscar o histórico: ${erroEmb.message}`);
  if (!embarques || embarques.length === 0) return [];

  const idsEmbarques = embarques.map((e) => e.id);
  const { data: rdos, error: erroRdos } = await supabase
    .from("rdos")
    .select("*")
    .in("embarque_id", idsEmbarques)
    .order("numero_rdo", { ascending: false });

  if (erroRdos) throw new Error(`Não consegui buscar os RDOs: ${erroRdos.message}`);

  const rdosPorEmbarque = new Map<number, Rdo[]>();
  for (const rdo of rdos || []) {
    const lista = rdosPorEmbarque.get(rdo.embarque_id) || [];
    lista.push(rdo);
    rdosPorEmbarque.set(rdo.embarque_id, lista);
  }

  return embarques.map((embarque) => {
    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const dias = diasEntreRdos(listaRdos);
    return {
      embarque,
      obra: null, // histórico não precisa da obra (empresa/previsão não fazem sentido pra um embarque já encerrado)
      totalRdos: listaRdos.length,
      percentualFinal: percentualDoRdo(listaRdos[0]),
      dias,
      pendentes: Math.max(0, (dias ?? 0) - listaRdos.length),
      itensAvanco: itensPorStatusDoRdo(listaRdos[0]),
    };
  });
}

export async function buscarEmbarquesAtivos(): Promise<LinhaEmbarque[]> {
  const { data: embarques, error: erroEmb } = await supabase
    .from("embarques")
    .select("*")
    .eq("ativo", true)
    .order("data_inicio", { ascending: false });

  if (erroEmb) throw new Error(`Não consegui buscar os embarques: ${erroEmb.message}`);
  if (!embarques || embarques.length === 0) return [];

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);

  const [{ data: obras, error: erroObras }, { data: rdos, error: erroRdos }] = await Promise.all([
    supabase.from("obras").select("*").in("id", idsObras),
    supabase.from("rdos").select("*").in("embarque_id", idsEmbarques).order("numero_rdo", { ascending: false }),
  ]);

  if (erroObras) throw new Error(`Não consegui buscar as obras: ${erroObras.message}`);
  if (erroRdos) throw new Error(`Não consegui buscar os RDOs: ${erroRdos.message}`);

  const obrasPorId = new Map<number, Obra>((obras || []).map((o) => [o.id, o]));
  const rdosPorEmbarque = new Map<number, Rdo[]>();
  for (const rdo of rdos || []) {
    const lista = rdosPorEmbarque.get(rdo.embarque_id) || [];
    lista.push(rdo);
    rdosPorEmbarque.set(rdo.embarque_id, lista);
  }

  return embarques.map((embarque) => {
    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const inicioReal = dataMaisAntiga(embarque.data_inicio, listaRdos);
    const diasEmbarcado = diasDesde(inicioReal);
    // assume 1 RDO por dia (confirmado que é sempre assim nessa operação) -
    // se "dias a bordo" for maior que o número de RDOs lançados, é sinal de
    // que faltou lançar/sincronizar RDO de algum dia (comum offshore, com
    // internet ruim) - o % de avanço mostrado, nesse caso, é só o do último
    // RDO que chegou, não necessariamente reflete o dia de hoje
    const rdosPendentes = Math.max(0, (diasEmbarcado ?? 0) - listaRdos.length);
    return {
      embarque,
      obra: obrasPorId.get(embarque.obra_id) || null,
      totalRdos: listaRdos.length,
      percentual: percentualDoRdo(listaRdos[0]),
      diasEmbarcado,
      dataInicioReal: inicioReal,
      itensAvanco: itensPorStatusDoRdo(listaRdos[0]),
      rdosPendentes,
    };
  });
}
