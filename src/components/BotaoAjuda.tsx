"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

/** Botão "Ajuda" no canto do cabeçalho de página - abre um balão com uma
 * dica curta de como aquela tela funciona. Só interface, não muda nenhuma
 * regra de negócio - mesmo padrão visual em todas as telas do módulo de
 * Certificados (e reutilizável em qualquer página do site depois). */
export function BotaoAjuda({ titulo, texto }: { titulo: string; texto: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 hover:text-azul hover:border-azul/40 transition-colors cursor-pointer"
      >
        <HelpCircle size={14} /> Ajuda
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 text-left">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-bold text-navy">{titulo}</p>
              <button type="button" onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{texto}</p>
          </div>
        </>
      )}
    </div>
  );
}
