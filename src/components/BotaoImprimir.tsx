"use client";

/** Botão "Imprimir / Salvar PDF" - some da versão impressa (print:hidden),
 * o navegador já sabe salvar como PDF a partir do diálogo de impressão
 * nativo, então não precisa de nenhuma biblioteca de geração de PDF aqui. */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 bg-azul-escuro hover:bg-navy text-white text-sm font-bold px-4 py-2 rounded-md cursor-pointer transition-colors"
    >
      🖨️ Imprimir / Salvar PDF
    </button>
  );
}
