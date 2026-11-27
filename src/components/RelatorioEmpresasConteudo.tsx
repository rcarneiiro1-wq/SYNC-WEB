"use client";

import { useEffect, useMemo, useState } from "react";
import { Ship, Calendar, Users, Clock, TrendingUp } from "lucide-react";
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
import { SeletorEmpresas, corDaEmpresa } from "@/components/SeletorEmpresas";

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

/** "Bom" quando não tem nenhuma pendência em aberto; "Atenção" quando tem
 * pelo menos 1 - independente do % de avanço (um embarque pode estar com
 * 100% de avanço e MESMO ASSIM ter sido encerrado com pendência por outro
 * motivo administrativo, ver caso real do Eduardo/Hydra em 27/11). */
function saudeDaLinha(linha: LinhaRelatorioEmpresa): { rotulo: string; classe: "bom" | "atencao" } {
  return linha.comPendencia > 0 ? { rotulo: "Atenção", classe: "atencao" } : { rotulo: "Bom", classe: "bom" };
}

function BadgeSaude({ linha }: { linha: LinhaRelatorioEmpresa }) {
  const saude = saudeDaLinha(linha);
  return saude.classe === "bom" ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-verde bg-verde/10 px-2 py-0.5 rounded-full whitespace-nowrap">
      ✓ Bom
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amarelo bg-amarelo/10 px-2 py-0.5 rounded-full whitespace-nowrap">
      ⚠ Atenção
    </span>
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
  const cor = corDaEmpresa(linha.empresa);

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0">
        <td className="py-3.5 px-4">
          <p className="text-sm font-semibold text-navy capitalize flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor.fg }} />
            {linha.empresa}
          </p>
        </td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">{linha.numeroEmbarques}</td>
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-2 justify-center">
            {linha.completos > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-verde bg-verde/10 px-2 py-0.5 rounded-full">
                ✓ {linha.completos}
              </span>
            )}
            {linha.comPendencia > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amarelo bg-amarelo/10 px-2 py-0.5 rounded-full">
                ⚠ {linha.comPendencia}
              </span>
            )}
            {linha.ativos > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-azul bg-azul/10 px-2 py-0.5 rounded-full">
                ● {linha.ativos} ativo{linha.ativos === 1 ? "" : "s"}
              </span>
            )}
            {linha.semInformacao > 0 && (
              <span
                className="text-xs text-gray-300"
                title="Encerrado antes de existir esse controle de status - não dá pra saber se ficou pendência"
              >
                {linha.semInformacao} sem info
              </span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 w-10 text-right">{linha.totalDiarias}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${proporcao}%`, backgroundColor: cor.fg }} />
            </div>
          </div>
        </td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">{linha.colaboradoresDistintos}</td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">
          {diariasPorColaborador !== null ? diariasPorColaborador : "-"}
        </td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">
          {diasPorEmbarque !== null ? diasPorEmbarque : "-"}
        </td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">
          {linha.percentualMedio !== null ? `${linha.percentualMedio}%` : "-"}</td>
        <td className="py-3.5 px-4 text-center"><BadgeSaude linha={linha} /></td>
        <td className="py-3.5 px-4 text-center">
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
          <td colSpan={9} className="px-4 pb-4 pt-1">
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

  // só mostra, no gráfico, os meses entre o primeiro e o último que
  // tiveram alguma diária - recorta os meses vazios das pontas (ex: não
  // faz sentido desenhar Jan-Jul em branco se a operação só começou em
  // Ago), mas preserva um "buraco" no meio se alguma empresa parou de
  // operar por um mês e voltou depois (isso É informação).
  const evolucaoExibida = useMemo(() => {
    const indicesComDado = evolucaoFiltrada
      .map((p, i) => (Object.values(p.porEmpresa).some((v) => v.diarias > 0) ? i : -1))
      .filter((i) => i >= 0);
    if (indicesComDado.length === 0) return [];
    return evolucaoFiltrada.slice(indicesComDado[0], indicesComDado[indicesComDado.length - 1] + 1);
  }, [evolucaoFiltrada]);

  const mostrarEvolucao = evolucaoExibida.length >= 2;
  const numPaineis = [mostrarParticipacao, mostrarEvolucao, true].filter(Boolean).length;

  const totalParticipacao = linhasFiltradas.reduce(
    (s, l) => s + (metricaParticipacao === "embarques" ? l.numeroEmbarques : l.totalDiarias), 0
  );

  const maiorValorEvolucao = Math.max(
    1,
    ...evolucaoExibida.flatMap((p) => Object.values(p.porEmpresa).map((v) => v.diarias))
  );

  return (
    <>
      {/* Cards de empresa - selecionar uma ou mais pra ver só elas */}
      <div className="mb-5">
        <SeletorEmpresas
          empresas={empresasCadastradas}
          selecionadas={empresasSelecionadas}
          aoMudar={setEmpresasSelecionadas}
        />
      </div>

      {/* Seletor de tipo de período */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => trocarTipo("calendario")}
          className={`text-sm font-medium px-4 py-2 rounded-md border transition-colors ${
            tipoPeriodo === "calendario" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
          }`}
        >
          Mês calendário
        </button>
        <button
          type="button"
          onClick={() => trocarTipo("fechamento")}
          className={`text-sm font-medium px-4 py-2 rounded-md border transition-colors ${
            tipoPeriodo === "fechamento" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
          }`}
        >
          Período de fechamento (20 a 19)
        </button>
        <button
          type="button"
          onClick={() => trocarTipo("ano")}
          className={`text-sm font-medium px-4 py-2 rounded-md border transition-colors ${
            tipoPeriodo === "ano" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
          }`}
        >
          Ano todo
        </button>
      </div>

      {/* Navegador de período */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navegar(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
        >
          ←
        </button>
        <div className="text-center min-w-[220px]">
          <p className="text-base font-semibold text-navy">{periodo.rotulo}</p>
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
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-md bg-azul/10 text-azul flex items-center justify-center shrink-0"><Ship size={16} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Total de embarques</p>
                <p className="text-lg font-extrabold text-navy leading-tight">{totalEmbarques}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-md bg-verde/10 text-verde flex items-center justify-center shrink-0"><Calendar size={16} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Total de diárias</p>
                <p className="text-lg font-extrabold text-navy leading-tight">{totalDiarias}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-md bg-navy/10 text-navy flex items-center justify-center shrink-0"><Users size={16} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Colaboradores distintos</p>
                <p className="text-lg font-extrabold text-navy leading-tight">{colaboradoresDistintosTotal}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-md bg-amarelo/10 text-amarelo flex items-center justify-center shrink-0"><Clock size={16} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Média diárias/embarque</p>
                <p className="text-lg font-extrabold text-navy leading-tight">
                  {mediaDiariasPorEmbarque !== null ? mediaDiariasPorEmbarque.toLocaleString("pt-BR") : "-"}
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-md bg-azul-escuro/10 text-azul-escuro flex items-center justify-center shrink-0"><TrendingUp size={16} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Avanço médio geral</p>
                <p className="text-lg font-extrabold text-navy leading-tight">
                  {percentualMedioGeral !== null ? `${percentualMedioGeral}%` : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Participação · Evolução mensal · Saúde da execução */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: `repeat(${numPaineis}, minmax(0, 1fr))` }}>
            {mostrarParticipacao && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
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
                <div className="flex w-full h-6 rounded-md overflow-hidden gap-0.5 bg-gray-100 mb-3">
                  {linhasFiltradas.map((linha) => {
                    const valor = metricaParticipacao === "embarques" ? linha.numeroEmbarques : linha.totalDiarias;
                    const pct = totalParticipacao > 0 ? (valor / totalParticipacao) * 100 : 0;
                    return (
                      <div
                        key={linha.empresa}
                        title={`${capitalizar(linha.empresa)}: ${pct.toFixed(1)}%`}
                        className="flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ width: `${pct}%`, backgroundColor: corDaEmpresa(linha.empresa).fg }}
                      >
                        {pct >= 8 ? `${pct.toFixed(1)}%` : ""}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-1.5">
                  {linhasFiltradas.map((linha) => (
                    <div key={linha.empresa} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-navy capitalize">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: corDaEmpresa(linha.empresa).fg }} />
                        {linha.empresa}
                      </span>
                      <span className="text-gray-500">
                        {metricaParticipacao === "embarques" ? `${linha.numeroEmbarques} embarque${linha.numeroEmbarques === 1 ? "" : "s"}` : `${linha.totalDiarias} diárias`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mostrarEvolucao && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-navy">Evolução mensal · diárias</h3>
                  <div className="flex gap-3 text-[11px] text-gray-500">
                    {linhasFiltradas.map((linha) => (
                      <span key={linha.empresa} className="flex items-center gap-1 capitalize">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: corDaEmpresa(linha.empresa).fg }} />
                        {linha.empresa}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-3 h-[150px] min-w-max px-0.5">
                    {evolucaoExibida.map((ponto) => (
                      <div key={ponto.mes} className="shrink-0 flex flex-col items-center justify-end h-full gap-1">
                        <div className="flex items-end gap-1 h-full">
                          {linhasFiltradas.map((linha) => {
                            const valor = ponto.porEmpresa[linha.empresa]?.diarias ?? 0;
                            const alturaPct = (valor / maiorValorEvolucao) * 100;
                            return (
                              <div key={linha.empresa} className="flex flex-col items-center justify-end h-full w-5 shrink-0">
                                {valor > 0 && <span className="text-[10px] font-bold text-gray-500 mb-0.5">{valor}</span>}
                                <div
                                  title={`${capitalizar(linha.empresa)} — ${ponto.rotulo}: ${valor} diárias`}
                                  className="w-full rounded-t-sm transition-opacity hover:opacity-80"
                                  style={{ height: `${Math.max(alturaPct, valor > 0 ? 3 : 0)}%`, backgroundColor: corDaEmpresa(linha.empresa).fg }}
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

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-navy mb-3">Saúde da execução</h3>
              <div className="flex flex-col gap-3.5">
                {linhasFiltradas.map((linha) => {
                  const saude = saudeDaLinha(linha);
                  return (
                    <div key={linha.empresa}>
                      <div className="flex items-center justify-between text-xs font-bold text-navy mb-1.5">
                        <span className="flex items-center gap-1.5 capitalize">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: corDaEmpresa(linha.empresa).fg }} />
                          {linha.empresa}
                        </span>
                        <span>{linha.percentualMedio !== null ? `${linha.percentualMedio}%` : "-"}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${saude.classe === "bom" ? "bg-verde" : "bg-amarelo"}`}
                          style={{ width: `${linha.percentualMedio ?? 0}%` }}
                        />
                      </div>
                      <div className="flex gap-2.5 flex-wrap text-[10.5px] text-gray-400 mb-1.5">
                        {linha.completos > 0 && <span>● {linha.completos} completo{linha.completos === 1 ? "" : "s"}</span>}
                        {linha.comPendencia > 0 && <span>● {linha.comPendencia} com pendência</span>}
                        {linha.ativos > 0 && <span>● {linha.ativos} em andamento</span>}
                      </div>
                      <BadgeSaude linha={linha} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comparativo por empresa · Principais insights */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Embarques</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Situação</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Colab.</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias/colab.</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Dias/embarque</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">% médio</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Saúde</th>
                    <th className="py-3 px-4"></th>
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

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-navy mb-3">Principais insights</h3>
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
            começaram dentro desse período. Os insights ao lado da tabela são gerados por regra simples em cima
            desses números (sem IA rodando a cada carregamento) e se ajustam sozinhos pra 1 empresa selecionada ou várias.
          </p>
        </>
      )}
    </>
  );
}
