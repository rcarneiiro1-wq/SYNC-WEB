"use client";

import { useEffect, useMemo, useState } from "react";
import { Ship, Calendar, Users, Clock, TrendingUp, Activity, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import {
  buscarRelatorioPorEmpresa,
  buscarEvolucaoMensal,
  gerarInsights,
  periodoMesCalendario,
  periodoFechamento,
  periodoAnoCalendario,
  periodoAdjacente,
  type Periodo,
  type LinhaRelatorioEmpresa,
  type PontoEvolucaoMensal,
} from "@/lib/relatorios";
import { SeletorEmpresas } from "@/components/SeletorEmpresas";

type TipoPeriodo = "calendario" | "fechamento" | "ano";
type MetricaParticipacao = "embarques" | "diarias";

function periodoAtual(tipo: TipoPeriodo): Periodo {
  const hoje = new Date();
  if (tipo === "ano") return periodoAnoCalendario(hoje.getFullYear());
  return tipo === "fechamento"
    ? periodoFechamento(hoje.getFullYear(), hoje.getMonth() + 1)
    : periodoMesCalendario(hoje.getFullYear(), hoje.getMonth() + 1);
}

function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function capitalizar(nome: string): string {
  return nome.length > 0 ? nome.charAt(0).toUpperCase() + nome.slice(1) : nome;
}

/** 27/11 (pedido do Rafael, seguindo a referência "Painel de Desempenho
 * por Empresa"): Infotec e Hydra ganham uma cor FIXA (azul escuro / azul
 * claro), em vez da paleta cíclica por hash que o resto do app usa (ver
 * `corDaEmpresa` em SeletorEmpresas.tsx) - fica igual à imagem de
 * referência enquanto só existirem essas duas. Qualquer empresa nova cai
 * de volta na paleta cíclica existente, então o sistema não quebra
 * quando a 3ª empresa for cadastrada - só não vai ter uma cor "fixa"
 * reservada pra ela até alguém decidir uma. */
const CORES_FIXAS: Record<string, string> = {
  infotec: "#2C5480", // azul escuro (mesmo tom do token --color-azul-escuro já usado no resto do app)
  hydra: "#7FB2E5", // azul claro
};

function corPrincipalEmpresa(nome: string): string {
  const fixa = CORES_FIXAS[nome.trim().toLowerCase()];
  if (fixa) return fixa;
  // fallback determinístico (mesma lógica do SeletorEmpresas) pra empresas futuras
  const PALETA_FALLBACK = ["#3D6FA6", "#3d7a3d", "#6a4fb0", "#c07a12", "#c0392b", "#0f9488"];
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  return PALETA_FALLBACK[soma % PALETA_FALLBACK.length];
}

/** Classificação objetiva da saúde de uma empresa, em 3 níveis - baseada
 * só nos campos que já existem (completos/comPendencia), sem inventar
 * critério novo nem precisar de dado novo (pedido explícito do Rafael,
 * 27/11):
 * - sem nenhum embarque finalizado ainda (só ativos), ou 0 pendências
 *   entre os finalizados -> saudável
 * - pendências são MENOS da metade dos embarques já finalizados -> atenção
 * - pendências são METADE OU MAIS dos finalizados -> crítica
 * ("Finalizado" = completo ou com_pendencia; ativos não entram nessa
 * conta porque ainda não tiveram chance de dar problema). */
function classificarSaude(linha: LinhaRelatorioEmpresa): { classe: "saudavel" | "atencao" | "critica" } {
  const finalizados = linha.completos + linha.comPendencia;
  if (finalizados === 0 || linha.comPendencia === 0) return { classe: "saudavel" };
  const taxaPendencia = linha.comPendencia / finalizados;
  return { classe: taxaPendencia >= 0.5 ? "critica" : "atencao" };
}

const ROTULO_BADGE_CURTO = { saudavel: "Bom", atencao: "Atenção", critica: "Crítico" } as const;
const ICONE_BADGE = { saudavel: "✓", atencao: "⚠", critica: "✕" } as const;
const CLASSE_BADGE = {
  saudavel: "text-verde bg-verde/10",
  atencao: "text-amarelo bg-amarelo/10",
  critica: "text-vermelho bg-vermelho/10",
} as const;

function BadgeSaude({ linha }: { linha: LinhaRelatorioEmpresa }) {
  const saude = classificarSaude(linha);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${CLASSE_BADGE[saude.classe]}`}>
      {ICONE_BADGE[saude.classe]} {ROTULO_BADGE_CURTO[saude.classe]}
    </span>
  );
}

/** Frase dinâmica do rodapé do card de saúde - gerada por regra simples
 * em cima dos mesmos campos, sem IA (pedido do Rafael, 27/11). */
function fraseStatusSaude(linha: LinhaRelatorioEmpresa): string {
  if (linha.comPendencia > 0) {
    return linha.comPendencia > 1
      ? `${linha.comPendencia} embarques com pendência precisam de atenção.`
      : "1 embarque com pendência precisa de atenção.";
  }
  if (linha.ativos > 0) {
    return linha.ativos > 1
      ? `${linha.ativos} embarques ainda estão em andamento.`
      : "1 embarque ainda está em andamento.";
  }
  return "Todos os embarques do período foram concluídos.";
}

const BADGE_SAUDE_LONGO = {
  saudavel: { label: "Operação saudável", classe: "bg-verde/10 text-verde" },
  atencao: { label: "Atenção", classe: "bg-amarelo/10 text-amarelo" },
  critica: { label: "Situação crítica", classe: "bg-vermelho/10 text-vermelho" },
} as const;

/** Card rico de "Saúde da execução" por empresa - redesenhado em 27/11 a
 * pedido do Rafael (prompt + imagem de referência), no lugar do bloco
 * mais enxuto de antes. Usa só campos que já existem em
 * LinhaRelatorioEmpresa (completos/comPendencia/ativos/numeroEmbarques) -
 * nenhum dado novo, nenhuma consulta nova. */
function CardSaudeEmpresa({ linha }: { linha: LinhaRelatorioEmpresa }) {
  const saude = classificarSaude(linha);
  const badge = BADGE_SAUDE_LONGO[saude.classe];
  const taxaConclusao = linha.numeroEmbarques > 0 ? Math.round((linha.completos / linha.numeroEmbarques) * 100) : 0;
  const cor = corPrincipalEmpresa(linha.empresa);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#E3F2FD", color: "#1E88E5" }}>
            <Activity size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-navy">Saúde da execução (qualidade)</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 capitalize truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
              {linha.empresa} · {linha.numeroEmbarques} embarque{linha.numeroEmbarques === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${badge.classe}`}>
          ● {badge.label}
        </span>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <DonutChart
          tamanho={104}
          espessura={14}
          segmentos={[
            { empresa: "concluidos", valor: linha.completos, cor: "#639922" },
            { empresa: "resto", valor: Math.max(linha.numeroEmbarques - linha.completos, 0), cor: "#e8ecf1" },
          ]}
          rotuloCentro={`${taxaConclusao}%`}
          legendaCentro="conclusão"
        />
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-extrabold text-navy leading-tight">
            {linha.completos} <span className="text-sm font-medium text-gray-400">de {linha.numeroEmbarques}</span>
          </p>
          <p className="text-xs text-gray-400 mb-2">Embarques concluídos</p>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-verde" style={{ width: `${taxaConclusao}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-lg px-3 py-2.5 bg-verde/10">
          <div className="flex items-center gap-1.5 text-verde mb-1">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Concluídos</span>
          </div>
          <p className="text-lg font-extrabold text-navy">{linha.completos}</p>
        </div>
        <div className="rounded-lg px-3 py-2.5 bg-azul/10">
          <div className="flex items-center gap-1.5 text-azul mb-1">
            <Clock size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Em andamento</span>
          </div>
          <p className="text-lg font-extrabold text-navy">{linha.ativos}</p>
        </div>
        <div className="rounded-lg px-3 py-2.5 bg-amarelo/10">
          <div className="flex items-center gap-1.5 text-amarelo mb-1">
            <AlertTriangle size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Pendências</span>
          </div>
          <p className="text-lg font-extrabold text-navy">{linha.comPendencia}</p>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
        <Info size={13} className="text-gray-400 shrink-0" />
        {fraseStatusSaude(linha)}
      </div>
    </div>
  );
}

/** Donut genérico (SVG puro, sem biblioteca - o projeto não tem nenhuma
 * já instalada) via o truque clássico de `strokeDasharray`/`strokeDashoffset`
 * num círculo só. Reaproveitado nos dois cards de participação (topo e
 * rodapé) - só muda o que entra em `segmentos`. */
function DonutChart({
  segmentos,
  tamanho = 168,
  espessura = 24,
  rotuloCentro,
  legendaCentro,
}: {
  segmentos: { empresa: string; valor: number; cor: string }[];
  tamanho?: number;
  espessura?: number;
  rotuloCentro: string;
  legendaCentro: string;
}) {
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const total = segmentos.reduce((s, d) => s + d.valor, 0);
  let acumulado = 0;

  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox={`0 0 ${tamanho} ${tamanho}`} width={tamanho} height={tamanho} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="#eef2f6" strokeWidth={espessura} />
        {total > 0 &&
          segmentos
            .filter((seg) => seg.valor > 0)
            .map((seg) => {
              const comprimento = (seg.valor / total) * circunferencia;
              const offset = -acumulado;
              acumulado += comprimento;
              return (
                <circle
                  key={seg.empresa}
                  cx={tamanho / 2}
                  cy={tamanho / 2}
                  r={raio}
                  fill="none"
                  stroke={seg.cor}
                  strokeWidth={espessura}
                  strokeDasharray={`${comprimento} ${circunferencia - comprimento}`}
                  strokeDashoffset={offset}
                >
                  <title>{`${capitalizar(seg.empresa)}: ${seg.valor}`}</title>
                </circle>
              );
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-navy leading-tight">{rotuloCentro}</span>
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{legendaCentro}</span>
      </div>
    </div>
  );
}

function LinhaTabela({ linha, maiorDiarias }: { linha: LinhaRelatorioEmpresa; maiorDiarias: number }) {
  const [aberto, setAberto] = useState(false);
  const proporcao = maiorDiarias > 0 ? Math.round((linha.totalDiarias / maiorDiarias) * 100) : 0;
  const diariasPorColaborador = linha.colaboradoresDistintos > 0
    ? Math.round((linha.totalDiarias / linha.colaboradoresDistintos) * 10) / 10
    : null;
  const diasPorEmbarque = linha.numeroEmbarques > 0
    ? Math.round((linha.totalDiarias / linha.numeroEmbarques) * 10) / 10
    : null;
  const cor = corPrincipalEmpresa(linha.empresa);

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0">
        <td className="py-3.5 px-3">
          <p className="text-sm font-semibold text-navy capitalize flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
            {linha.empresa}
          </p>
        </td>
        <td className="py-3.5 px-2 text-center text-sm text-gray-600">{linha.numeroEmbarques}</td>
        <td className="py-3.5 px-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 w-10 text-right">{linha.totalDiarias}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${proporcao}%`, backgroundColor: cor }} />
            </div>
          </div>
        </td>
        <td className="py-3.5 px-2 text-center text-sm text-gray-600">{linha.colaboradoresDistintos}</td>
        <td className="py-3.5 px-2 text-center text-sm text-gray-600">
          {diariasPorColaborador !== null ? diariasPorColaborador : "-"}
        </td>
        <td className="py-3.5 px-2 text-center text-sm text-gray-600">
          {diasPorEmbarque !== null ? diasPorEmbarque : "-"}
        </td>
        <td className="py-3.5 px-2 text-center text-sm text-gray-600">
          {linha.percentualMedio !== null ? `${linha.percentualMedio}%` : "-"}</td>
        <td className="py-3.5 px-2 text-center"><BadgeSaude linha={linha} /></td>
        <td className="py-3.5 px-2 text-center">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            className="text-xs font-medium text-azul hover:underline cursor-pointer whitespace-nowrap"
          >
            {aberto ? "Fechar ▲" : "Detalhes ▼"}
          </button>
        </td>
      </tr>
      {aberto && (
        <tr className="bg-gray-50/70">
          <td colSpan={8} className="px-4 pb-4 pt-1">
            {linha.embarques.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Nenhum embarque no detalhe.</p>
            ) : (
              <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2 px-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Colaborador</th>
                      <th className="py-2 px-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Plataforma</th>
                      <th className="py-2 px-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Período</th>
                      <th className="py-2 px-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Diárias</th>
                      <th className="py-2 px-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">%</th>
                      <th className="py-2 px-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">O que falta / observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linha.embarques.map((e) => (
                      <tr key={e.embarqueId} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 px-3 text-xs font-medium text-navy">
                          {e.colaborador}
                          {e.aindaAtivo && (
                            <span className="ml-1.5 text-[9px] font-semibold text-azul bg-azul/10 px-1.5 py-0.5 rounded-full align-middle">
                              embarcado agora
                            </span>
                          )}
                          {!e.aindaAtivo && e.statusFinal === "com_pendencia" && (
                            <span className="ml-1.5 text-[9px] font-semibold text-amarelo bg-amarelo/10 px-1.5 py-0.5 rounded-full align-middle">
                              ⚠ pendência
                            </span>
                          )}
                          {!e.aindaAtivo && e.statusFinal === "completo" && (
                            <span className="ml-1.5 text-[9px] font-semibold text-verde bg-verde/10 px-1.5 py-0.5 rounded-full align-middle">
                              ✓ completo
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-600">{e.obra}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 text-center whitespace-nowrap">{e.periodoNoRecorte}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-600 text-center">{e.diariasNoRecorte}</td>
                        <td className="py-2.5 px-3 text-xs text-center">
                          {e.percentualUltimoRdo !== null ? `${e.percentualUltimoRdo}%` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-600">
                          {e.justificativaEncerramento ? (
                            <span className="text-amarelo">⚠ {e.justificativaEncerramento}</span>
                          ) : e.justificativa ? (
                            <span className="text-vermelho">⚠ {e.justificativa}</span>
                          ) : e.itensPendentes.length > 0 ? (
                            <span>Pendente: {e.itensPendentes.join(", ")}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function RelatorioEmpresasConteudo({ empresasCadastradas }: { empresasCadastradas: string[] }) {
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("calendario");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoAtual("calendario"));
  const [linhas, setLinhas] = useState<LinhaRelatorioEmpresa[]>([]);
  const [evolucao, setEvolucao] = useState<PontoEvolucaoMensal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // vazio = mostra todas as empresas (comportamento de antes) - só filtra
  // de verdade quando a pessoa clica em pelo menos um card
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<Set<string>>(new Set());
  const [metricaParticipacao, setMetricaParticipacao] = useState<MetricaParticipacao>("embarques");
  const [metricaEvolucao, setMetricaEvolucao] = useState<MetricaParticipacao>("embarques");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de loading/erro ao trocar de período, antes de disparar a busca
    setCarregando(true);
    setErro(null);
    Promise.all([buscarRelatorioPorEmpresa(periodo), buscarEvolucaoMensal(periodo)])
      .then(([l, ev]) => { setLinhas(l); setEvolucao(ev); })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro desconhecido."))
      .finally(() => setCarregando(false));
  }, [periodo]);

  const trocarTipo = (novoTipo: TipoPeriodo) => {
    setTipoPeriodo(novoTipo);
    setPeriodo(periodoAtual(novoTipo));
  };

  const navegar = (direcao: 1 | -1) => {
    setPeriodo((atual) => periodoAdjacente(atual, tipoPeriodo, direcao));
  };

  const linhasFiltradas = useMemo(
    () => (empresasSelecionadas.size === 0 ? linhas : linhas.filter((l) => empresasSelecionadas.has(l.empresa))),
    [linhas, empresasSelecionadas]
  );

  const empresasVisiveis = useMemo(() => new Set(linhasFiltradas.map((l) => l.empresa)), [linhasFiltradas]);

  const evolucaoFiltrada = useMemo(
    () => evolucao.map((ponto) => ({
      ...ponto,
      porEmpresa: Object.fromEntries(
        Object.entries(ponto.porEmpresa).filter(([empresa]) => empresasVisiveis.has(empresa))
      ),
    })),
    [evolucao, empresasVisiveis]
  );

  // --- KPIs combinados (somam/deduplicam entre as empresas mostradas) ---
  const totalEmbarques = linhasFiltradas.reduce((s, l) => s + l.numeroEmbarques, 0);
  const totalDiarias = linhasFiltradas.reduce((s, l) => s + l.totalDiarias, 0);
  const colaboradoresDistintosTotal = useMemo(
    () => new Set(linhasFiltradas.flatMap((l) => l.colaboradoresIds)).size,
    [linhasFiltradas]
  );
  const mediaDiariasPorEmbarque = totalEmbarques > 0 ? Math.round((totalDiarias / totalEmbarques) * 100) / 100 : null;
  const percentualMedioGeral = useMemo(() => {
    const todos = linhasFiltradas.flatMap((l) => l.embarques.map((e) => e.percentualUltimoRdo).filter((p): p is number => p !== null));
    return todos.length > 0 ? Math.round(todos.reduce((s, p) => s + p, 0) / todos.length) : null;
  }, [linhasFiltradas]);

  const maiorDiarias = Math.max(1, ...linhasFiltradas.map((l) => l.totalDiarias));

  const insights = useMemo(() => gerarInsights(linhasFiltradas, evolucaoFiltrada), [linhasFiltradas, evolucaoFiltrada]);

  const mostrarParticipacao = linhasFiltradas.length >= 2;

  // 27/11: mostra TODOS os meses do período (ex: Jan a Dez inteiro no "Ano
  // todo"), mesmo os sem embarque - antes recortava os meses vazios das
  // pontas, mas o Rafael pediu pra manter o ano completo visível, já de
  // olho no crescimento da operação (hoje tem poucos embarques, mas a
  // ideia é ver o ano todo preenchendo aos poucos).
  const mostrarEvolucao = evolucaoFiltrada.length >= 2;
  const numPaineis = [mostrarParticipacao, mostrarEvolucao].filter(Boolean).length;

  const totalParticipacao = linhasFiltradas.reduce(
    (s, l) => s + (metricaParticipacao === "embarques" ? l.numeroEmbarques : l.totalDiarias), 0
  );

  const maiorValorEvolucao = Math.max(
    1,
    ...evolucaoFiltrada.flatMap((p) => Object.values(p.porEmpresa).map((v) => v[metricaEvolucao === "embarques" ? "embarques" : "diarias"]))
  );

  // linha "fantasma" (decorativa) atrás das barras da evolução - soma de
  // todas as empresas visíveis por mês, normalizada em % (0-100) pra virar
  // coordenada de SVG com viewBox 0 0 100 100. Puramente visual, não é
  // informação nova (pedido do Rafael: "fica bonito").
  const pontosFantasma = useMemo(() => {
    if (evolucaoFiltrada.length < 2) return "";
    const n = evolucaoFiltrada.length;
    return evolucaoFiltrada
      .map((ponto, i) => {
        const total = Object.values(ponto.porEmpresa).reduce((s, v) => s + v[metricaEvolucao === "embarques" ? "embarques" : "diarias"], 0);
        // centro da coluna do mês (cada mês ocupa 1/n da largura, no grid
        // logo abaixo) - não a borda, senão a linha fica desalinhada com
        // as barras
        const x = ((i + 0.5) / n) * 100;
        const y = 100 - Math.min((total / maiorValorEvolucao) * 100, 100);
        return `${x},${y}`;
      })
      .join(" ");
  }, [evolucaoFiltrada, metricaEvolucao, maiorValorEvolucao]);

  return (
    <>
      {/* Empresas + tipo de período - uma área só de filtros, lado a lado */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <SeletorEmpresas
          empresas={empresasCadastradas}
          selecionadas={empresasSelecionadas}
          aoMudar={setEmpresasSelecionadas}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => trocarTipo("calendario")}
            className={`text-sm font-medium px-4 py-2 rounded-md border transition-colors whitespace-nowrap ${
              tipoPeriodo === "calendario" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
            }`}
          >
            Mês calendário
          </button>
          <button
            type="button"
            onClick={() => trocarTipo("fechamento")}
            className={`text-sm font-medium px-4 py-2 rounded-md border transition-colors whitespace-nowrap ${
              tipoPeriodo === "fechamento" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
            }`}
          >
            Período de fechamento (20 a 19)
          </button>
          <button
            type="button"
            onClick={() => trocarTipo("ano")}
            className={`text-sm font-medium px-4 py-2 rounded-md border transition-colors whitespace-nowrap ${
              tipoPeriodo === "ano" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
            }`}
          >
            Ano todo
          </button>
        </div>
      </div>

      {/* Navegador de período - centralizado e destacado */}
      <div className="flex items-center justify-center gap-4 mb-6 bg-white border border-gray-200 rounded-lg py-3">
        <button
          type="button"
          onClick={() => navegar(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
        >
          ←
        </button>
        <div className="text-center min-w-[220px]">
          <p className="text-lg font-bold text-navy">{periodo.rotulo}</p>
          <p className="text-xs text-gray-400">
            {formatarDataBr(periodo.inicio)} até {formatarDataBr(periodo.fim)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navegar(1)}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
        >
          →
        </button>
      </div>

      {carregando && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-azul border-t-transparent rounded-full animate-spin" />
          Carregando...
        </div>
      )}

      {!carregando && erro && (
        <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm">
          Não consegui buscar os dados agora. Detalhe: {erro}
        </div>
      )}

      {!carregando && !erro && linhasFiltradas.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
          {linhas.length === 0
            ? "Nenhum embarque encontrado nesse período."
            : "Nenhum embarque encontrado nesse período para a(s) empresa(s) selecionada(s)."}
        </div>
      )}

      {!carregando && !erro && linhasFiltradas.length > 0 && (
        <>
          {/* KPIs combinados */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-azul/10 text-azul flex items-center justify-center shrink-0"><Ship size={17} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Total de embarques</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{totalEmbarques}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-verde/10 text-verde flex items-center justify-center shrink-0"><Calendar size={17} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Total de diárias</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{totalDiarias}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#EEE9F9", color: "#6a4fb0" }}>
                <Users size={17} />
              </span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Colaboradores distintos</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{colaboradoresDistintosTotal}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#FBF0DF", color: "#c07a12" }}>
                <Clock size={17} />
              </span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Média diárias/embarque</p>
                <p className="text-xl font-extrabold text-navy leading-tight">
                  {mediaDiariasPorEmbarque !== null ? mediaDiariasPorEmbarque.toLocaleString("pt-BR") : "-"}
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#E3F2FD", color: "#1E88E5" }}>
                <TrendingUp size={17} />
              </span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Avanço médio geral</p>
                <p className="text-xl font-extrabold text-navy leading-tight">
                  {percentualMedioGeral !== null ? `${percentualMedioGeral}%` : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Participação · Evolução mensal */}
          {(mostrarParticipacao || mostrarEvolucao) && (
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: `repeat(${numPaineis}, minmax(0, 1fr))` }}>
            {mostrarParticipacao && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-navy">Participação no período</h3>
                  <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setMetricaParticipacao("embarques")}
                      className={`text-[11px] font-semibold px-2 py-1 rounded ${metricaParticipacao === "embarques" ? "bg-azul text-white" : "text-gray-500"}`}
                    >
                      Embarques
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricaParticipacao("diarias")}
                      className={`text-[11px] font-semibold px-2 py-1 rounded ${metricaParticipacao === "diarias" ? "bg-azul text-white" : "text-gray-500"}`}
                    >
                      Diárias
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <DonutChart
                    segmentos={linhasFiltradas.map((l) => ({
                      empresa: l.empresa,
                      valor: metricaParticipacao === "embarques" ? l.numeroEmbarques : l.totalDiarias,
                      cor: corPrincipalEmpresa(l.empresa),
                    }))}
                    rotuloCentro={String(totalParticipacao)}
                    legendaCentro={metricaParticipacao === "embarques" ? "embarques" : "diárias"}
                  />
                  <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    {linhasFiltradas.map((linha) => {
                      const valor = metricaParticipacao === "embarques" ? linha.numeroEmbarques : linha.totalDiarias;
                      const pct = totalParticipacao > 0 ? Math.round((valor / totalParticipacao) * 1000) / 10 : 0;
                      return (
                        <div key={linha.empresa} className="flex items-center justify-between text-xs gap-2">
                          <span className="flex items-center gap-1.5 font-semibold text-navy capitalize truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: corPrincipalEmpresa(linha.empresa) }} />
                            {linha.empresa}
                          </span>
                          <span className="text-gray-500 whitespace-nowrap">{valor} · {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {mostrarEvolucao && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-navy">
                    Evolução de {metricaEvolucao === "embarques" ? "embarques" : "diárias"} por mês
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-3 text-[11px] text-gray-500">
                      {linhasFiltradas.map((linha) => (
                        <span key={linha.empresa} className="flex items-center gap-1 capitalize">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: corPrincipalEmpresa(linha.empresa) }} />
                          {linha.empresa}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => setMetricaEvolucao("embarques")}
                        className={`text-[11px] font-semibold px-2 py-1 rounded ${metricaEvolucao === "embarques" ? "bg-azul text-white" : "text-gray-500"}`}
                      >
                        Embarques
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricaEvolucao("diarias")}
                        className={`text-[11px] font-semibold px-2 py-1 rounded ${metricaEvolucao === "diarias" ? "bg-azul text-white" : "text-gray-500"}`}
                      >
                        Diárias
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {/* 27/11: virou um grid de verdade (em vez de flex "encolhe pro
                   * conteúdo") - cada mês ocupa uma fração IGUAL da largura total,
                   * então os meses sempre se espalham por todo o card (mesmo com
                   * poucas barras, tipo 1 empresa só) em vez de empacotar pra
                   * esquerda. Isso também é o que deixa a linha fantasma alinhada
                   * com as barras: as duas usam a mesma régua de 0 a 100%. */}
                  <div
                    className="relative"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${evolucaoFiltrada.length}, minmax(${Math.max(36, linhasFiltradas.length * 24)}px, 1fr))`,
                      height: 150,
                    }}
                  >
                    {pontosFantasma && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="ghostFade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3D6FA6" stopOpacity="0.16" />
                            <stop offset="100%" stopColor="#3D6FA6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polygon points={`0,100 ${pontosFantasma} 100,100`} fill="url(#ghostFade)" />
                        <polyline points={pontosFantasma} fill="none" stroke="#3D6FA6" strokeOpacity="0.4" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                      </svg>
                    )}
                    {evolucaoFiltrada.map((ponto) => (
                      <div key={ponto.mes} className="relative flex flex-col items-center justify-end h-full gap-1">
                        <div className="flex items-end gap-1 h-full">
                          {linhasFiltradas.map((linha) => {
                            const valor = ponto.porEmpresa[linha.empresa]?.[metricaEvolucao] ?? 0;
                            const alturaPct = (valor / maiorValorEvolucao) * 100;
                            return (
                              <div key={linha.empresa} className="flex flex-col items-center justify-end h-full w-5 shrink-0">
                                {valor > 0 && <span className="text-[10px] font-bold text-gray-500 mb-0.5">{valor}</span>}
                                <div
                                  title={`${capitalizar(linha.empresa)} — ${ponto.rotulo}: ${valor} ${metricaEvolucao === "embarques" ? "embarque(s)" : "diária(s)"}`}
                                  className="w-full rounded-t-sm transition-opacity hover:opacity-80"
                                  style={{ height: `${Math.max(alturaPct, valor > 0 ? 3 : 0)}%`, backgroundColor: corPrincipalEmpresa(linha.empresa) }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">{ponto.rotulo.split("/")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Saúde da execução - um card rico por empresa (redesenhado 27/11) */}
          <div
            className="grid gap-4 mb-5"
            style={{ gridTemplateColumns: linhasFiltradas.length >= 2 ? "repeat(auto-fit, minmax(360px, 1fr))" : "1fr" }}
          >
            {linhasFiltradas.map((linha) => (
              <CardSaudeEmpresa key={linha.empresa} linha={linha} />
            ))}
          </div>

          {/* Comparativo por empresa · Principais insights */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "minmax(0, 3.3fr) minmax(0, 1fr)" }}>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#eef1f6]">
                      <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Embarques</th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Colab.</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias/colab.</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Média/embarque</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">% médio</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Saúde</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasFiltradas.map((linha) => (
                      <LinhaTabela key={linha.empresa} linha={linha} maiorDiarias={maiorDiarias} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
              <div className="bg-navy px-4 py-3">
                <h3 className="text-sm font-bold text-white">Principais insights do período</h3>
              </div>
              <div className="p-4">
                {insights.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem destaques pra esse recorte ainda.</p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {insights.map((insight, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-sm ${
                          insight.tipo === "up" ? "bg-verde/10" : insight.tipo === "alerta" ? "bg-amarelo/10" : "bg-azul/10"
                        }`}>
                          {insight.icone}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-navy mb-0.5">{insight.titulo}</p>
                          <p className="text-[11.5px] text-gray-500 leading-relaxed">{insight.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Diárias por empresa / Participação de diárias foram removidos em 27/11 - o
           * Rafael apontou que duplicavam a mesma informação do donut "Participação no
           * período" (que já tem o toggle Embarques/Diárias) e da coluna Diárias da
           * tabela comparativa. */}

          {/* Financeiro - teaser, sem número nenhum (não temos valor de contrato/diária cadastrado ainda) */}
          <div
            className="rounded-lg border-[1.5px] border-dashed border-gray-300 px-5 py-4 flex items-center gap-4 mb-5"
            style={{ background: "repeating-linear-gradient(135deg, #f5f7f9, #f5f7f9 10px, #eef1f4 10px, #eef1f4 20px)" }}
          >
            <span className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-base">🔒</span>
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-0.5">Financeiro por empresa — em breve</h3>
              <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                Quando os valores de contrato e diária forem cadastrados, essa área mostra faturamento, custo por
                colaborador e margem por obra — lado a lado com os números operacionais acima.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            &quot;Diárias&quot; conta só os dias de cada embarque que realmente caem dentro do período mostrado - se um
            embarque atravessa a virada, cada período fica só com a parte real dele. &quot;Embarques&quot; conta só os que
            começaram dentro desse período. Os insights são gerados por regra simples em cima desses números (sem IA
            rodando a cada carregamento) e se ajustam sozinhos pra 1 empresa selecionada ou várias.
          </p>
        </>
      )}
    </>
  );
}
