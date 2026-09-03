"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const OPCOES_ITENS_POR_PAGINA = [10, 25, 50, 100];

/** Monta a lista de números de página a mostrar, com "..." nos buracos -
 * sempre a primeira, a última, e uma janela em volta da página atual
 * (mesma ideia de qualquer paginação de tabela grande - sem isso, uma
 * lista com 54 páginas ficaria com 54 botões enfileirados). */
function montarPaginas(paginaAtual: number, totalPaginas: number): (number | "...")[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }
  const paginas = new Set<number>([1, totalPaginas, paginaAtual, paginaAtual - 1, paginaAtual + 1]);
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b);
  const resultado: (number | "...")[] = [];
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push("...");
    resultado.push(p);
  });
  return resultado;
}

/** Paginação de tabela reutilizada em todas as listas do módulo de
 * Certificados (Painel de vencimentos, Colaboradores, Tipos, Numeração) -
 * controlada de fora (a lista inteira já filtrada é recortada por quem
 * usa esse componente, aqui é só a interface). */
export function Paginacao({
  total,
  pagina,
  itensPorPagina,
  aoMudarPagina,
  aoMudarItensPorPagina,
}: {
  total: number;
  pagina: number;
  itensPorPagina: number;
  aoMudarPagina: (pagina: number) => void;
  aoMudarItensPorPagina: (itens: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = total === 0 ? 0 : (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(total, paginaAtual * itensPorPagina);
  const paginas = montarPaginas(paginaAtual, totalPaginas);

  const botaoPagina = "min-w-8 h-8 px-2 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
      <p className="text-xs text-gray-500">
        {total === 0 ? "Nenhum registro" : `Mostrando ${inicio} a ${fim} de ${total} registro(s)`}
      </p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Itens por página:
          <select
            value={itensPorPagina}
            onChange={(ev) => aoMudarItensPorPagina(Number(ev.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
          >
            {OPCOES_ITENS_POR_PAGINA.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => aoMudarPagina(1)} disabled={paginaAtual === 1} className={`${botaoPagina} text-gray-400 hover:bg-gray-100`}>
            <ChevronsLeft size={14} />
          </button>
          <button type="button" onClick={() => aoMudarPagina(paginaAtual - 1)} disabled={paginaAtual === 1} className={`${botaoPagina} text-gray-400 hover:bg-gray-100`}>
            <ChevronLeft size={14} />
          </button>
          {paginas.map((p, i) =>
            p === "..." ? (
              <span key={`reticencias-${i}`} className="min-w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => aoMudarPagina(p)}
                className={`${botaoPagina} ${p === paginaAtual ? "bg-azul text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {p}
              </button>
            )
          )}
          <button type="button" onClick={() => aoMudarPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas} className={`${botaoPagina} text-gray-400 hover:bg-gray-100`}>
            <ChevronRight size={14} />
          </button>
          <button type="button" onClick={() => aoMudarPagina(totalPaginas)} disabled={paginaAtual === totalPaginas} className={`${botaoPagina} text-gray-400 hover:bg-gray-100`}>
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
