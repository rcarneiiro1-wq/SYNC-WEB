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
import { Cabecalho } from "@/components/Cabecalho";

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
  const proporcao = maiorDiarias > 0 ? Math.round((linha.totalDiarias / maiorDiarias) * 100) : 0;
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3.5 px-4">
        <p className="text-sm font-semibold text-navy capitalize">{linha.empresa}</p>
      </td>
      <td className="py-3.5 px-4 text-center text-sm text-gray-600">{linha.numeroEmbarques}</td>
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
        {linha.percentualMedio !== null ? `${linha.percentualMedio}%` : "-"}
      </td>
    </tr>
  );
}

export default function PaginaRelatorioEmpresas() {
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
    <div className="min-h-screen">
      <Cabecalho paginaAtiva="relatorios" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Relatório por empresa</h1>

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
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diárias</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaboradores</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">% médio</th>
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
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Developed by Rafael Carneiro · Sync ERP
      </footer>
    </div>
  );
}
