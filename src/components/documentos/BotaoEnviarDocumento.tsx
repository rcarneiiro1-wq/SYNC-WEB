"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentoPlataforma } from "@/lib/documentosPlataformaActions";
import type { CategoriaDocumento } from "@/lib/documentosPlataformaTipos";

/** Botão "➕ Enviar arquivo" reutilizado nos dois lugares combinados com o
 * Rafael em 14/09: inline em cada card de categoria (igual o mockup que ele
 * aprovou) E na tela dedicada "Upload de Arquivos" da sidebar - os dois
 * chamam a MESMA Server Action, então o comportamento é sempre idêntico. */
export function BotaoEnviarDocumento({ obraId, categoria }: { obraId: string; categoria: CategoriaDocumento }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aoEscolherArquivos = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setProcessando(true);
    setErro(null);
    // try/catch/finally - mesmo motivo já documentado em SecaoAnexos.tsx
    // (14/09): sem isso, uma queda de conexão no meio do envio trava o
    // botão em "Enviando..." pro resto da sessão, sem nenhum erro visível.
    try {
      for (const arquivo of Array.from(arquivos)) {
        const formData = new FormData();
        formData.set("obraId", obraId);
        formData.set("categoria", categoria);
        formData.set("arquivo", arquivo);
        const resultado = await uploadDocumentoPlataforma(formData);
        if (!resultado.sucesso) {
          setErro(resultado.erro);
          break;
        }
      }
    } catch {
      setErro("Não consegui completar o envio - confere a internet e tenta de novo.");
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processando}
        className="text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
      >
        {processando ? "Enviando..." : "➕ Enviar arquivo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        className="hidden"
        onChange={(e) => aoEscolherArquivos(e.target.files)}
      />
      {erro && <p className="text-[11px] text-vermelho text-right max-w-[220px]">{erro}</p>}
    </div>
  );
}
