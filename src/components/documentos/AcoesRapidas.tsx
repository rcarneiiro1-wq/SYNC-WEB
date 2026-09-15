"use client";

import { useState } from "react";
import { Clock, HelpCircle, Settings, Upload, X } from "lucide-react";

function BotaoDesabilitado({ Icone, rotulo }: { Icone: typeof Settings; rotulo: string }) {
  return (
    <span
      title="Ainda não disponível - em breve"
      className="flex items-center gap-2 bg-gray-50 text-gray-300 text-xs font-semibold rounded-md border border-gray-200 px-3 py-2 cursor-not-allowed"
    >
      <Icone size={14} /> {rotulo}
      <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-gray-300">Em breve</span>
    </span>
  );
}

/** Coluna lateral "Ações Rápidas" (briefing de 15/09).
 *
 * 15/09, ajuste a pedido do Rafael depois de ver rodando: "é muita
 * informação que realmente não precisa" - "Enviar documento" e "Ver
 * histórico" voltaram a ficar DESABILITADOS ("Em breve"), igual
 * "Configurações" já estava (essa continua sem tela própria ainda). Só
 * "Ajuda" fica ativa. Os dois botões desativados não foram apagados, só
 * trocados de `<Link>` pra `<span>` desabilitada - é rápido reativar depois
 * se o Rafael pedir de volta (o link real pra cada um já tá comentado
 * abaixo, pra não perder a referência). */
export function AcoesRapidas() {
  const [ajudaAberta, setAjudaAberta] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm font-bold text-navy mb-3">Ações Rápidas</p>
      <div className="flex flex-col gap-2">
        {/* desabilitado 15/09 - reativar: <Link href={`/documentos-plataforma/upload?obra=${obraId}`}> */}
        <BotaoDesabilitado Icone={Upload} rotulo="Enviar documento" />

        {/* desabilitado 15/09 - reativar: <Link href="/historico"> */}
        <BotaoDesabilitado Icone={Clock} rotulo="Ver histórico" />

        <BotaoDesabilitado Icone={Settings} rotulo="Configurações" />

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
                  <p className="text-sm font-bold text-navy">Biblioteca de Documentos</p>
                  <button type="button" onClick={() => setAjudaAberta(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  RDOs e Relatórios de Embarque aparecem sozinhos aqui, sem precisar subir nada. Os documentos gerais
                  (Isométricos, P&amp;ID, Plantas, MD/GM/SS/WO, Outros) são enviados manualmente pelo botão de cada
                  categoria.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
