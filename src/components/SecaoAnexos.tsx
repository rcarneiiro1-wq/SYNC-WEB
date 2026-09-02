"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnexoEmbarque } from "@/lib/embarques";
import { tempoRelativo } from "@/lib/tempo";
import { urlDownloadArquivo } from "@/lib/download";
import { subirAnexoEmbarque, removerAnexoEmbarque } from "@/lib/anexosActions";

/** Seção "Relatórios assinados" - igual a janela "Ver RDOs" do desktop:
 * lista dos anexos (fotos/scans dos RDOs e do relatório de embarque já
 * assinados pelo fiscal), com upload, seleção, abrir e remover. Usada
 * tanto no card de embarque ATIVO quanto no histórico - o relatório de
 * embarque final pode ser anexado a qualquer momento, não precisa esperar
 * o embarque ser encerrado no sistema. */
export function SecaoAnexos({ embarqueId, anexos }: { embarqueId: string; anexos: AnexoEmbarque[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alternarSelecao = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const selecionarTodos = () => {
    setSelecionados((atual) => (atual.size === anexos.length ? new Set() : new Set(anexos.map((a) => a.id))));
  };

  const aoEscolherArquivos = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setProcessando(true);
    setErro(null);
    for (const arquivo of Array.from(arquivos)) {
      const formData = new FormData();
      formData.set("embarqueId", embarqueId);
      formData.set("arquivo", arquivo);
      const resultado = await subirAnexoEmbarque(formData);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        break;
      }
    }
    setProcessando(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  };

  const abrirSelecionados = () => {
    for (const anexo of anexos.filter((a) => selecionados.has(a.id) && a.url)) {
      window.open(anexo.url as string, "_blank", "noopener,noreferrer");
    }
  };

  const removerSelecionados = async () => {
    if (selecionados.size === 0) return;
    const confirmado = window.confirm(
      `Remover ${selecionados.size} arquivo(s) anexado(s)? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;
    setProcessando(true);
    setErro(null);
    for (const id of selecionados) {
      const resultado = await removerAnexoEmbarque(id);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        break;
      }
    }
    setSelecionados(new Set());
    setProcessando(false);
    router.refresh();
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        📎 Relatórios assinados ({anexos.length})
      </p>
      <p className="text-xs text-gray-400 mb-2">
        Fotos ou scans dos RDOs/relatório de embarque já assinados pelo fiscal.
      </p>

      {erro && <p className="text-xs text-vermelho mb-2">{erro}</p>}

      {anexos.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">Nenhum relatório assinado anexado ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-md mb-2 bg-white overflow-hidden">
          {anexos.map((anexo) => (
            <label
              key={anexo.id}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                className="accent-azul shrink-0"
                checked={selecionados.has(anexo.id)}
                onChange={() => alternarSelecao(anexo.id)}
              />
              <span className="flex-1 text-gray-700 truncate" title={anexo.nomeArquivo}>
                {anexo.nomeArquivo}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{anexo.enviadoPor || "-"}</span>
              <span className="text-xs text-gray-300 whitespace-nowrap hidden sm:inline">
                {tempoRelativo(anexo.enviadoEm)}
              </span>
              {anexo.url ? (
                <a
                  href={urlDownloadArquivo(anexo.url, anexo.nomeArquivo)}
                  onClick={(e) => e.stopPropagation()}
                  className="text-azul font-semibold whitespace-nowrap hover:underline"
                  title="Baixar"
                >
                  ⬇
                </a>
              ) : (
                <span className="text-xs text-gray-300 whitespace-nowrap">enviando...</span>
              )}
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processando}
          className="text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {processando ? "Processando..." : "➕ Anexar arquivo(s)"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          className="hidden"
          onChange={(e) => aoEscolherArquivos(e.target.files)}
        />
        {anexos.length > 0 && (
          <>
            <button
              type="button"
              onClick={selecionarTodos}
              className="text-xs font-medium text-azul hover:underline cursor-pointer whitespace-nowrap"
            >
              {selecionados.size === anexos.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <button
              type="button"
              onClick={abrirSelecionados}
              disabled={selecionados.size === 0}
              className="text-xs font-medium text-azul hover:underline cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:no-underline disabled:cursor-default"
            >
              👁 Abrir selecionado(s)
            </button>
            <button
              type="button"
              onClick={removerSelecionados}
              disabled={selecionados.size === 0 || processando}
              className="text-xs font-medium text-vermelho hover:underline cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:no-underline disabled:cursor-default"
            >
              🗑 Remover selecionado(s)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
