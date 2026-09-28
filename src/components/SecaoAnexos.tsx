"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnexoEmbarque } from "@/lib/embarques";
import { tempoRelativo } from "@/lib/tempo";
import { urlDownloadArquivo } from "@/lib/download";
import { subirAnexoEmbarque, removerAnexoEmbarque, type TipoAnexo } from "@/lib/anexosActions";

const ROTULOS_TIPO: Record<TipoAnexo, string> = {
  rdo: "RDO",
  relatorio_embarque: "Relatório de Embarque",
};

/** Lista de anexos de um dos dois grupos (gerais ou assinados) - extraído
 * pra não duplicar o markup de seleção/abrir/remover duas vezes. */
function BlocoAnexos({
  anexos,
  selecionados,
  alternarSelecao,
  textoVazio,
}: {
  anexos: AnexoEmbarque[];
  selecionados: Set<string>;
  alternarSelecao: (id: string) => void;
  textoVazio: string;
}) {
  if (anexos.length === 0) {
    return <p className="text-xs text-gray-400 mb-2">{textoVazio}</p>;
  }
  return (
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
          {anexo.tipo && (
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap hidden md:inline">
              {ROTULOS_TIPO[anexo.tipo as TipoAnexo] || anexo.tipo}
            </span>
          )}
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
  );
}

/** Seção "Anexos do Embarque" - igual a janela "Ver RDOs" do desktop: lista
 * dos anexos (RDOs escaneados e Relatório de Embarque) do embarque, com
 * upload, seleção, abrir e remover. Usada tanto no card de embarque ATIVO
 * quanto no histórico - o Relatório de Embarque pode ser anexado a
 * qualquer momento, não precisa esperar o embarque ser encerrado no
 * sistema.
 *
 * Split em duas áreas (combinado com o Rafael em 13/09): os anexos gerais
 * ficam aqui em "Anexos do Embarque" (sem exigir assinatura), e os que
 * quem subiu confirmou como já assinados pelo fiscal aparecem à parte em
 * "Relatórios Assinados" - visível ao Geraldo, Uilian e Andréia nas duas
 * áreas. O upload automático do PDF de RDO (gerado pelo desktop) nunca
 * passa por aqui - é outro mecanismo, sempre vai pra "Anexos do Embarque"
 * sem classificação. */
export function SecaoAnexos({ embarqueId, anexos }: { embarqueId: string; anexos: AnexoEmbarque[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoEscolhido, setTipoEscolhido] = useState<TipoAnexo>("relatorio_embarque");
  const [assinadoEscolhido, setAssinadoEscolhido] = useState(false);

  const gerais = anexos.filter((a) => !a.assinado);
  const assinados = anexos.filter((a) => a.assinado);

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
    // try/finally aqui é essencial: se a Server Action lançar uma exceção de
    // verdade (não só devolver {sucesso:false}) - por exemplo uma queda de
    // conexão no meio do envio, bem comum em internet offshore limitada -,
    // sem o finally o "Processando..." ficava travado pra sempre, porque o
    // setProcessando(false) logo abaixo nunca era alcançado (achado em
    // 14/09, investigando por que "Remover" parecia não fazer mais nada
    // depois de uma falha anterior na mesma tela).
    try {
      for (const arquivo of Array.from(arquivos)) {
        const formData = new FormData();
        formData.set("embarqueId", embarqueId);
        formData.set("arquivo", arquivo);
        formData.set("tipo", tipoEscolhido);
        formData.set("assinado", assinadoEscolhido ? "true" : "false");
        const resultado = await subirAnexoEmbarque(formData);
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
    // mesmo motivo do try/finally em aoEscolherArquivos acima - sem isso,
    // uma exceção de rede no meio da remoção deixava o botão preso em
    // "Processando..." pro resto da sessão (só um F5 destravava), dando a
    // impressão de que "Remover" simplesmente não fazia nada.
    try {
      for (const id of selecionados) {
        const resultado = await removerAnexoEmbarque(id);
        if (!resultado.sucesso) {
          setErro(resultado.erro);
          break;
        }
      }
    } catch {
      setErro("Não consegui completar a remoção - confere a internet e tenta de novo.");
    } finally {
      setSelecionados(new Set());
      setProcessando(false);
      router.refresh();
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        📎 Anexos do Embarque ({gerais.length})
      </p>
      <p className="text-xs text-gray-400 mb-2">
        RDOs escaneados e o Relatório de Embarque - qualquer arquivo enviado sem marcar como assinado.
      </p>

      {erro && <p className="text-xs text-vermelho mb-2">{erro}</p>}

      <BlocoAnexos
        anexos={gerais}
        selecionados={selecionados}
        alternarSelecao={alternarSelecao}
        textoVazio="Nenhum anexo ainda."
      />

      <div className="flex flex-wrap items-center gap-2 mb-3 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
        <span className="text-xs text-gray-500">Ao anexar:</span>
        <select
          value={tipoEscolhido}
          onChange={(e) => setTipoEscolhido(e.target.value as TipoAnexo)}
          disabled={processando}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
        >
          <option value="relatorio_embarque">Relatório de Embarque</option>
          <option value="rdo">RDO</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            className="accent-azul"
            checked={assinadoEscolhido}
            onChange={(e) => setAssinadoEscolhido(e.target.checked)}
            disabled={processando}
          />
          já está assinado pelo fiscal
        </label>
      </div>

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

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          ✅ Relatórios Assinados ({assinados.length})
        </p>
        <p className="text-xs text-gray-400 mb-2">
          Fotos ou scans dos RDOs/Relatório de Embarque já assinados pelo fiscal, enviados manualmente.
        </p>
        <BlocoAnexos
          anexos={assinados}
          selecionados={selecionados}
          alternarSelecao={alternarSelecao}
          textoVazio="Nenhum relatório assinado anexado ainda."
        />
      </div>
    </div>
  );
}
