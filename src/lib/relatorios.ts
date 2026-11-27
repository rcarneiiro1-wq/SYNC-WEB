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

/** Ano calendário inteiro: 1º de janeiro a 31 de dezembro. Pra enxergar o
 * ano todo de uma vez (ex: "quais empresas me deram mais trabalho esse
 * ano") sem ficar preso mês a mês - pedido do Rafael em 27/11, de olho
 * na conversa com o Fabiano. Reaproveita o mesmo `Periodo` (inicio/fim)
 * que o resto do relatório já entende, então não precisou mexer em mais
 * nada pra "ano" funcionar - só em como ele é montado e navegado. */
export function periodoAnoCalendario(ano: number): Periodo {
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, rotulo: `${ano}` };
}

/** Anda um período pra frente ou pra trás (±1 mês, ou ±1 ano pro tipo
 * "ano"), preservando o tipo (calendário, fechamento ou ano). */
export function periodoAdjacente(
  periodo: Periodo, tipo: "calendario" | "fechamento" | "ano", direcao: 1 | -1
): Periodo {
  if (tipo === "ano") {
    const anoAtual = Number(periodo.inicio.slice(0, 4));
    return periodoAnoCalendario(anoAtual + direcao);
  }
  const [ano, mes] = periodo.fim.slice(0, 7).split("-").map(Number);
  let novoMes = mes + direcao;
  let novoAno = ano;
  if (novoMes > 12) { novoMes = 1; novoAno += 1; }
  if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
  return tipo === "fechamento" ? periodoFechamento(novoAno, novoMes) : periodoMesCalendario(novoAno, novoMes);
}

/** Quantos dias (inclusive) as duas faixas de data têm em comum - 0 se não
 * se cruzam de jeito nenhum.
 *
 * Exportada (11/09) pra ser reaproveitada pelo painel do colaborador
 * (painelColaborador.ts) - é a MESMA conta de diária usada no relatório
 * por empresa, só que aplicada a um colaborador só em vez de somar todo
 * mundo. Reaproveitar em vez de duplicar evita as duas contas divergirem
 * um dia (a lógica de "fim real do embarque" logo abaixo tem uma
 * nuance sutil - ver comentário de `intervaloRealDoEmbarque`). */
export function diasSobrepostos(inicioA: string, fimA: string, inicioB: string, fimB: string): number {
  const maxInicio = inicioA > inicioB ? inicioA : inicioB;
  const minFim = fimA < fimB ? fimA : fimB;
  if (maxInicio > minFim) return 0;
  const diffMs = new Date(minFim + "T00:00:00").getTime() - new Date(maxInicio + "T00:00:00").getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/** Intervalo real de um embarque (início mais antigo entre o clique
 * administrativo e os RDOs; fim é a data de encerramento - ou, pra quem
 * ainda está embarcado, "hoje", pra poder contar as diárias já feitas
 * até agora dentro do período pedido). Exportada pelo mesmo motivo do
 * `diasSobrepostos` acima. */
export function intervaloRealDoEmbarque(embarque: Embarque, rdos: Rdo[]): { inicio: string | null; fim: string } {
  const datasInicio = [embarque.data_inicio, ...rdos.map((r) => r.data)]
    .filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10));
  const inicio = datasInicio.length > 0 ? datasInicio.reduce((a, b) => (a < b ? a : b)) : null;

  if (!embarque.ativo && embarque.data_fim) {
    // O "fim" real de trabalho é a data do ÚLTIMO RDO lançado, não a
    // data em que o embarque foi encerrado no sistema - essas duas datas
    // costumam ser diferentes na prática: a pessoa lança o último RDO
    // num dia (ex: 26/08), mas só encerra o embarque no sistema um ou
    // mais dias depois (ex: 27/08, já em terra). Antes, o cálculo pegava
    // o MÁXIMO entre embarque.data_fim e as datas dos RDOs - isso fazia
    // o dia do encerramento administrativo contar como um dia de diária
    // trabalhada mesmo sem nenhum RDO naquele dia, inflando a contagem
    // (RDOs até 26/08 + encerrado em 27/08 = contava 11 diárias em vez
    // das 10 realmente trabalhadas).
    const datasRdo = rdos.map((r) => r.data).filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10));
    const fim = datasRdo.length > 0
      ? datasRdo.reduce((a, b) => (a > b ? a : b))
      : embarque.data_fim.slice(0, 10); // sem nenhum RDO lançado - usa a data de encerramento mesmo, como reserva
    return { inicio, fim };
  }
  // ainda ativo (ou sem data_fim registrada) - conta até hoje
  return { inicio, fim: formatarISO(new Date()) };
}

export type DetalheEmbarqueRelatorio = {
  embarqueId: string;
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
  // 27/11: as CHAVES dos colaboradores (não só a contagem) - pra dar pra
  // somar/deduplicar entre empresas na "Visão geral" (ex: "3 colaboradores
  // distintos" somando Infotec + Hydra sem contar a mesma pessoa 2x, caso
  // ela apareça em mais de uma empresa no período).
  colaboradoresIds: string[];
  percentualMedio: number | null;
  completos: number; // embarques finalizados com status_final = "completo"
  comPendencia: number; // embarques finalizados com status_final = "com_pendencia"
  ativos: number; // embarques ainda em andamento (não encerrados)
  semInformacao: number; // encerrados, mas de antes dessa funcionalidade existir (status_final nulo)
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
  // IDs (id, obra_id, embarque_id...) são gerados a partir de um hash do
  // usuário de login, então passam de Number.MAX_SAFE_INTEGER - pedir
  // com `::text` (em vez de `select("*")`) evita que o JS arredonde o
  // valor e quebre o cruzamento com "obras"/"rdos" mais abaixo (mesmo
  // bug corrigido em embarques.ts).
  const COLUNAS_EMBARQUES =
    "id::text, obra_id::text, obra_nome, colaborador_id::text, efetivo_nome, efetivo_funcao, data_inicio, data_fim, ativo, " +
    "status_final, justificativa_encerramento, recado_dia, recado_dia_atualizado_em";
  const COLUNAS_OBRAS =
    "id::text, nome, empresa, local_flotel, local_codigo, prefixo_rdo, data_desembarque_prevista, gm_codigo";
  const COLUNAS_RDOS =
    "id::text, embarque_id::text, numero_rdo, data, local_atuacao, status, arquivo_pdf_url, avanco_json, " +
    "avanco_percentual, descricao, justificativa_percentual, atualizado_em, referencias_dia_json";

  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select(COLUNAS_EMBARQUES)
    .lte("data_inicio", periodo.fim)
    .or(`data_fim.gte.${periodo.inicio},data_fim.is.null`);

  if (erroEmb) throw new Error(`Não consegui buscar os embarques: ${erroEmb.message}`);
  if (!embarquesRaw || embarquesRaw.length === 0) return [];
  // mesmo motivo do embarques.ts: o supabase-js não entende o `::text` do
  // Postgres na hora de inferir o tipo em tempo de compilação (cai num
  // tipo genérico de erro) - isso não afeta a query em si, só o
  // TypeScript, e o cast abaixo corrige só isso.
  const embarques = embarquesRaw as unknown as Embarque[];

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);

  const [{ data: obrasRaw, error: erroObras }, { data: rdosRaw, error: erroRdos }] = await Promise.all([
    supabase.from("obras").select(COLUNAS_OBRAS).in("id", idsObras),
    supabase.from("rdos").select(COLUNAS_RDOS).in("embarque_id", idsEmbarques),
  ]);

  if (erroObras) throw new Error(`Não consegui buscar as obras: ${erroObras.message}`);
  if (erroRdos) throw new Error(`Não consegui buscar os RDOs: ${erroRdos.message}`);
  const obras = obrasRaw as unknown as Obra[];
  const rdos = rdosRaw as unknown as Rdo[];

  const obrasPorId = new Map<string, Obra>((obras || []).map((o) => [o.id, o]));
  const rdosPorEmbarque = new Map<string, Rdo[]>();
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
    ativos: number;
    semInformacao: number;
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
      completos: 0, comPendencia: 0, ativos: 0, semInformacao: 0,
    };
    acumulador.totalDiarias += diarias;
    if (inicio >= periodo.inicio && inicio <= periodo.fim) {
      acumulador.numeroEmbarques += 1; // só conta "novo embarque" se ele começou dentro do período
    }
    // 27/11: agrupa pelo colaborador_id (identidade estável), não pelo
    // texto do nome - senão renomear alguém (ex: corrigir "Gustavo" pra
    // "Gustavo Ricardo") inflava "Colaboradores distintos" contando a
    // mesma pessoa duas vezes. Só cai pro nome em embarque muito antigo,
    // de antes de colaborador_id existir.
    const chaveColaborador = embarque.colaborador_id || (embarque.efetivo_nome ? `nome:${embarque.efetivo_nome}` : null);
    if (chaveColaborador) acumulador.colaboradores.add(chaveColaborador);
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
    else if (statusFinal === "com_pendencia") acumulador.comPendencia += 1;
    else if (embarque.ativo) acumulador.ativos += 1;
    else acumulador.semInformacao += 1; // encerrado, mas de antes do status_final existir

    acumulador.embarques.push({
      embarqueId: embarque.id,
      colaborador: embarque.efetivo_nome || "-",
      obra: obra?.nome || embarque.obra_nome || "-",
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
      colaboradoresIds: Array.from(acc.colaboradores),
      percentualMedio: acc.percentuais.length > 0
        ? Math.round(acc.percentuais.reduce((s, p) => s + p, 0) / acc.percentuais.length)
        : null,
      completos: acc.completos,
      comPendencia: acc.comPendencia,
      ativos: acc.ativos,
      semInformacao: acc.semInformacao,
      embarques: acc.embarques.sort((a, b) => b.diariasNoRecorte - a.diariasNoRecorte),
    }))
    .sort((a, b) => b.totalDiarias - a.totalDiarias);
}

const NOMES_MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type PontoEvolucaoMensal = {
  mes: string; // "AAAA-MM"
  rotulo: string; // "Ago/26"
  porEmpresa: Record<string, { diarias: number; embarques: number }>;
};

/** Evolução mês a mês (diárias e embarques iniciados) por empresa, dentro
 * do período pedido - alimenta o gráfico de barras da "Visão geral"
 * (27/11, a pedido do Rafael depois de comparar com outro mockup).
 *
 * Reaproveita as MESMAS contas de `buscarRelatorioPorEmpresa`
 * (`intervaloRealDoEmbarque` + `diasSobrepostos`), só que fatiadas em
 * meses de calendário em vez de um período só - por isso busca os
 * embarques de novo em vez de reaproveitar o resultado dela, que já vem
 * agregado pro período inteiro (não dá pra "desagregar" de volta em
 * meses a partir dos totais já somados). */
export async function buscarEvolucaoMensal(periodo: Periodo): Promise<PontoEvolucaoMensal[]> {
  const COLUNAS_EMBARQUES = "id::text, obra_id::text, data_inicio, data_fim, ativo, status_final";
  const COLUNAS_OBRAS = "id::text, nome, empresa";
  const COLUNAS_RDOS = "id::text, embarque_id::text, numero_rdo, data";

  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select(COLUNAS_EMBARQUES)
    .lte("data_inicio", periodo.fim)
    .or(`data_fim.gte.${periodo.inicio},data_fim.is.null`);
  if (erroEmb) throw new Error(`Não consegui buscar os embarques: ${erroEmb.message}`);
  if (!embarquesRaw || embarquesRaw.length === 0) return [];
  const embarques = embarquesRaw as unknown as Embarque[];

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);
  const [{ data: obrasRaw, error: erroObras }, { data: rdosRaw, error: erroRdos }] = await Promise.all([
    supabase.from("obras").select(COLUNAS_OBRAS).in("id", idsObras),
    supabase.from("rdos").select(COLUNAS_RDOS).in("embarque_id", idsEmbarques),
  ]);
  if (erroObras) throw new Error(`Não consegui buscar as obras: ${erroObras.message}`);
  if (erroRdos) throw new Error(`Não consegui buscar os RDOs: ${erroRdos.message}`);
  const obras = obrasRaw as unknown as Obra[];
  const rdos = rdosRaw as unknown as Rdo[];

  const obrasPorId = new Map<string, Obra>((obras || []).map((o) => [o.id, o]));
  const rdosPorEmbarque = new Map<string, Rdo[]>();
  for (const rdo of rdos || []) {
    const lista = rdosPorEmbarque.get(rdo.embarque_id) || [];
    lista.push(rdo);
    rdosPorEmbarque.set(rdo.embarque_id, lista);
  }

  const intervalos = embarques
    .map((embarque) => {
      const obra = obrasPorId.get(embarque.obra_id);
      const empresa = (obra?.empresa || "sem empresa").trim();
      const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
      const { inicio, fim } = intervaloRealDoEmbarque(embarque, listaRdos);
      return { empresa, inicio, fim };
    })
    .filter((x): x is { empresa: string; inicio: string; fim: string } => Boolean(x.inicio));

  const [anoIni, mesIni] = periodo.inicio.slice(0, 7).split("-").map(Number);
  const [anoFim, mesFim] = periodo.fim.slice(0, 7).split("-").map(Number);
  const pontos: PontoEvolucaoMensal[] = [];
  let ano = anoIni;
  let mes = mesIni;
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    const mesPeriodo = periodoMesCalendario(ano, mes);
    const porEmpresa: Record<string, { diarias: number; embarques: number }> = {};
    for (const it of intervalos) {
      const diarias = diasSobrepostos(it.inicio, it.fim, mesPeriodo.inicio, mesPeriodo.fim);
      if (diarias === 0) continue;
      if (!porEmpresa[it.empresa]) porEmpresa[it.empresa] = { diarias: 0, embarques: 0 };
      porEmpresa[it.empresa].diarias += diarias;
      if (it.inicio >= mesPeriodo.inicio && it.inicio <= mesPeriodo.fim) porEmpresa[it.empresa].embarques += 1;
    }
    pontos.push({
      mes: `${ano}-${String(mes).padStart(2, "0")}`,
      rotulo: `${NOMES_MESES_CURTO[mes - 1]}/${String(ano).slice(2)}`,
      porEmpresa,
    });
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
  return pontos;
}

export type Insight = {
  tipo: "up" | "info" | "alerta";
  icone: string;
  titulo: string;
  descricao: string;
};

function capitalizar(nome: string): string {
  return nome.length > 0 ? nome.charAt(0).toUpperCase() + nome.slice(1) : nome;
}

/** Gera os "Principais insights" da Visão geral por regra simples em cima
 * dos números já calculados - SEM IA, sem chamada externa, só texto
 * condicional (27/11, ideia trazida pelo Rafael depois de ver outro
 * mockup - mais barato e mais rápido que gerar isso com um modelo a cada
 * carregamento de página, e sempre reproduz o mesmo resultado pro mesmo
 * dado). Recorta sozinho pra 1 empresa selecionada ou várias. */
export function gerarInsights(linhas: LinhaRelatorioEmpresa[], evolucao: PontoEvolucaoMensal[]): Insight[] {
  const insights: Insight[] = [];
  if (linhas.length === 0) return insights;

  const totalDiarias = linhas.reduce((s, l) => s + l.totalDiarias, 0);
  const totalEmbarques = linhas.reduce((s, l) => s + l.numeroEmbarques, 0);

  // 1) crescimento: embarques por mês subindo (ou se mantendo) em toda a
  // série relevante, com pelo menos 3 meses de histórico pra valer a pena
  for (const linha of linhas) {
    const serie = evolucao.map((p) => p.porEmpresa[linha.empresa]?.embarques ?? 0);
    const primeiraOcorrencia = serie.findIndex((v) => v > 0);
    const serieRelevante = primeiraOcorrencia >= 0 ? serie.slice(primeiraOcorrencia) : [];
    if (serieRelevante.length >= 3) {
      const nuncaCai = serieRelevante.every((v, i) => i === 0 || v >= serieRelevante[i - 1]);
      const cresceuDeVerdade = serieRelevante[serieRelevante.length - 1] > serieRelevante[0];
      if (nuncaCai && cresceuDeVerdade) {
        insights.push({
          tipo: "up", icone: "📈",
          titulo: `Crescimento da ${capitalizar(linha.empresa)}`,
          descricao: `Embarques subindo mês a mês: ${serieRelevante.join(" → ")}.`,
        });
        break; // só destaca uma empresa aqui, pra não poluir
      }
    }
  }

  // 2) maior volume operacional - só faz sentido comparando 2+ empresas
  if (linhas.length >= 2 && totalDiarias > 0 && totalEmbarques > 0) {
    const lider = [...linhas].sort((a, b) => b.totalDiarias - a.totalDiarias)[0];
    const participacaoDiarias = Math.round((lider.totalDiarias / totalDiarias) * 1000) / 10;
    const participacaoEmbarques = Math.round((lider.numeroEmbarques / totalEmbarques) * 1000) / 10;
    if (participacaoDiarias >= 60) {
      insights.push({
        tipo: "info", icone: "📊",
        titulo: "Maior volume operacional",
        descricao: `${capitalizar(lider.empresa)} concentrou ${participacaoEmbarques}% dos embarques e ${participacaoDiarias}% das diárias do período.`,
      });
    }
  }

  // 3) pendências em aberto - um alerta por empresa que tiver
  for (const linha of linhas) {
    if (linha.comPendencia > 0) {
      insights.push({
        tipo: "alerta", icone: "⚠️",
        titulo: `Pendência${linha.comPendencia > 1 ? "s" : ""} na ${capitalizar(linha.empresa)}`,
        descricao: `${linha.comPendencia} embarque${linha.comPendencia > 1 ? "s" : ""} encerrado${linha.comPendencia > 1 ? "s" : ""} com pendência em aberto - vale conferir antes de reportar.`,
      });
    }
  }

  // 4) concentração de risco - empresa rodando com 1 colaborador só
  for (const linha of linhas) {
    if (linha.colaboradoresDistintos === 1) {
      insights.push({
        tipo: "info", icone: "👥",
        titulo: `Concentração de recursos na ${capitalizar(linha.empresa)}`,
        descricao: `Toda a operação da ${capitalizar(linha.empresa)} no período dependeu de 1 único colaborador.`,
      });
    }
  }

  // 5) produtividade por colaborador - só faz sentido comparando 2+ empresas
  const comColaboradores = linhas.filter((l) => l.colaboradoresDistintos > 0);
  if (comColaboradores.length >= 2) {
    const partes = comColaboradores.map(
      (l) => `${capitalizar(l.empresa)}: ${Math.round((l.totalDiarias / l.colaboradoresDistintos) * 10) / 10} diárias/colaborador`
    );
    insights.push({
      tipo: "info", icone: "⚙️",
      titulo: "Produtividade por colaborador",
      descricao: `${partes.join(" · ")}.`,
    });
  }

  return insights.slice(0, 5); // no máximo 5, pra não lotar a lateral
}
