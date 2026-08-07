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

export type LinhaEmbarque = {
  embarque: Embarque;
  obra: Obra | null;
  totalRdos: number;
  percentual: number | null;
  diasEmbarcado: number | null;
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

function diasDesde(dataIso: string | null): number | null {
  if (!dataIso) return null;
  // desktop grava em formato ISO (AAAA-MM-DD), não brasileiro -
  // confirmado direto no código do desktop (criar_embarque usa
  // datetime.now().strftime("%Y-%m-%d"))
  const inicio = new Date(dataIso + "T00:00:00");
  if (Number.isNaN(inicio.getTime())) return null;
  const hoje = new Date();
  const diffMs = hoje.setHours(0, 0, 0, 0) - inicio.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
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
    return {
      embarque,
      obra: obrasPorId.get(embarque.obra_id) || null,
      totalRdos: listaRdos.length,
      percentual: percentualDoRdo(listaRdos[0]),
      diasEmbarcado: diasDesde(embarque.data_inicio),
    };
  });
}