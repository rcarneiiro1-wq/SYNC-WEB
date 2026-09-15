"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, HelpCircle, Settings, Upload, X } from "lucide-react";

/** Coluna lateral "Ações Rápidas" (briefing de 15/09). Cada botão vai pra
 * uma tela que já existe de verdade no site - nada de link fantasma:
 * - "Enviar documento" -> a própria tela de upload dedicada
 *   (`/documentos-plataforma/upload`), já existente na Sidebar.
 * - "Ver histórico" -> `/historico`, já existente na Sidebar (ícone Clock,
 *   igual usado lá).
 * - "Configurações" fica DESABILITADO ("em breve") de propósito - ainda
 *   não existe essa tela no site (a própria Sidebar já avisa isso hoje:
 *   "Em breve: RDO · Relatórios gerais · Configurações"), então não faz
 *   sentido fingir um link que não leva a lugar nenhum.
 * - "Ajuda" reaproveita o MESMO padrão visual/comportamento do
 *   `BotaoAjuda.tsx` já usado no módulo de Certificados (balão com dica
 *   curta) - só adaptado pro formato de botão cheio da lateral, em vez do
 *   botãozinho de cabeçalho. */
export function AcoesRapidas({ obraId }: { obraId: string }) {
  const [ajudaAberta, setAjudaAberta] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm font-bold text-navy mb-3">Ações Rápidas</p>
      <div className="flex flex-col gap-2">
        <Link
          href={`/documentos-plataforma/upload?obra=${encodeURIComponent(obraId)}`}
          className="flex items-center justify-center gap-2 bg-azul hover:bg-azul-escuro transition-colors text-white text-sm font-bold rounded-md px-3 py-2.5 cursor-pointer"
        >
          <Upload size={15} /> Enviar documento
        </Link>

        <Link
          href="/historico"
          className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 text-xs font-semibold rounded-md border border-gray-200 px-3 py-2 cursor-pointer"
        >
          <Clock size={14} /> Ver histórico
        </Link>

        <span
          title="Ainda não disponível - em breve"
          className="flex items-center gap-2 bg-gray-50 text-gray-300 text-xs font-semibold rounded-md border border-gray-200 px-3 py-2 cursor-not-allowed"
        >
          <Settings size={14} /> Configurações
          <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-gray-300">Em breve</span>
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setAjudaAberta((v) => !v)}
            className="w-full flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 text-xs font-semibold rounded-md border border-gray-200 px-3 py-2 cursor-pointer"
          >
            <HelpCircle size={14} /> Ajuda
          </button>
          {ajudaAberta && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAjudaAberta(false)} />
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 text-left">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-navy">Documentos da Plataforma</p>
                  <button type="button" onClick={() => setAjudaAberta(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  RDOs e Relatórios de Embarque aparecem sozinhos aqui, sem precisar subir nada. Os documentos gerais
                  (Isométricos, P&amp;ID, Plantas, MD/GM/SS/WO, Outros) são enviados manualmente pelo botão de cada
                  categoria, ou por &quot;Enviar documento&quot; aqui do lado.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
