import { supabase } from "@/lib/supabase";

// IMPORTANTE: todo ID (id, obra_id, embarque_id, ...) é `string`, NUNCA
// `number`. O sistema gera esses IDs a partir de um hash do usuário de
// login (pra nunca colidir entre pessoas diferentes sincronizando),
// então eles são MUITO maiores do que o JavaScript consegue representar
// com precisão como número (Number.MAX_SAFE_INTEGER = 9007199254740991 -
// IDs reais já passam disso). Se um desses vira `number` em algum
// momento, o valor é arredondado silenciosamente, e qualquer busca que
// use esse valor arredondado pra achar o registro relacionado (obra de
// um embarque, RDOs de um embarque, etc.) simplesmente não acha nada -
// foi exatamente esse bug que fazia "Empresa" e "Previsão de
// desembarque" aparecerem vazios no card, mesmo o dado existindo certo
// na nuvem. Por isso as queries abaixo pedem esses campos com `::text`
// (em vez de `select("*")`), e tudo aqui trata id como string: nunca usar
// `Number(id)`, nunca declarar `Map<number, ...>` pra essas chaves.

export type Embarque = {
  id: string;
  obra_id: string;
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
  id: string;
  nome: string | null;
  empresa: string | null;
  local_flotel: string | null;
  local_codigo: string | null;
  gm_codigo: string | null;
  prefixo_rdo: string | null;
  data_desembarque_prevista: string | null;
};

export type ReferenciaObra = {
  id: string;
  obra_id: string;
  tipo: string;
  codigo: string;
  status: string; // "ativa" | "encerrada"
  data_abertura: string | null;
  data_encerramento: string | null;
  observacao: string | null;
};

export type Rdo = {
  id: string;
  embarque_id: string;
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
  // lista dos RDOs desse embarque (mais recente primeiro) - usado no botão
  // "Ver RDOs" do card (igual o desktop tem), não precisa buscar de novo
  rdos: RdoResumo[];
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
async function buscarReferenciasPorObra(idsObras: string[]): Promise<Map<string, ReferenciaObra[]>> {
  const mapa = new Map<string, ReferenciaObra[]>();
  if (idsObras.length === 0) return mapa;
  const { data, error } = await supabase
    .from("obra_referencias")
    .select("id::text, obra_id::text, tipo, codigo, status, data_abertura, data_encerramento, observacao")
    .in("obra_id", idsObras)
    .order("tipo", { ascending: true })
    .order("codigo", { ascending: true });
  if (error || !data) return mapa;
  for (const ref of data as unknown as ReferenciaObra[]) {
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
 * se fosse de hoje. Sem isso, um recado esquecido ficaria sempre visível.
 * Devolve também a hora (pro coordenador saber se é um aviso fresquinho
 * ou já de mais cedo no mesmo dia). */
export function recadoDeHoje(embarque: Embarque): { texto: string; hora: string; data: string } | null {
  if (!embarque.recado_dia || !embarque.recado_dia_atualizado_em) return null;
  const dataDoRecado = embarque.recado_dia_atualizado_em.slice(0, 10);
  if (dataDoRecado !== hojeIsoBrasil()) return null;
  const hora = embarque.recado_dia_atualizado_em.slice(11, 16) || "-";
  return { texto: embarque.recado_dia, hora, data: formatarDataBr(dataDoRecado) };
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
  id: string;
  numeroRdo: number;
  data: string | null;
  pdfUrl: string | null;
};

export type AnexoEmbarque = {
  id: string;
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

const COLUNAS_EMBARQUES =
  "id::text, obra_id::text, obra_nome, efetivo_nome, efetivo_funcao, data_inicio, data_fim, ativo, " +
  "status_final, justificativa_encerramento, recado_dia, recado_dia_atualizado_em";
const COLUNAS_OBRAS =
  "id::text, nome, empresa, local_flotel, local_codigo, prefixo_rdo, data_desembarque_prevista, gm_codigo";
const COLUNAS_RDOS =
  "id::text, embarque_id::text, numero_rdo, data, local_atuacao, status, arquivo_pdf_url, avanco_json, " +
  "avanco_percentual, descricao, justificativa_percentual, atualizado_em, referencias_dia_json";

export async function buscarEmbarquesFinalizados(filtros: FiltrosHistorico = {}): Promise<LinhaHistorico[]> {
  let query = supabase.from("embarques").select(COLUNAS_EMBARQUES).eq("ativo", false);
  if (filtros.colaborador) query = query.ilike("efetivo_nome", `%${filtros.colaborador}%`);
  if (filtros.obra) query = query.ilike("obra_nome", `%${filtros.obra}%`);
  if (filtros.dataInicio) query = query.gte("data_inicio", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data_fim", filtros.dataFim);
  query = query.order("data_inicio", { ascending: false });

  const { data: embarquesRaw, error: erroEmb } = await query;

  if (erroEmb) throw new Error(`Não consegui buscar o histórico: ${erroEmb.message}`);
  if (!embarquesRaw || embarquesRaw.length === 0) return [];
  // o `.select()` usa `::text` (cast do Postgres) pra evitar perda de
  // precisão nos IDs grandes - mas o supabase-js não entende essa sintaxe
  // na hora de inferir o tipo em tempo de compilação, e cai num tipo
  // genérico de erro (GenericStringError). O cast abaixo não muda nada em
  // tempo de execução (a query já roda certo), só corrige o tipo pro
  // TypeScript conseguir compilar.
  const embarques = embarquesRaw as unknown as Embarque[];

  const idsEmbarques = embarques.map((e) => e.id);
  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const [{ data: rdosRaw, error: erroRdos }, { data: obrasRaw, error: erroObras }] = await Promise.all([
    supabase
      .from("rdos")
      .select(COLUNAS_RDOS)
      .in("embarque_id", idsEmbarques)
      .order("numero_rdo", { ascending: false }),
    supabase.from("obras").select(COLUNAS_OBRAS).in("id", idsObras),
  ]);

  if (erroRdos) throw new Error(`Não consegui buscar os RDOs: ${erroRdos.message}`);
  if (erroObras) throw new Error(`Não consegui buscar as obras: ${erroObras.message}`);
  const rdos = rdosRaw as unknown as Rdo[];
  // precisa da obra mesmo no histórico (embarque já encerrado) - não pra
  // mostrar "previsão de desembarque" (não faz sentido pra quem já
  // desembarcou), mas porque "empresa" e "código da plataforma" entram no
  // nome padronizado do arquivo do RDO na hora de baixar (ver nomeArquivo.ts)
  const obras = obrasRaw as unknown as Obra[];
  const obrasPorId = new Map<string, Obra>((obras || []).map((o) => [o.id, o]));

  const referenciasPorObra = await buscarReferenciasPorObra(idsObras);

  const { data: anexosRaw, error: erroAnexos } = await supabase
    .from("anexos_embarque")
    .select("id::text, embarque_id::text, nome_arquivo, url_nuvem, enviado_por, enviado_em")
    .in("embarque_id", idsEmbarques)
    .order("enviado_em", { ascending: false });
  // se der erro (ex: tabela ainda não criada no Supabase), não trava o
  // histórico inteiro por causa disso - só mostra sem os anexos
  const anexos = anexosRaw as unknown as {
    id: string;
    embarque_id: string;
    nome_arquivo: string;
    url_nuvem: string | null;
    enviado_por: string | null;
    enviado_em: string | null;
  }[];
  const anexosPorEmbarque = new Map<string, AnexoEmbarque[]>();
  for (const anexo of erroAnexos ? [] : anexos || []) {
    const lista = anexosPorEmbarque.get(anexo.embarque_id) || [];
    lista.push({
      id: anexo.id, nomeArquivo: anexo.nome_arquivo, url: anexo.url_nuvem,
      enviadoPor: anexo.enviado_por, enviadoEm: anexo.enviado_em,
    });
    anexosPorEmbarque.set(anexo.embarque_id, lista);
  }

  const rdosPorEmbarque = new Map<string, Rdo[]>();
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
      obra: obrasPorId.get(embarque.obra_id) || null,
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
  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select(COLUNAS_EMBARQUES)
    .eq("ativo", true)
    .order("data_inicio", { ascending: false });

  if (erroEmb) throw new Error(`Não consegui buscar os embarques: ${erroEmb.message}`);
  if (!embarquesRaw || embarquesRaw.length === 0) return [];
  const embarques = embarquesRaw as unknown as Embarque[];

  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter(Boolean)));
  const idsEmbarques = embarques.map((e) => e.id);

  const [{ data: obrasRaw, error: erroObras }, { data: rdosRaw, error: erroRdos }, referenciasPorObra] = await Promise.all([
    supabase.from("obras").select(COLUNAS_OBRAS).in("id", idsObras),
    supabase.from("rdos").select(COLUNAS_RDOS).in("embarque_id", idsEmbarques).order("numero_rdo", { ascending: false }),
    buscarReferenciasPorObra(idsObras),
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
      // já vem ordenado do mais recente pro mais antigo (mesma query
      // acima, "numero_rdo" descendente)
      rdos: listaRdos.map((r) => ({
        id: r.id, numeroRdo: r.numero_rdo, data: r.data, pdfUrl: r.arquivo_pdf_url,
      })),
    };
  });
}

/** Todos os nomes de colaboradores que já apareceram em QUALQUER embarque
 * (ativo ou finalizado) - usado no autocomplete da tela "Histórico
 * colaborador" (diferente de `buscarOpcoesFiltro`, que só olha pra
 * embarques já finalizados). */
export async function buscarNomesTodosColaboradores(): Promise<string[]> {
  const { data, error } = await supabase.from("embarques").select("efetivo_nome");
  if (error || !data) return [];
  return Array.from(new Set(data.map((e) => e.efetivo_nome).filter((v): v is string => Boolean(v)))).sort();
}
