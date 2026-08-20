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
  status_final: string | null; // "completo" | "com_pendencia" | null (ainda ativo, ou embarque antigo sem essa info)
  justificativa_encerramento: string | null;
};

export type Obra = {
  id: number;
  nome: string | null;
  empresa: string | null;
  local_flotel: string | null;
  local_codigo: string | null;
  gm_codigo: string | null;
  prefixo_rdo: string | null;
  data_desembarque_prevista: string | null;
};

export type ReferenciaObra = {
  id: number;
  obra_id: number;
  tipo: string;
  codigo: string;
  status: string; // "ativa" | "encerrada"
  data_abertura: string | null;
  data_encerramento: string | null;
  observacao: string | null;
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
  descricao: string | null;
  arquivo_pdf_url: string | null;
  justificativa_percentual: string | null;
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
  percentualDescasado: boolean;
  percentualPelosItens: number | null;
  referencias: ReferenciaObra[];
};

/** % de avanço do RDO mais recente - mesma prioridade do desktop:
 * usa o percentual informado manualmente, só calcula em cima da lista
 * de itens se não tiver o manual. */
function percentualDoRdo(rdo: Rdo | undefined): number | null {
  if (!rdo) return null;
  if (rdo.avanco_percentual !== null && rdo.avanco_percentual !== undefined) {
    return rdo.avanco_percentual;
  }
  return percentualPelosItens(rdo);
}

/** % calculado pelos itens do checklist (FLARE/PROA/...), pra comparar
 * com o percentualDoRdo() e pegar quando o número digitado à mão está
 * bem fora do que os itens mostram. Concluído conta como 100%, em
 * andamento conta como 50% (progresso parcial é normal - não é 0%
 * só porque o item ainda não foi finalizado), a iniciar conta como 0%. */
function percentualPelosItens(rdo: Rdo | undefined): number | null {
  if (!rdo?.avanco_json) return null;
  try {
    const avanco = JSON.parse(rdo.avanco_json) as Record<string, string>;
    const valores = Object.values(avanco);
    if (valores.length === 0) return null;
    const pontos = valores.reduce((soma, v) => {
      if (v === "concluido") return soma + 100;
      if (v === "em_andamento") return soma + 50;
      return soma;
    }, 0);
    return Math.round(pontos / valores.length);
  } catch {
    return null;
  }
}

/** true quando a pessoa digitou um % geral manualmente que está bem
 * fora do que os itens do checklist mostram (ex: digitou "100%" mas
 * vários itens ainda não foram nem iniciados). Só compara quando os dois
 * valores existem de verdade - se só tiver o calculado, não tem o que
 * descasar. Margem de 15 pontos: progresso parcial dentro de um item
 * "em andamento" é normal e não deve soar alarme - só pega diferença
 * grande o suficiente pra realmente parecer um esquecimento. */
function temDescompassoDePercentual(rdo: Rdo | undefined): boolean {
  if (!rdo || rdo.avanco_percentual === null || rdo.avanco_percentual === undefined) return false;
  const pelosItens = percentualPelosItens(rdo);
  if (pelosItens === null) return false;
  return Math.abs(rdo.avanco_percentual - pelosItens) > 15;
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

/** Busca as referências (GM/MD/SS/WO) de uma ou mais obras de uma vez,
 * já agrupadas por obra_id - pra não precisar de uma query por obra.
 * Se a tabela ainda não existir no Supabase (projeto não migrado ainda),
 * não trava a página - só devolve vazio, igual já é feito com anexos. */
async function buscarReferenciasPorObra(idsObras: number[]): Promise<Map<number, ReferenciaObra[]>> {
  const mapa = new Map<number, ReferenciaObra[]>();
  if (idsObras.length === 0) return mapa;
  const { data, error } = await supabase
    .from("obra_referencias")
    .select("*")
    .in("obra_id", idsObras)
    .order("tipo", { ascending: true })
    .order("codigo", { ascending: true });
  if (error || !data) return mapa;
  for (const ref of data as ReferenciaObra[]) {
    const lista = mapa.get(ref.obra_id) || [];
    lista.push(ref);
    mapa.set(ref.obra_id, lista);
  }
  return mapa;
}

/** "Hoje" de verdade no fuso de Brasília (AAAA-MM-DD) - NÃO usar
 * `new Date()` puro pra isso: no servidor (Vercel roda em UTC), depois
 * das ~21h em Brasília já é "amanhã" em UTC, e qualquer conta de "dias
 * desde X" fica adiantada em 1 dia bem nesse horário - foi exatamente
 * esse bug que fez o card mostrar "2 dias a bordo" pra quem embarcou
 * HOJE mesmo. */
export function hojeIsoBrasil(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  });
  return formatter.format(new Date()); // en-CA formata como AAAA-MM-DD
}

function diasDesde(dataIso: string | null): number | null {
  if (!dataIso) return null;
  // tanto "embarques.data_inicio" (AAAA-MM-DD) quanto "rdos.data"
  // (AAAA-MM-DD HH:MM:SS, é assim que o sqlite grava datetime por padrão)
  // vêm com os 10 primeiros caracteres em ISO - pega só essa parte,
  // funciona pros dois formatos
  const somenteData = dataIso.slice(0, 10);
  const inicio = new Date(somenteData + "T00:00:00Z");
  if (Number.isNaN(inicio.getTime())) return null;
  const hoje = new Date(hojeIsoBrasil() + "T00:00:00Z");
  const diffMs = hoje.getTime() - inicio.getTime();
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

export type RdoResumo = {
  id: number;
  numeroRdo: number;
  data: string | null;
  pdfUrl: string | null;
};

export type AnexoEmbarque = {
  id: number;
  nomeArquivo: string;
  url: string | null;
  enviadoPor: string | null;
  enviadoEm: string | null;
};

export type LinhaHistorico = {
  embarque: Embarque;
  obra: Obra | null;
  totalRdos: number;
  percentualFinal: number | null;
  dias: number | null;
  pendentes: number;
  itensAvanco: ItensPorStatus;
  inicioReal: string | null;
  fimReal: string | null;
  percentualDescasado: boolean;
  percentualPelosItens: number | null;
  justificativa: string | null;
  rdos: RdoResumo[];
  anexos: AnexoEmbarque[];
  referencias: ReferenciaObra[];
};

/** "Dias" do histórico usa só o intervalo real coberto pelos RDOs (do mais
 * antigo ao mais recente) - igual o desktop já faz no Histórico de
 * embarques finalizados. Diferente do "dias a bordo" dos embarques ATIVOS
 * (que usa hoje como referência), aqui o embarque já acabou, então o que
 * importa é só o que os RDOs realmente cobriram.
 *
 * Devolve também as datas mín/máx usadas nessa conta - "Início"/"Fim"
 * mostrados na tela PRECISAM ser essas mesmas datas (não a data
 * administrativa de quando alguém clicou Iniciar/Encerrar), senão os
 * números batem errado entre si (ex: "Início 05/08, Fim 07/08" mas
 * "Dias: 1" - inconsistente, porque um vem de um lugar e o outro de outro). */
function intervaloEntreRdos(
  rdos: Rdo[],
  fallbackInicio: string | null,
  fallbackFim: string | null
): { dias: number | null; inicio: string | null; fim: string | null } {
  const datas = rdos.map((r) => r.data).filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10));
  if (datas.length === 0) {
    return { dias: null, inicio:
