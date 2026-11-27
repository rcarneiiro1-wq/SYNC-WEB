"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Ship, Calendar, Clock, Trophy, CheckCircle2, Info } from "lucide-react";
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

// Texto do "vs." nos cards de variação - muda com o tipo de período
// selecionado, pra não dizer "vs. ano anterior" quando o recorte é um mês.
function rotuloPeriodoAnterior(tipo: TipoPeriodo): string {
  return tipo === "ano" ? "vs. ano anterior" : tipo === "fechamento" ? "vs. fechamento anterior" : "vs. mês anterior";
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

// Lista de nomes com corte pra não estourar o card quando o time crescer
// (pensado pra 25+ colaboradores - pedido de longa data do Rafael de
// sempre olhar pra esse cenário antes de considerar algo pronto).
function listarNomes(nomes: string[], limite = 4): string {
  if (nomes.length <= limite) return nomes.join(", ");
  return `${nomes.slice(0, limite).join(", ")} e mais ${nomes.length - limite}`;
}

/** Variação percentual vs. o período anterior - só aparece quando existe
 * base de comparação real (período anterior > 0); nunca inventa número. */
function calcularVariacao(atual: number, anterior: number): { pct: number; subiu: boolean } | null {
  if (anterior <= 0) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  return { pct, subiu: atual >= anterior };
}

function BadgeVariacao({ variacao }: { variacao: { pct: number; subiu: boolean } | null }) {
  if (!variacao || variacao.pct === 0) return null;
  return (
    <span className={`text-[11px] font-bold ${variacao.subiu ? "text-verde" : "text-vermelho"}`}>
      {variacao.subiu ? "↑" : "↓"} {Math.abs(variacao.pct)}%
    </span>
  );
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
        <td className="py-3 px-2 text-center text-xs text-gray-500 whitespace-nowrap">
          {linha.ultimaAtividade ? formatarDataBr(linha.ultimaAtividade) : "-"}
        </td>
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
          <td colSpan={9} className="px-4 pb-4 pt-1">
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
  // período imediatamente anterior ao selecionado, só pra calcular a
  // variação % dos cards (redesign 27/11) - busca silenciosa, não trava a
  // tela principal nem mostra erro próprio se falhar.
  const [linhasAnteriores, setLinhasAnteriores] = useState<LinhaComparativoColaborador[]>([]);
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

    buscarComparativoColaboradores(periodoAdjacente(periodo, tipoPeriodo, -1))
      .then(setLinhasAnteriores)
      .catch(() => setLinhasAnteriores([])); // sem comparação se der erro - os cards só escondem a variação
  }, [periodo, tipoPeriodo]);

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

  // mesmo recorte de colaboradores aplicado ao período anterior, pra
  // comparar maçã com maçã quando a pessoa tiver filtrado alguém específico
  const linhasAnterioresFiltradas = useMemo(
    () =>
      colaboradoresSelecionados.size === 0
        ? linhasAnteriores
        : linhasAnteriores.filter((l) => colaboradoresSelecionados.has(l.colaboradorId)),
    [linhasAnteriores, colaboradoresSelecionados]
  );

  const totalEmbarques = linhasFiltradas.reduce((s, l) => s + l.numeroEmbarques, 0);
  const totalDiarias = linhasFiltradas.reduce((s, l) => s + l.totalDiarias, 0);
  const totalEmbarquesAnterior = linhasAnterioresFiltradas.reduce((s, l) => s + l.numeroEmbarques, 0);
  const totalDiariasAnterior = linhasAnterioresFiltradas.reduce((s, l) => s + l.totalDiarias, 0);
  const variacaoEmbarques = calcularVariacao(totalEmbarques, totalEmbarquesAnterior);
  const variacaoDiarias = calcularVariacao(totalDiarias, totalDiariasAnterior);

  const embarcados = linhasFiltradas.filter((l) => l.embarcadoAgora);
  const parados = linhasFiltradas.filter((l) => !l.embarcadoAgora);
  const maiorTempoParado = Math.max(0, ...linhasFiltradas.map((l) => l.diasParado ?? 0));
  const maiorDiarias = Math.max(1, ...linhasFiltradas.map((l) => l.totalDiarias));

  const insights = useMemo(() => gerarInsightsComparativo(linhasFiltradas), [linhasFiltradas]);

  const ranking = useMemo(() => [...linhasFiltradas].sort((a, b) => b.totalDiarias - a.totalDiarias), [linhasFiltradas]);

  // Nota de equilíbrio logo abaixo do ranking (além do insight lateral) -
  // mesma regra de "diferença <= 10%" usada em gerarInsightsComparativo,
  // só que calculada aqui em cima do `ranking` já filtrado, pra aparecer
  // junto do gráfico sem duplicar a busca.
  const notaEquilibrio = useMemo(() => {
    if (ranking.length < 2) return null;
    const [primeiro, segundo] = ranking;
    if (primeiro.totalDiarias <= 0) return null;
    const diferenca = primeiro.totalDiarias - segundo.totalDiarias;
    const diferencaPct = Math.round((diferenca / primeiro.totalDiarias) * 1000) / 10;
    if (diferencaPct > 10) return null;
    return `${capitalizar(primeiro.nome)} e ${capitalizar(segundo.nome)} apresentam uma diferença de apenas ${diferenca} diária${diferenca === 1 ? "" : "s"} no período.`;
  }, [ranking]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-3">
          <SeletorColaboradores
            colaboradores={colaboradoresCadastrados}
            selecionados={colaboradoresSelecionados}
            aoMudar={setColaboradoresSelecionados}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => trocarTipo("calendario")}
              className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors whitespace-nowrap ${
                tipoPeriodo === "calendario" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => trocarTipo("fechamento")}
              className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors whitespace-nowrap ${
                tipoPeriodo === "fechamento" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
              }`}
            >
              Fechamento
            </button>
            <button
              type="button"
              onClick={() => trocarTipo("ano")}
              className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors whitespace-nowrap ${
                tipoPeriodo === "ano" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-300 hover:border-navy"
              }`}
            >
              Ano todo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navegar(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
          >
            ←
          </button>
          <div className="text-center min-w-[160px]">
            <p className="text-sm font-bold text-navy leading-tight">{periodo.rotulo}</p>
            <p className="text-[11px] text-gray-400">
              {formatarDataBr(periodo.inicio)} até {formatarDataBr(periodo.fim)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navegar(1)}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
          >
            →
          </button>
        </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#EEE9F9", color: "#6a4fb0" }}>
                <Users size={17} />
              </span>
              <div>
                <p className="text-xl font-extrabold text-navy leading-tight">{linhasFiltradas.length}</p>
                <p className="text-[12px] text-gray-600 font-medium">Colaboradores</p>
                <p className="text-[11px] text-gray-400">Equipe no período</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-azul/10 text-azul flex items-center justify-center shrink-0"><Ship size={17} /></span>
              <div>
                <p className="text-xl font-extrabold text-navy leading-tight flex items-center gap-1.5">
                  {totalEmbarques} <BadgeVariacao variacao={variacaoEmbarques} />
                </p>
                <p className="text-[12px] text-gray-600 font-medium">Total de embarques</p>
                {variacaoEmbarques && <p className="text-[11px] text-gray-400">{rotuloPeriodoAnterior(tipoPeriodo)}</p>}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-verde/10 text-verde flex items-center justify-center shrink-0"><Calendar size={17} /></span>
              <div>
                <p className="text-xl font-extrabold text-navy leading-tight flex items-center gap-1.5">
                  {totalDiarias} <BadgeVariacao variacao={variacaoDiarias} />
                </p>
                <p className="text-[12px] text-gray-600 font-medium">Total de diárias</p>
                {variacaoDiarias && <p className="text-[11px] text-gray-400">{rotuloPeriodoAnterior(tipoPeriodo)}</p>}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#EEE9F9", color: "#6a4fb0" }}>
                <Users size={17} />
              </span>
              <div>
                <p className="text-xl font-extrabold text-navy leading-tight">{embarcados.length} de {linhasFiltradas.length}</p>
                <p className="text-[12px] text-gray-600 font-medium">Equipe ativa</p>
                <p className="text-[11px] text-gray-400">Embarcados atualmente</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#FBF0DF", color: "#c07a12" }}>
                <Clock size={17} />
              </span>
              <div>
                <p className="text-xl font-extrabold text-navy leading-tight">{maiorTempoParado > 0 ? `${maiorTempoParado} dias` : "-"}</p>
                <p className="text-[12px] text-gray-600 font-medium">Maior afastamento</p>
                <p className="text-[11px] text-gray-400">Sem novo embarque</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 mb-5 grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_minmax(280px,320px)]">
            {ranking.length >= 2 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                    <Trophy size={16} className="text-amarelo" /> Ranking de diárias no período
                  </h3>
                  <div className="flex gap-3 text-[11px] text-gray-500">
                    {Array.from(new Set(ranking.map((l) => l.empresa))).map((empresa) => (
                      <span key={empresa} className="flex items-center gap-1 capitalize">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: corPrincipalEmpresa(empresa) }} />
                        {empresa}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-10 pr-[46px] text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  <span>Diárias</span>
                  <span className="w-20 text-right">Participação</span>
                </div>
                <div className="flex flex-col gap-3.5">
                  {ranking.map((linha, i) => {
                    const cor = corPrincipalEmpresa(linha.empresa);
                    const proporcao = maiorDiarias > 0 ? Math.round((linha.totalDiarias / maiorDiarias) * 100) : 0;
                    const participacao = totalDiarias > 0 ? Math.round((linha.totalDiarias / totalDiarias) * 1000) / 10 : 0;
                    return (
                      <div key={linha.colaboradorId} className="grid items-center gap-3.5" style={{ gridTemplateColumns: "22px minmax(0, 170px) minmax(0, 1fr) 40px 56px" }}>
                        <span className="text-xs font-bold text-gray-400">{i + 1}º</span>
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
                        <p className="text-xs text-gray-500 text-right">{participacao}%</p>
                      </div>
                    );
                  })}
                </div>
                {notaEquilibrio && (
                  <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 mt-4">
                    <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span>{notaEquilibrio}</span>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-navy flex items-center gap-2 mb-4">
                <Users size={16} className="text-navy" /> Disponibilidade operacional
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-verde/10 text-verde flex items-center justify-center shrink-0">
                    <CheckCircle2 size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">
                      {embarcados.length} colaborador{embarcados.length === 1 ? "" : "es"} embarcado{embarcados.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {embarcados.length > 0 ? listarNomes(embarcados.map((l) => capitalizar(l.nome))) : "Ninguém embarcado no momento"}
                    </p>
                  </div>
                </div>
                {parados.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-amarelo/10 text-amarelo flex items-center justify-center shrink-0">
                      <Clock size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy">
                        {parados.length} colaborador{parados.length === 1 ? "" : "es"} fora da operação
                      </p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {parados.map((l) => (
                          <p key={l.colaboradorId} className="text-xs text-gray-500">
                            {capitalizar(l.nome)}
                            {l.diasParado !== null && ` · ${l.diasParado} dia${l.diasParado === 1 ? "" : "s"} sem novo embarque`}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 mb-5 grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_minmax(260px,280px)]">
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
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Situação</th>
                      <th className="py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Última atividade</th>
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
            &quot;Diárias&quot; conta só os dias de cada embarque que realmente caem dentro do período mostrado. &quot;Situação&quot; e
            &quot;Última atividade&quot; olham pro histórico inteiro da pessoa, não só pro período selecionado na tela - é sobre o
            agora, não sobre o recorte (última atividade é o RDO mais recente, se embarcada, ou o fim real do último embarque, se
            parada). As variações percentuais comparam com o período anterior equivalente, só quando existe base real pra comparar.
            Os insights são gerados por regra simples em cima desses números (sem IA rodando a cada carregamento) e se ajustam
            sozinhos pra 1 colaborador selecionado ou vários.
          </p>
        </>
      )}
    </>
  );
}
