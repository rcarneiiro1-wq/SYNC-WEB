"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoriaDocumento, DocumentoGeral } from "@/lib/documentosPlataformaTipos";
import { ROTULO_CATEGORIA } from "@/lib/documentosPlataformaTipos";
import { urlDownloadArquivo } from "@/lib/download";
import { tempoRelativo } from "@/lib/tempo";
import { removerDocumentoPlataforma } from "@/lib/documentosPlataformaActions";
import { BotaoEnviarDocumento } from "./BotaoEnviarDocumento";

function tamanhoLegivel(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Um card de categoria MANUAL (Isométricos/P&ID/Plantas/Outros) - lista +
 * botão de enviar + remover. As categorias "automáticas" (RDOs/Relatório de
 * Embarque) não usam esse componente, elas nunca têm upload manual aqui. */
export function CategoriaDocumentoGeral({
  obraId,
  categoria,
  documentos,
}: {
  obraId: string;
  categoria: CategoriaDocumento;
  documentos: DocumentoGeral[];
}) {
  const router = useRouter();
  const [removendo, setRemovendo] = useState<string | null>(null);

  const remover = async (id: string, nome: string) => {
    const confirmado = window.confirm(`Remover "${nome}"? Essa ação não pode ser desfeita.`);
    if (!confirmado) return;
    setRemovendo(id);
    try {
      const resultado = await removerDocumentoPlataforma(id);
      if (!resultado.sucesso) window.alert(resultado.erro);
    } catch {
      window.alert("Não consegui remover - confere a internet e tenta de novo.");
    } finally {
      setRemovendo(null);
      router.refresh();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-navy text-sm truncate">{ROTULO_CATEGORIA[categoria]}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-verde bg-verde/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            📌 Geral
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">({documentos.length})</span>
        </div>
        <BotaoEnviarDocumento obraId={obraId} categoria={categoria} />
      </div>
      {documentos.length === 0 ? (
        <p className="text-xs text-gray-400 px-4 py-4">Nenhum documento ainda.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="flex-1 min-w-0 text-gray-700 truncate" title={doc.nomeArquivo}>
                {doc.nomeArquivo}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
                {tamanhoLegivel(doc.tamanhoBytes)}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{doc.enviadoPor || "-"}</span>
              <span className="text-xs text-gray-300 whitespace-nowrap hidden md:inline">
                {tempoRelativo(doc.enviadoEm)}
              </span>
              {doc.url && (
                <a
                  href={urlDownloadArquivo(doc.url, doc.nomeArquivo)}
                  className="text-azul font-semibold hover:underline whitespace-nowrap"
                  title="Baixar"
                >
                  ⬇
                </a>
              )}
              <button
                type="button"
                onClick={() => remover(doc.id, doc.nomeArquivo)}
                disabled={removendo === doc.id}
                className="text-vermelho hover:underline text-xs disabled:opacity-50 cursor-pointer"
                title="Remover"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
