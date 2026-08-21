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
  recado_dia: string | null; // aviso rápido do dia (ex: "vento forte, sem operação hoje")
  recado_dia_atualizado_em: string | null;
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
  referencias_dia_json: string | null;
};

export type ItensPorStatus = {
  concluido: string[];
  em_andamento: string[];
  a_iniciar: string[];
};

export type ReferenciaDoDia = { tipo: string; codigo: string };

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
  referenciasHoje: ReferenciaDoDia[];
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

/** Quais referências (GM/MD/SS/WO) a pessoa marcou como "trabalhadas hoje"
 * no RDO mais recente - é isso que deve aparecer em destaque no lugar do
 * campo fixo de GM, NÃO a lista inteira de referências cadastradas na
 * obra (essa lista completa fica guardada à parte, como histórico/auditoria,
 * mas o destaque do card é sempre "o que está rolando agora"). */
function referenciasDoDia(rdo: Rdo | undefined): ReferenciaDoDia[] {
  if (!rdo?.referencias_dia_json) return [];
  try {
    const lista = JSON.parse(rdo.referencias_dia_json) as ReferenciaDoDia[];
    if (!Array.isArray(lista)) return [];
    return lista.filter((r) => r && r.tipo && r.codigo);
  } catch {
    return [];
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

/** Só mostra o recado se ele foi escrito HOJE - um aviso de "vento forte"
 * de 3 dias atrás não deveria continuar aparecendo pro coordenador como
 * se fosse de hoje. Sem isso, um recado esquecido ficaria sempre visível. */
export function recadoDeHoje(embarque: Embarque): string | null {
  if (!embarque.recado_dia || !embarque.recado_dia_atualizado_em) return null;
  const dataDoRecado = embarque.recado_dia_atualizado_em.slice(0, 10);
  return dataDoRecado === hojeIsoBrasil() ? embarque.recado_dia : null;
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
    return { dias: null, inicio: fallbackInicio, fim: fallbackFim };
  }
  const minData = datas.reduce((a, b) => (a < b ? a : b));
  const maxData = datas.reduce((a, b) => (a > b ? a : b));
  const diffMs = new Date(maxData + "T00:00:00").getTime() - new Date(minData + "T00:00:00").getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return { dias, inicio: minData, fim: maxData };
}

export type FiltrosHistorico = {
  colaborador?: string;
  obra?: string;
  dataInicio?: string; // AAAA-MM-DD
  dataFim?: string; // AAAA-MM-DD
  situacao?: "todos" | "concluido" | "pendencia";
};

/** Só os nomes distintos, pra popular os dropdowns de busca dos filtros -
 * uma query bem mais leve que a do histórico completo (só 2 colunas de
 * texto, sem juntar com RDOs), então é seguro rodar assim que a tela
 * de filtros abre, sem violar a ideia de "nada pesado antes do Buscar". */
export async function buscarOpcoesFiltro(): Promise<{ colaboradores: string[]; obras: string[] }> {
  const { data, error } = await supabase.from("embarques").select("efetivo_nome, obra_nome").eq("ativo", false);
  if (error || !data) return { colaboradores: [], obras: [] };
  const colaboradores = Array.from(new Set(data.map((e) => e.efetivo_nome).filter((v): v is string => Boolean(v)))).sort();
  const obras = Array.from(new Set(data.map((e) => e.obra_nome).filter((v): v is string => Boolean(v)))).sort();
  return { colaboradores, obras };
}

export async function buscarEmbarquesFinalizados(filtros: FiltrosHistorico = {}): Promise<LinhaHistorico[]> {
  let query = supabase.from("embarques").select("*").eq("ativo", false);
  if (filtros.colaborador) query = query.ilike("efetivo_nome", `%${filtros.colaborador}%`);
  if (filtros.obra) query = query.ilike("obra_nome", `%${filtros.obra}%`);
  if (filtros.dataInicio) query = query.gte("data_inicio", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data_fim", filtros.dataFim);
  query = query.order("data_inicio", { ascending: false });

  const { data: embarques, error: erroEmb } = await query;

  if (erroEmb) throw new Error(`Não consegui buscar o histórico: ${erroEmb.message}`);
  if (!embarques || embarques.length === 0) return [];

  const idsEmbarques = embarques.map((e) => e.id);
  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const { data: rdos, error: erroRdos } = await supabase
    .from("rdos")
    .select("*")
    .in("embarque_id", idsEmbarques)
    .order("numero_rdo", { ascending: false });

  if (erroRdos) throw new Error(`Não consegui buscar os RDOs: ${erroRdos.message}`);

  const referenciasPorObra = await buscarReferenciasPorObra(idsObras);

  const { data: anexos, error: erroAnexos } = await supabase
    .from("anexos_embarque")
    .select("*")
    .in("embarque_id", idsEmbarques)
    .order("enviado_em", { ascending: false });
  // se der erro (ex: tabela ainda não criada no Supabase), não trava o
  // histórico inteiro por causa disso - só mostra sem os anexos
  const anexosPorEmbarque = new Map<number, AnexoEmbarque[]>();
  for (const anexo of erroAnexos ? [] : anexos || []) {
    const lista = anexosPorEmbarque.get(anexo.embarque_id) || [];
    lista.push({
      id: anexo.id, nomeArquivo: anexo.nome_arquivo, url: anexo.url_nuvem,
      enviadoPor: anexo.enviado_por, enviadoEm: anexo.enviado_em,
    });
    anexosPorEmbarque.set(anexo.embarque_id, lista);
  }

  const rdosPorEmbarque = new Map<number, Rdo[]>();
  for (const rdo of rdos || []) {
    const lista = rdosPorEmbarque.get(rdo.embarque_id) || [];
    lista.push(rdo);
    rdosPorEmbarque.set(rdo.embarque_id, lista);
  }

  const linhas = embarques.map((embarque) => {
    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const { dias, inicio, fim } = intervaloEntreRdos(listaRdos, embarque.data_inicio, embarque.data_fim);
    const ultimoRdo = listaRdos[0];
    return {
      embarque,
      obra: null, // histórico não precisa da obra (empresa/previsão não fazem sentido pra um embarque já encerrado)
      totalRdos: listaRdos.length,
      percentualFinal: percentualDoRdo(ultimoRdo),
      dias,
      pendentes: Math.max(0, (dias ?? 0) - listaRdos.length),
      itensAvanco: itensPorStatusDoRdo(ultimoRdo),
      inicioReal: inicio,
      fimReal: fim,
      percentualDescasado: temDescompassoDePercentual(ultimoRdo),
      percentualPelosItens: percentualPelosItens(ultimoRdo),
      justificativa: ultimoRdo?.justificativa_percentual ?? null,
      rdos: [...listaRdos]
        .sort((a, b) => a.numero_rdo - b.numero_rdo)
        .map((r) => ({ id: r.id, numeroRdo: r.numero_rdo, data: r.data, pdfUrl: r.arquivo_pdf_url })),
      anexos: anexosPorEmbarque.get(embarque.id) || [],
      referencias: referenciasPorObra.get(embarque.obra_id) || [],
    };
  });

  // "situação" depende do pendentes calculado acima, não dá pra filtrar
  // isso direto na query do Supabase - mas nesse ponto o conjunto já foi
  // reduzido pelos outros filtros (colaborador/obra/data), então filtrar
  // em memória aqui é barato.
  // Considera as DUAS fontes de pendência: o status_final gravado no
  // encerramento (a informação de verdade, quando existe) e o gap de
  // dias-sem-RDO calculado (fallback pra embarques antigos, sem essa
  // informação ainda).
  const temPendencia = (l: LinhaHistorico) => l.embarque.status_final === "com_pendencia" || l.pendentes > 0;
  if (filtros.situacao === "concluido") return linhas.filter((l) => !temPendencia(l));
  if (filtros.situacao === "pendencia") return linhas.filter((l) => temPendencia(l));
  return linhas;
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

  const [{ data: obras, error: erroObras }, { data: rdos, error: erroRdos }, referenciasPorObra] = await Promise.all([
    supabase.from("obras").select("*").in("id", idsObras),
    supabase.from("rdos").select("*").in("embarque_id", idsEmbarques).order("numero_rdo", { ascending: false }),
    buscarReferenciasPorObra(idsObras),
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

  const hojeIso = hojeIsoBrasil();

  return embarques.map((embarque) => {
    const listaRdos = rdosPorEmbarque.get(embarque.id) || [];
    const inicioReal = dataMaisAntiga(embarque.data_inicio, listaRdos);
    const diasEmbarcado = diasDesde(inicioReal);
    // assume 1 RDO por dia (confirmado que é sempre assim nessa operação) -
    // se "dias a bordo" for maior que o número de RDOs lançados, é sinal de
    // que faltou lançar/sincronizar RDO de algum dia (comum offshore, com
    // internet ruim) - o % de avanço mostrado, nesse caso, é só o do último
    // RDO que chegou, não necessariamente reflete o dia de hoje.
    //
    // MAS: o dia de HOJE ainda não "fechou" - não é uma pendência de
    // verdade só porque o RDO de hoje ainda não foi lançado (o dia ainda
    // está rolando). Por isso, se o RDO mais recente não é de hoje, um
    // desses dias "faltando" é justamente o de hoje (esperado, não é
    // atraso) - só conta como pendência de verdade o que sobrar depois
    // de descontar esse.
    const gapBruto = Math.max(0, (diasEmbarcado ?? 0) - listaRdos.length);
    const rdoDeHojeJaChegou = listaRdos.some((r) => (r.data ?? "").slice(0, 10) === hojeIso);
    const rdosPendentes = rdoDeHojeJaChegou ? gapBruto : Math.max(0, gapBruto - 1);
    const ultimoRdo = listaRdos[0];
    return {
      embarque,
      obra: obrasPorId.get(embarque.obra_id) || null,
      totalRdos: listaRdos.length,
      percentual: percentualDoRdo(ultimoRdo),
      diasEmbarcado,
      dataInicioReal: inicioReal,
      itensAvanco: itensPorStatusDoRdo(ultimoRdo),
      rdosPendentes,
      percentualDescasado: temDescompassoDePercentual(ultimoRdo),
      percentualPelosItens: percentualPelosItens(ultimoRdo),
      referencias: referenciasPorObra.get(embarque.obra_id) || [],
      referenciasHoje: referenciasDoDia(ultimoRdo),
    };
  });
}
