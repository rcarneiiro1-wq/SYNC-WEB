"use client";

import { useEffect, useState } from "react";
import {
  buscarRelatorioPorEmpresa,
  periodoMesCalendario,
  periodoFechamento,
  periodoAdjacente,
  type Periodo,
  type LinhaRelatorioEmpresa,
} from "@/lib/relatorios";

type TipoPeriodo = "calendario" | "fechamento";

function periodoAtual(tipo: TipoPeriodo): Periodo {
  const hoje = new Date();
  return tipo === "fechamento"
    ? periodoFechamento(hoje.getFullYear(), hoje.getMonth() + 1)
    : periodoMesCalendario(hoje.getFullYear(), hoje.getMonth() + 1);
}

function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function LinhaTabela({ linha, maiorDiarias }: { linha: LinhaRelatorioEmpresa; maiorDiarias: number }) {
  const [aberto, setAberto] = useState(false);
  const proporcao = maiorDiarias > 0 ? Math.round((linha.totalDiarias / maiorDiarias) * 100) : 0;
  return (
    <>
      <tr className="border-b border-gray-100 last:border-0">
        <td className="py-3.5 px-4">
          <p className="text-sm font-semibold text-navy capitalize">{linha.empresa}</p>
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
            {linha.completos === 0 && linha.comPendencia === 0 && (
              <span className="text-xs text-gray-300">embarque(s) ainda ativo(s)</span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 w-10 text-right">{linha.totalDiarias}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-azul h-full rounded-full" style={{ width: `${proporcao}%` }} />
            </div>
          </div>
        </td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">{linha.colaboradoresDistintos}</td>
        <td className="py-3.5 px-4 text-center text-sm text-gray-600">
          {linha.percentualMedio !== null ? `${linha.percentualMedio}%` : "-"}</td>
        <td className="py-3.5 px-4 text-center">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            className="text-xs font-medium text-azul hover:underline cursor-pointer whitespace-nowrap"
          >
            {aberto ? "Fechar ▲" : "Abrir detalhes ▼"}
          </button>
        </td>
      </tr>
      {aberto && (
        <tr className="bg-gray-50/70">
          <td colSpan={7} className="px-4 pb-4 pt-1">
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

export function RelatorioEmpresasConteudo() {
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("calendario");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoAtual("calendario"));
  const [linhas, setLinhas] = useState<LinhaRelatorioEmpresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    buscarRelatorioPorEmpresa(periodo)
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

  const totalDiarias = linhas.reduce((s, l) => s + l.totalDiarias, 0);
  const totalEmbarques = linhas.reduce((s, l) => s + l.numeroEmbarques, 0);
  const maiorDiarias = Math.max(1, ...linhas.map((l) => l.totalDiarias));

  return (
    <>
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

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-bold text-navy">{totalEmbarques}</p>
          <p className="text-xs text-gray-400">embarque{totalEmbarques === 1 ? "" : "s"} iniciado{totalEmbarques === 1 ? "" : "s"} no período</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-bold text-navy">{totalDiarias}</p>
          <p className="text-xs text-gray-400">diária{totalDiarias === 1 ? "" : "s"} no total</p>
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

      {!carregando && !erro && linhas.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
          Nenhum embarque encontrado nesse período.
        </div>
      )}

      {!carregando && !erro && linhas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Embarques</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Situação</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaboradores</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">% médio</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <LinhaTabela key={linha.empresa} linha={linha} maiorDiarias={maiorDiarias} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        "Diárias" conta só os dias de cada embarque que realmente caem dentro do período mostrado - se um
        embarque atravessa a virada, cada período fica só com a parte real dele. "Embarques" conta só os que
        começaram dentro desse período.
      </p>
    </>
  );
}
