"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, GitBranch, Map, MoreVertical, Paperclip, ShieldCheck, Info } from "lucide-react";
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

// 15/09: selo com a extensão do arquivo (PDF/JPG/PNG/HEIC) - só pra dar um
// ponto de referência visual rápido, igual o ícone de tipo de arquivo do
// Drive/Dropbox (ver conversa sobre visibilidade do nome do arquivo).
function extensaoDoArquivo(nomeArquivo: string): string {
  const ext = nomeArquivo.split(".").pop() || "";
  return ext.slice(0, 4).toUpperCase() || "DOC";
}

// 15/09 (redesenho aprovado pelo Rafael a partir do mockup): um ícone por
// categoria, só visual - reaproveita o `lucide-react` que o resto do site
// já usa (Sidebar.tsx etc.), sem introduzir nenhuma biblioteca nova.
const ICONE_CATEGORIA: Record<CategoriaDocumento, { Icone: typeof Box; chip: string }> = {
  isometricos: { Icone: Box, chip: "bg-azul/10 text-azul-escuro" },
  pid: { Icone: GitBranch, chip: "bg-navy/10 text-navy" },
  plantas: { Icone: Map, chip: "bg-verde/10 text-verde" },
  mdgmsswo: { Icone: ShieldCheck, chip: "bg-vermelho/10 text-vermelho" },
  outros: { Icone: Paperclip, chip: "bg-gray-100 text-gray-500" },
};

/** Um card de categoria MANUAL (Isométricos/P&ID/Plantas/MD-GM-SS-WO/
 * Outros) - lista + botão de enviar + remover. As categorias "automáticas"
 * (RDOs/Relatório de Embarque) não usam esse componente, elas nunca têm
 * upload manual aqui.
 *
 * Redesenho de 15/09: ícone por categoria no cabeçalho, e o "🗑 remover"
 * direto virou um menu "⋮" (Baixar/Remover) por linha, igual o Rafael
 * pediu no briefing - o "baixar" que já existia continua fazendo a mesma
 * coisa, só mudou de lugar.
 *
 * Ajuste de 15/09 (depois do Rafael testar): o nome do arquivo ficava
 * "escondido", espremido numa linha só junto com tamanho/quem
 * enviou/data/ações. Virou duas linhas por documento - padrão
 * Drive/Dropbox, "Opção A" das duas que mostrei pra ele escolher: nome em
 * destaque na primeira linha (quase a largura toda do card), e uma legenda
 * pequena/cinza embaixo com tamanho · quem enviou · há quanto tempo. */
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
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const remover = async (id: string, nome: string) => {
    setMenuAberto(null);
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

  const { Icone, chip } = ICONE_CATEGORIA[categoria];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex-none w-6 h-6 rounded-md flex items-center justify-center ${chip}`}>
            <Icone size={13} />
          </span>
          <span className="font-semibold text-navy text-sm truncate">{ROTULO_CATEGORIA[categoria]}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-verde bg-verde/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            Geral
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">({documentos.length})</span>
          <Info size={13} className="text-gray-300 flex-none" />
        </div>
        <BotaoEnviarDocumento obraId={obraId} categoria={categoria} />
      </div>
      {documentos.length === 0 ? (
        <p className="text-xs text-gray-400 px-4 py-4">Nenhum documento ainda.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-start gap-3 px-4 py-2.5 text-sm relative">
              <span className="flex-none w-7 h-7 mt-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center">
                {extensaoDoArquivo(doc.nomeArquivo)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <span className="flex-1 min-w-0 text-gray-700 font-semibold break-words" title={doc.nomeArquivo}>
                    {doc.nomeArquivo}
                  </span>
                  <div className="flex-none flex items-center gap-2 mt-0.5">
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
                      onClick={() => setMenuAberto((atual) => (atual === doc.id ? null : doc.id))}
                      disabled={removendo === doc.id}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-50"
                      title="Mais opções"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {tamanhoLegivel(doc.tamanhoBytes)} · {doc.enviadoPor || "-"} · {tempoRelativo(doc.enviadoEm)}
                </p>
              </div>

              {menuAberto === doc.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(null)} />
                  <div className="absolute right-4 top-9 z-50 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 text-left">
                    {doc.url && (
                      <a
                        href={urlDownloadArquivo(doc.url, doc.nomeArquivo)}
                        onClick={() => setMenuAberto(null)}
                        className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        ⬇ Baixar
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => remover(doc.id, doc.nomeArquivo)}
                      className="block w-full text-left px-3 py-1.5 text-xs text-vermelho hover:bg-gray-50 cursor-pointer"
                    >
                      🗑 Remover
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
