"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Ship, Calendar, Clock } from "lucide-react";
import {
  buscarComparativoColaboradores,
  gerarInsightsComparativo,
  periodoMesCalendario,
  periodoFechamento,
  periodoAnoCalendario,
  periodoAdjacente,
  type Periodo,
  type LinhaComparativoColaborador,
  type ColaboradorResumo,
} from "@/lib/relatorios";
import { corPrincipalEmpresa } from "@/components/RelatorioEmpresasConteudo";
import { SeletorColaboradores } from "@/components/SeletorColaboradores";

type TipoPeriodo = "calendario" | "fechamento" | "ano";

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

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Badge "Embarcado agora" / "N dias parado" - mesma informação que já
 * alimenta o insight de maior tempo parado, só que por linha. 4 faixas
 * (pedido implícito do Rafael ao pedir isso "por colaborador"): embarcado
 * agora (azul), parado há pouco (verde), parado há um tempo (amarelo),
 * parado há muito tempo (vermelho). */
function BadgeAtividade({ linha }: { linha: LinhaComparativoColaborador }) {
  if (linha.embarcadoAgora) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-azul/10 text-azul">
        <span className="w-1.5 h-1.5 rounded-full bg-azul" /> Embarcado agora
      </span>
    );
  }
  if (linha.diasParado === null) {
    return <span className="text-xs text-gray-300">-</span>;
  }
  const dias = linha.diasParado;
  const classe =
    dias <= 30 ? "bg-verde/10 text-verde" : dias <= 60 ? "bg-amarelo/10 text-amarelo" : "bg-vermelho/10 text-vermelho";
  const cor = dias <= 30 ? "bg-verde" : dias <= 60 ? "bg-amarelo" : "bg-vermelho";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${classe}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cor}`} /> {dias} dia{dias === 1 ? "" : "s"} parado
    </span>
  );
}

function LinhaTabela({ linha }: { linha: LinhaComparativoColaborador }) {
  const [aberto, setAberto] = useState(false);
  const diariasPorEmbarque =
    linha.numeroEmbarques > 0 ? Math.round((linha.totalDiarias / linha.numeroEmbarques) * 10) / 10 : null;
  const cor = corPrincipalEmpresa(linha.empresa);

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0">
        <td className="py-3 px-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ backgroundColor: cor }}
            >
              {iniciais(linha.nome)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy truncate">{capitalizar(linha.nome)}</p>
              {linha.funcao && <p className="text-[11px] text-gray-400 truncate">{linha.funcao}</p>}
            </div>
          </div>
        </td>
        <td className="py-3 px-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy capitalize">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
            {linha.empresa}
          </span>
        </td>
        <td className="py-3 px-2 text-center text-sm text-gray-600">{linha.numeroEmbarques}</td>
        <td className="py-3 px-2 text-center text-sm font-medium text-gray-700">{linha.totalDiarias}</td>
        <td className="py-3 px-2 text-center text-sm text-gray-600">{diariasPorEmbarque !== null ? diariasPorEmbarque : "-"}</td>
        <td className="py-3 px-2 text-center text-sm text-gray-600">
          {linha.percentualMedio !== null ? `${linha.percentualMedio}%` : "-"}
        </td>
        <td className="py-3 px-2 text-center"><BadgeAtividade linha={linha} /></td>
        <td className="py-3 px-2 text-center">
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
                        <td className="py-2.5 px-3 text-xs text-gray-600">
                          {e.obra}
                          {e.aindaAtivo && (
                            <span className="ml-1.5 text-[9px] font-semibold text-azul bg-azul/10 px-1.5 py-0.5 rounded-full align-middle">
                              embarcado agora
                            </span>
                          )}
                        </td>
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

export function ComparativoColaboradoresConteudo({ colaboradoresCadastrados }: { colaboradoresCadastrados: ColaboradorResumo[] }) {
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("ano");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoAtual("ano"));
  const [linhas, setLinhas] = useState<LinhaComparativoColaborador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // vazio = mostra todo mundo - só filtra de verdade quando a pessoa
  // escolher alguém no seletor (mesma convenção do Relatório por empresa)
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de loading/erro ao trocar de período, antes de disparar a busca
    setCarregando(true);
    setErro(null);
    buscarComparativoColaboradores(periodo)
      .then(setLinhas)
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
    () =>
      colaboradoresSelecionados.size === 0
        ? linhas
        : linhas.filter((l) => colaboradoresSelecionados.has(l.colaboradorId)),
    [linhas, colaboradoresSelecionados]
  );

  const totalEmbarques = linhasFiltradas.reduce((s, l) => s + l.numeroEmbarques, 0);
  const totalDiarias = linhasFiltradas.reduce((s, l) => s + l.totalDiarias, 0);
  const maiorTempoParado = Math.max(0, ...linhasFiltradas.map((l) => l.diasParado ?? 0));
  const maiorDiarias = Math.max(1, ...linhasFiltradas.map((l) => l.totalDiarias));

  const insights = useMemo(() => gerarInsightsComparativo(linhasFiltradas), [linhasFiltradas]);

  const ranking = useMemo(() => [...linhasFiltradas].sort((a, b) => b.totalDiarias - a.totalDiarias), [linhasFiltradas]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <SeletorColaboradores
          colaboradores={colaboradoresCadastrados}
          selecionados={colaboradoresSelecionados}
          aoMudar={setColaboradoresSelecionados}
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
            : "Nenhum embarque encontrado nesse período para o(s) colaborador(es) selecionado(s)."}
        </div>
      )}

      {!carregando && !erro && linhasFiltradas.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#EEE9F9", color: "#6a4fb0" }}>
                <Users size={17} />
              </span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Colaboradores</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{linhasFiltradas.length}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-azul/10 text-azul flex items-center justify-center shrink-0"><Ship size={17} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Total embarques</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{totalEmbarques}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-verde/10 text-verde flex items-center justify-center shrink-0"><Calendar size={17} /></span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Total diárias</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{totalDiarias}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#FBF0DF", color: "#c07a12" }}>
                <Clock size={17} />
              </span>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Maior tempo parado</p>
                <p className="text-xl font-extrabold text-navy leading-tight">{maiorTempoParado > 0 ? `${maiorTempoParado} dias` : "-"}</p>
              </div>
            </div>
          </div>

          {ranking.length >= 2 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-navy">Ranking de diárias no período</h3>
                <div className="flex gap-3 text-[11px] text-gray-500">
                  {Array.from(new Set(ranking.map((l) => l.empresa))).map((empresa) => (
                    <span key={empresa} className="flex items-center gap-1 capitalize">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: corPrincipalEmpresa(empresa) }} />
                      {empresa}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3.5">
                {ranking.map((linha) => {
                  const cor = corPrincipalEmpresa(linha.empresa);
                  const proporcao = maiorDiarias > 0 ? Math.round((linha.totalDiarias / maiorDiarias) * 100) : 0;
                  return (
                    <div key={linha.colaboradorId} className="grid items-center gap-3.5" style={{ gridTemplateColumns: "minmax(0, 190px) minmax(0, 1fr) 46px" }}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{capitalizar(linha.nome)}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1.5 capitalize truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                          {linha.empresa}
                        </p>
                      </div>
                      <div className="bg-gray-100 rounded h-5 overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${Math.max(proporcao, 2)}%`, backgroundColor: cor }} />
                      </div>
                      <p className="text-sm font-bold text-navy text-right">{linha.totalDiarias}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 280px)" }}>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#eef1f6]">
                      <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaborador</th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Embarques</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias/emb.</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">% médio</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Atividade</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((linha) => (
                      <LinhaTabela key={linha.colaboradorId} linha={linha} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
              <div className="bg-navy px-4 py-3">
                <h3 className="text-sm font-bold text-white">Principais insights</h3>
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

          <p className="text-xs text-gray-400">
            &quot;Diárias&quot; conta só os dias de cada embarque que realmente caem dentro do período mostrado. &quot;Atividade&quot;
            (embarcado agora / dias parado) olha pro histórico inteiro da pessoa, não só pro período selecionado na tela - é sobre
            o agora, não sobre o recorte. Os insights são gerados por regra simples em cima desses números (sem IA rodando a cada
            carregamento) e se ajustam sozinhos pra 1 colaborador selecionado ou vários.
          </p>
        </>
      )}
    </>
  );
}
