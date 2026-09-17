"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Ship, LogOut } from "lucide-react";
import { periodoMesCalendario, periodoFechamento, periodoAdjacente, type Periodo } from "@/lib/relatorios";
import { buscarMeuPainel, type ResultadoMeuPainel } from "@/lib/painelColaboradorActions";
import { sair } from "@/app/actions";
import { MeusDocumentosPessoais } from "@/components/MeusDocumentosPessoais";

type TipoPeriodo = "calendario" | "fechamento";

function periodoAtual(tipo: TipoPeriodo): Periodo {
  const hoje = new Date();
  return tipo === "fechamento"
    ? periodoFechamento(hoje.getFullYear(), hoje.getMonth() + 1)
    : periodoMesCalendario(hoje.getFullYear(), hoje.getMonth() + 1);
}

/** Painel simples, mobile-first, pro colaborador ver a própria diária -
 * SEM sidebar, SEM menu, sem nada além disso (ver src/app/meu-painel,
 * que fica fora do grupo de rotas (app) de propósito, pra nunca herdar
 * a navegação de gerência). Ideia de 11/09, a pedido do Rafael, depois
 * de o Gustavo não saber quantas diárias tinha pra receber. */
export function PainelColaboradorConteudo({ nomeSessao }: { nomeSessao: string }) {
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("fechamento");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoAtual("fechamento"));
  const [resultado, setResultado] = useState<ResultadoMeuPainel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao trocar de período, antes da busca
    setCarregando(true);
    setErro(null);
    buscarMeuPainel(periodo)
      .then(setResultado)
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

  return (
    <div className="min-h-full flex flex-col bg-[var(--background)]">
      <header className="bg-navy text-white px-5 pt-6 pb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/60">Meu painel</p>
            <h1 className="text-lg font-bold">Olá, {nomeSessao.split(" ")[0]}</h1>
          </div>
          <form action={sair}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white cursor-pointer px-2 py-1"
            >
              <LogOut size={14} /> Sair
            </button>
          </form>
        </div>

        {resultado?.vinculado && (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/90">
            <Ship size={15} />
            {resultado.dados.plataformaAtual
              ? <span>Você está em <strong>{resultado.dados.plataformaAtual}</strong></span>
              : <span className="text-white/60">Você não está embarcado no momento</span>}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 -mt-4 pb-10">
        {erro && (
          <div className="bg-white border border-vermelho/30 text-vermelho rounded-xl shadow-sm px-4 py-4 text-sm">
            Não consegui buscar seus dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && resultado && !resultado.vinculado && (
          <div className="bg-white rounded-xl shadow-sm px-4 py-6 text-sm text-gray-600 text-center">
            Seu login ainda não está vinculado ao seu cadastro de colaborador - fala com o Rafael pra resolver isso,
            aí suas diárias aparecem aqui certinho.
          </div>
        )}

        {(!resultado || resultado.vinculado) && (
          <>
            {/* Seletor de tipo de período */}
            <div className="flex gap-2 mt-2 mb-3">
              <button
                type="button"
                onClick={() => trocarTipo("fechamento")}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  tipoPeriodo === "fechamento" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                Fechamento (20 a 19)
              </button>
              <button
                type="button"
                onClick={() => trocarTipo("calendario")}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  tipoPeriodo === "calendario" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                Mês calendário
              </button>
            </div>

            {/* Navegador de período */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navegar(-1)}
                className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-navy cursor-pointer"
                aria-label="Período anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-navy text-center px-2">{periodo.rotulo}</span>
              <button
                type="button"
                onClick={() => navegar(1)}
                className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-navy cursor-pointer"
                aria-label="Próximo período"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Card grande do total */}
            <div className="bg-white rounded-xl shadow-sm px-5 py-6 text-center mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Diárias no período</p>
              <p className="text-5xl font-bold text-navy tabular-nums">
                {carregando ? "-" : resultado?.vinculado ? resultado.dados.totalDiarias : 0}
              </p>
            </div>

            {/* Lista de embarques dentro do período */}
            {!carregando && resultado?.vinculado && resultado.dados.embarques.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                {resultado.dados.embarques.map((e) => (
                  <div key={e.embarqueId} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{e.obra}</p>
                      <p className="text-xs text-gray-400">
                        {e.periodoNoRecorte}
                        {e.aindaAtivo && <span className="ml-1.5 text-azul font-semibold">● ativo</span>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-navy tabular-nums shrink-0">
                      {e.diariasNoRecorte} {e.diariasNoRecorte === 1 ? "diária" : "diárias"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!carregando && resultado?.vinculado && resultado.dados.embarques.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm px-4 py-8 text-center text-sm text-gray-400">
                Nenhuma diária nesse período.
              </div>
            )}

            {/* 17/09: "Documentos Pessoais" virou de verdade - RDOs e
                Relatórios de Embarque do colaborador (todos os embarques,
                sem filtro de período). Contracheques continua só visual
                ("Em breve") até a automação por CPF existir - ver
                MeusDocumentosPessoais.tsx. */}
            <MeusDocumentosPessoais />
          </>
        )}
      </main>
    </div>
  );
}
