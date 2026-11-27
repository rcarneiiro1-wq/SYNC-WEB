"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  prepararUploadDocumentoPlataforma,
  confirmarUploadDocumentoPlataforma,
} from "@/lib/documentosPlataformaActions";
import { clienteNavegador } from "@/lib/supabase-browser";
import type { CategoriaDocumento } from "@/lib/documentosPlataformaTipos";

/** Botão "➕ Enviar arquivo" reutilizado nos dois lugares combinados com o
 * Rafael em 14/09: inline em cada card de categoria (igual o mockup que ele
 * aprovou) E na tela dedicada "Upload de Arquivos" da sidebar - os dois
 * chamam a MESMA Server Action, então o comportamento é sempre idêntico.
 *
 * 27/11 (pedido do Rafael): antes de enviar de verdade, abre um painel
 * pequeno pra digitar uma observação opcional (ex: "MD de escaneamento de
 * linhas") - é o jeito dele distinguir documentos do mesmo tipo/categoria
 * enviados em épocas diferentes, só pelo nome do arquivo isso já não dava.
 * Uma observação só vale pro LOTE inteiro escolhido de uma vez (normal: é
 * o mesmo motivo de upload pros arquivos escolhidos juntos). */
export function BotaoEnviarDocumento({ obraId, categoria }: { obraId: string; categoria: CategoriaDocumento }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<File[] | null>(null);
  const [observacao, setObservacao] = useState("");
  // 27/11 (bug reportado pelo Rafael): o painel da observação ficava
  // "dentro do quadrado" do card, cortado/espremido - porque cada card de
  // categoria tem `overflow-hidden` (só pra arredondar os cantos), e isso
  // corta QUALQUER filho `position: absolute` que tente passar da borda do
  // card. Resolvido com portal pro `document.body` + `position: fixed`
  // calculado pela posição real do botão na tela - assim o painel flutua
  // livre, por cima de tudo, sem ficar preso ao card.
  const [posicaoPainel, setPosicaoPainel] = useState<{ top: number; left: number } | null>(null);

  const aoEscolherArquivos = (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setErro(null);
    setObservacao("");
    const rect = wrapperRef.current?.getBoundingClientRect();
    const LARGURA_PAINEL = 288; // w-72
    if (rect) {
      setPosicaoPainel({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.right - LARGURA_PAINEL), window.innerWidth - LARGURA_PAINEL - 8),
      });
    }
    setPendentes(Array.from(arquivos));
  };

  const cancelar = () => {
    setPendentes(null);
    setObservacao("");
    setPosicaoPainel(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirmarEnvio = async () => {
    if (!pendentes || pendentes.length === 0) return;
    setProcessando(true);
    setErro(null);
    // try/catch/finally - mesmo motivo já documentado em SecaoAnexos.tsx
    // (14/09): sem isso, uma queda de conexão no meio do envio trava o
    // botão em "Enviando..." pro resto da sessão, sem nenhum erro visível.
    //
    // 12/11: upload em DUAS etapas (ver documentosPlataformaActions.ts) -
    // o arquivo em si nunca passa pela Server Action (seria barrado pelo
    // limite de 4.5MB da própria Vercel, que é bem menor que os 50MB que a
    // tela promete); ele vai DIRETO pro Supabase Storage usando um link
    // assinado, e só o metadado (nome/tamanho/categoria/observação) passa
    // pela action.
    try {
      for (const arquivo of pendentes) {
        const preparo = await prepararUploadDocumentoPlataforma(obraId, categoria, arquivo.name, arquivo.size);
        if (!preparo.sucesso) {
          setErro(preparo.erro);
          break;
        }

        const { error: erroUpload } = await clienteNavegador()
          .storage.from("documentos-plataforma")
          .uploadToSignedUrl(preparo.caminhoNoBucket, preparo.token, arquivo, {
            contentType: preparo.contentType,
          });
        if (erroUpload) {
          setErro(`Não consegui subir o arquivo: ${erroUpload.message}`);
          break;
        }

        const resultado = await confirmarUploadDocumentoPlataforma({
          documentoId: preparo.documentoId,
          grupoKey: obraId,
          categoria,
          caminhoNoBucket: preparo.caminhoNoBucket,
          nomeArquivo: arquivo.name,
          tamanhoBytes: arquivo.size,
          observacao,
        });
        if (!resultado.sucesso) {
          setErro(resultado.erro);
          break;
        }
      }
      setPendentes(null);
      setObservacao("");
      setPosicaoPainel(null);
    } catch {
      setErro("Não consegui completar o envio - confere a internet e tenta de novo.");
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex flex-col items-end gap-1">
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

      {pendentes &&
        posicaoPainel &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => !processando && cancelar()} />
            <div
              style={{ top: posicaoPainel.top, left: posicaoPainel.left }}
              className="fixed z-50 w-72 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-left"
            >
              <p className="text-xs font-semibold text-navy mb-1 break-words">
                {pendentes.length === 1 ? pendentes[0].name : `${pendentes.length} arquivos selecionados`}
              </p>
              <label className="block text-[11px] text-gray-500 mb-1">Observação (opcional)</label>
              <textarea
                autoFocus
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="ex: MD de escaneamento de linhas"
                rows={2}
                disabled={processando}
                className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-azul disabled:opacity-60"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={processando}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 cursor-pointer disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEnvio}
                  disabled={processando}
                  className="text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md px-3 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
                >
                  {processando ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
