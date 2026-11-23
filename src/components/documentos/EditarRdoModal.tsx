"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buscarRdoParaEditar, salvarEdicaoRdo, type RdoParaEditar } from "@/lib/rdoEditorActions";

/** Valores de "Local" já vistos em RDO de verdade - só sugestão (datalist,
 * digitável livremente também), pra evitar erro de digitação no mesmo
 * campo que já causou os 4 PDFs errados corrigidos na mão em 12/11. */
const LOCAIS_SUGERIDOS = ["PROA", "POPA", "BORESTE", "BOMBORDO", "FLARE", "VENTPOST", "GUINDASTES", "HELIDECK", "RISER"];

/** Modal "Editar RDO" (12/11) - pedido do Rafael depois do incidente dos
 * campos "Local" errados: uma forma simples da coordenação corrigir um RDO
 * já gerado direto pelo site, sem precisar mexer no banco na mão. Edita só
 * os campos que já existem na nuvem e aparecem impressos de forma simples
 * no PDF (Local + Descrição) - ver `rdoEditorActions.ts`/`rdoPdfPatch.ts`
 * pro porquê de horário/PT/intervalo ficarem de fora por enquanto. Ao
 * salvar, tenta corrigir o PDF já gerado também (não só o banco) - se não
 * conseguir por algum motivo, avisa mas não desfaz o que já salvou no
 * banco. */
export function EditarRdoModal({ rdoId, onFechar }: { rdoId: string; onFechar: () => void }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [rdo, setRdo] = useState<RdoParaEditar | null>(null);
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const resultado = await buscarRdoParaEditar(rdoId);
      if (cancelado) return;
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        setCarregando(false);
        return;
      }
      setRdo(resultado.rdo);
      setLocal(resultado.rdo.localAtuacao);
      setDescricao(resultado.rdo.descricao);
      setCarregando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [rdoId]);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const resultado = await salvarEdicaoRdo({ rdoId, novoLocal: local, novaDescricao: descricao });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      if (resultado.avisoPdf) {
        setAviso(resultado.avisoPdf);
        router.refresh();
        return;
      }
      router.refresh();
      onFechar();
    } catch {
      setErro("Não consegui salvar - confere a internet e tenta de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy">
            ✏️ Editar RDO {rdo ? `#${rdo.numeroRdo}` : ""}
          </h2>
          <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none">
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          {carregando && <p className="text-sm text-gray-400">Carregando...</p>}

          {!carregando && erro && !rdo && <p className="text-sm text-vermelho">{erro}</p>}

          {rdo && (
            <>
              <p className="text-xs text-gray-400 mb-4">
                {rdo.colaborador} · {rdo.obraNome}
              </p>

              {erro && <p className="text-xs text-vermelho mb-3">{erro}</p>}
              {aviso && (
                <p className="text-xs text-amarelo bg-amarelo/10 border border-amarelo/30 rounded-md px-3 py-2 mb-3">
                  ⚠️ {aviso}
                </p>
              )}

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Local</label>
              <input
                type="text"
                list="locais-sugeridos"
                value={local}
                onChange={(e) => setLocal(e.target.value.toUpperCase())}
                disabled={salvando}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-azul/30"
              />
              <datalist id="locais-sugeridos">
                {LOCAIS_SUGERIDOS.map((valor) => (
                  <option key={valor} value={valor} />
                ))}
              </datalist>

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Descrição das atividades
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={salvando}
                rows={10}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-azul/30"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Isso também tenta corrigir o PDF já gerado desse RDO, não só o banco.
              </p>
            </>
          )}
        </div>

        {rdo && (
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md px-4 py-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {salvando ? "Salvando..." : "💾 Salvar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
