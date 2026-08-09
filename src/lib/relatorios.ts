import { supabase } from "@/lib/supabase";
import type { Embarque, Obra, Rdo } from "@/lib/embarques";

export type Periodo = {
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
  rotulo: string;
};

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mês de calendário normal: dia 1 ao último dia do mês. */
export function periodoMesCalendario(ano: number, mes: number): Periodo {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate(); // dia 0 do mês seguinte = último dia do mês atual
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim, rotulo: `${NOMES_MESES[mes - 1]}/${ano}` };
}

/** Período de fechamento da empresa: dia 20 do mês anterior ao dia 19 do mês
 * "rotulado" (ex: "Agosto/2026" = 20/07/2026 a 19/08/2026). */
export function periodoFechamento(ano: number, mes: number): Periodo {
  const dataFim = new Date(ano, mes - 1, 19);
  const dataInicio = new Date(ano, mes - 2, 20);
  return {
    inicio: formatarISO(dataInicio),
    fim: formatarISO(dataFim),
    rotulo: `Fechamento ${NOMES_MESES[mes - 1]}/${ano} (20 a 19)`,
  };
}

/** Anda um período pra frente ou pra trás (±1 mês), preservando se é
 * calendário ou fechamento. */
export function periodoAdjacente(periodo: Periodo, tipo: "calendario" | "fechamento", direcao: 1 | -1): Periodo {
  const [ano, mes] = periodo.fim.slice(0, 7).split("-").map(Number);
  let novoMes = mes + direcao;
  let novoAno = ano;
  if (novoMes > 12) { novoMes = 1; novoAno += 1; }
  if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
  return tipo === "fechamento" ? periodoFechamento(novoAno, novoMes) : periodoMesCalendario(novoAno, novoMes);
}

/** Quantos dias (inclusive) as duas faixas de data têm em comum - 0 se não
 * se cruzam de jeito nenhum. */
function diasSobrepostos(inicioA: string, fimA: string, inicioB: string, fimB: string): number {
  const maxInicio = inicioA > inicioB ? inicioA : inicioB;
  const minFim = fimA < fimB ? fimA : fimB;
  if (maxInicio > minFim) return 0;
  const diffMs = new Date(minFim + "T00:00:00").getTime() - new Date(maxInicio + "T00:00:00").getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/** Intervalo real de um embarque (início mais antigo entre o clique
 * administrativo e os RDOs; fim é a data de encerramento - ou, pra quem
 * ainda está embarcado, "hoje", pra poder contar as diárias já feitas
 * até agora dentro do período pedido). */
function intervaloRealDoEmbarque(embarque: Embarque, rdos: Rdo[]): { inicio: string | null; fim: string } {
  const datasInicio = [embarque.data_inicio, ...rdos.map((r) => r.data)]
    .filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10));
  const inicio = datasInicio.length > 0 ? datasInicio.reduce((a, b) => (a < b ? a : b)) : null;

  if (!embarque.ativo && embarque.data_fim) {
    const datasFim = [embarque.data_fim, ...rdos.map((r) => r.data)]
      .filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10));
    const fim = datasFim.length > 0 ? datasFim.reduce((a, b) => (a > b ? a : b)) : (inicio ?? formatarISO(new Date()));
    return { inicio, fim };
  }
  // ainda ativo (ou sem data_fim registrada) - conta até hoje
  return { inicio, fim: formatarISO(new Date()) };
}

export type DetalheEmbarqueRelatorio = {
  embarqueId: number;
  colaborador: string;
  obra: string;
  periodoNoRecorte: string; // ex: "05/08 → 12/08" - só a parte que caiu dentro do período pedido
  diariasNoRecorte: number;
  percentualUltimoRdo: number | null;
  itensPendentes: string[]; // nomes dos itens "a_iniciar" ou "em_andamento" no último RDO
  justificativa: string | null;
  aindaAtivo: boolean;
  statusFinal: "completo" | "com_pendencia" | null; // null = ainda ativo, ou embarque antigo sem essa info
  justificativaEncerramento: string | null; // por que ficou "com_pendencia" ao encerrar
};

export type LinhaRelatorioEmpresa = {
  empresa: string;
  numeroEmbarques: number;
  totalDiarias: number;
  colaboradoresDistintos: number;
  percentualMedio: number | null;
  completos: number; // embarques finalizados com status_final = "completo"
  comPendencia: number; // embarques finalizados com status_final = "com_pendencia"
  embarques: DetalheEmbarqueRelatorio[];
};

/** Um relatório por empresa, pro período pedido:
 * - "Nº de embarques": quantos embarques COMEÇARAM dentro do período
 * - "Total de diárias": soma dos dias de cada embarque que caem DENTRO do
 *   período - se um embarque atravessa a virada do período, só conta os
 *   dias que realmente aconteceram dentro dele (não joga tudo pro mês
 *   que começou), pra bater certinho com faturamento
 * - "Colaboradores distintos": quantas pessoas diferentes trabalharam
 * - "% médio": média do percentual de avanço mais recente de cada embarque */
export async function buscarRelatorioPorEmpresa(periodo: Periodo): Promise<LinhaRelatorioEmpresa[]> {
  // pega embarques que comecaram até o fim do período E (ainda não
  // acabaram, OU acabaram depois do início do período) - ou seja,
  // qualquer embarque que tenha ALGUMA sobreposição possível com o período
  const { data: embarques, error: erroEmb } = await supabase
    .from("embarques")
    .select("*")
    .lte("data_inicio", periodo.fim)
    .or(`data_fim.gte.${periodo.inicio},data_fim.is.null`);

  if (erroEmb) throw new Error(`Não consegui buscar os embarques: ${erroEmb.message}`);
  if (!embarques || embarques.length === 0) return [];

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);

  const [{ data: obras, error: erroObras }, { data: rdos, error: erroRdos }] = await Promise.all([
    supabase.from("obras").select("*").in("id", idsObras),
    supabase.from("rdos").select("*").in("embarque_id", idsEmbarques),
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

  type Acumulador = {
    numeroEmbarques: number;
    totalDiarias: number;
    colaboradores: Set<string>;
    percentuais: number[];
    embarques: DetalheEmbarqueRelatorio[];
    completos: number;
    comPendencia: number;
  };
  const porEmpresa = new Map<string, Acumulador>();

  function formatarCurto(iso: string): string {
    const [, mes, dia] = iso.split("-");
    return `${dia}/${mes}`;
  }

  for (const embarque of embarques) {
    const obra = obrasPorId.get(embarque.obra_id);
    const empresa = (obra?.empresa || "sem empresa").trim();
    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const { inicio, fim } = intervaloRealDoEmbarque(embarque, listaRdos);
    if (!inicio) continue;

    const diarias = diasSobrepostos(inicio, fim, periodo.inicio, periodo.fim);
    if (diarias === 0) continue; // não se sobrepõe de verdade com o período pedido

    const acumulador = porEmpresa.get(empresa) || {
      numeroEmbarques: 0, totalDiarias: 0, colaboradores: new Set<string>(), percentuais: [], embarques: [],
      completos: 0, comPendencia: 0,
    };
    acumulador.totalDiarias += diarias;
    if (inicio >= periodo.inicio && inicio <= periodo.fim) {
      acumulador.numeroEmbarques += 1; // só conta "novo embarque" se ele começou dentro do período
    }
    if (embarque.efetivo_nome) acumulador.colaboradores.add(embarque.efetivo_nome);
    const ultimoRdo = [...listaRdos].sort((a, b) => b.numero_rdo - a.numero_rdo)[0];
    const percentual = ultimoRdo?.avanco_percentual;
    if (percentual !== null && percentual !== undefined) acumulador.percentuais.push(percentual);

    // itens ainda não concluídos no último RDO - é o que responde "o que
    // ficou faltando", pra quem lê o relatório não precisar adivinhar
    let itensPendentes: string[] = [];
    if (ultimoRdo?.avanco_json) {
      try {
        const avanco = JSON.parse(ultimoRdo.avanco_json) as Record<string, string>;
        itensPendentes = Object.entries(avanco)
          .filter(([, status]) => status !== "concluido")
          .map(([nome]) => nome);
      } catch {
        itensPendentes = [];
      }
    }

    const inicioNoRecorte = inicio > periodo.inicio ? inicio : periodo.inicio;
    const fimNoRecorte = fim < periodo.fim ? fim : periodo.fim;

    const statusFinal = (embarque.status_final as "completo" | "com_pendencia" | null) ?? null;
    if (statusFinal === "completo") acumulador.completos += 1;
    if (statusFinal === "com_pendencia") acumulador.comPendencia += 1;

    acumulador.embarques.push({
      embarqueId: embarque.id,
      colaborador: embarque.efetivo_nome || "-",
      obra: embarque.obra_nome || obra?.nome || "-",
      periodoNoRecorte: `${formatarCurto(inicioNoRecorte)} → ${formatarCurto(fimNoRecorte)}`,
      diariasNoRecorte: diarias,
      percentualUltimoRdo: percentual ?? null,
      itensPendentes,
      justificativa: ultimoRdo?.justificativa_percentual || null,
      aindaAtivo: Boolean(embarque.ativo),
      statusFinal,
      justificativaEncerramento: embarque.justificativa_encerramento || null,
    });

    porEmpresa.set(empresa, acumulador);
  }

  return Array.from(porEmpresa.entries())
    .map(([empresa, acc]) => ({
      empresa,
      numeroEmbarques: acc.numeroEmbarques,
      totalDiarias: acc.totalDiarias,
      colaboradoresDistintos: acc.colaboradores.size,
      percentualMedio: acc.percentuais.length > 0
        ? Math.round(acc.percentuais.reduce((s, p) => s + p, 0) / acc.percentuais.length)
        : null,
      completos: acc.completos,
      comPendencia: acc.comPendencia,
      embarques: acc.embarques.sort((a, b) => b.diariasNoRecorte - a.diariasNoRecorte),
    }))
    .sort((a, b) => b.totalDiarias - a.totalDiarias);
}
