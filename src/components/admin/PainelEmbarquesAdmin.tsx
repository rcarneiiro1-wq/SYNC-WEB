"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, X } from "lucide-react";
import type { EmbarqueAdmin } from "@/lib/admin";
import { excluirEmbarque, encerrarEmbarque, type StatusFinalEmbarque } from "@/lib/adminActions";
import { formatarDataBr } from "@/lib/embarques";

/** Converte "2026-09-18 00:00:00" (formato que os campos data_* usam no
 * banco) pro "2026-09-18" que um <input type="date"> espera. */
function paraDataInput(valor: string | null): string {
  if (!valor) return "";
  return valor.slice(0, 10);
}

function ModalEncerrarEmbarque({
  embarque,
  aoFechar,
  aoEncerrar,
}: {
  embarque: EmbarqueAdmin;
  aoFechar: () => void;
  aoEncerrar: () => void;
}) {
  const [dataFim, setDataFim] = useState(paraDataInput(embarque.ultimoRdoData) || paraDataInput(new Date().toISOString()));
  const [statusFinal, setStatusFinal] = useState<StatusFinalEmbarque>("completo");
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    setErro(null);
    if (!dataFim) {
      setErro("Informe a data de encerramento.");
      return;
    }
    if (!justificativa.trim()) {
      setErro("A justificativa é obrigatória.");
      return;
    }
    setSalvando(true);
    const resultado = await encerrarEmbarque(embarque.id, dataFim, statusFinal, justificativa);
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    aoEncerrar();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={aoFechar}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-bold text-navy text-lg">Encerrar embarque</h2>
          <button type="button" onClick={aoFechar} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {embarque.efetivoNome || "-"} — {embarque.obraEmpresa || embarque.obraNome || "-"}
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Data de encerramento
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(ev) => setDataFim(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
            {embarque.ultimoRdoData && (
              <p className="text-xs text-gray-400 mt-1">
                Sugerida a partir do último RDO lançado ({formatarDataBr(embarque.ultimoRdoData)}).
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Situação final
            </label>
            <select
              value={statusFinal}
              onChange={(ev) => setStatusFinal(ev.target.value as StatusFinalEmbarque)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            >
              <option value="completo">Completo</option>
              <option value="com_pendencia">Com pendência</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Justificativa (obrigatória)
            </label>
            <textarea
              value={justificativa}
              onChange={(ev) => setJustificativa(ev.target.value)}
              rows={3}
              placeholder="Ex: colaborador desembarcou e esqueceu de encerrar no sistema - encerrado pela web com base na data do último RDO."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>

          {erro && <p className="text-sm text-vermelho">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={aoFechar}
            disabled={salvando}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={salvando}
            className="px-4 py-2 text-sm font-semibold text-white bg-azul hover:bg-azul/90 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {salvando ? "Encerrando..." : "Encerrar embarque"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PainelEmbarquesAdmin({ embarques }: { embarques: EmbarqueAdmin[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [embarqueEncerrando, setEmbarqueEncerrando] = useState<EmbarqueAdmin | null>(null);

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? embarques.filter(
        (e) =>
          (e.efetivoNome || "").toLowerCase().includes(termo) ||
          (e.obraNome || "").toLowerCase().includes(termo) ||
          (e.obraEmpresa || "").toLowerCase().includes(termo)
      )
    : embarques;

  const excluir = async (e: EmbarqueAdmin) => {
    const confirmado = window.confirm(
      `Excluir DE VEZ o embarque de "${e.efetivoNome || "-"}" (${e.obraEmpresa || e.obraNome || "-"})?\n\n` +
        `Isso também apaga ${e.totalRdos} RDO(s) e ${e.totalAnexos} anexo(s)/relatório(s) de embarque ligados a ele - inclusive os arquivos em si, não só o registro.\n\n` +
        `Não tem como desfazer. Confirma?`
    );
    if (!confirmado) return;
    setErro(null);
    setExcluindoId(e.id);
    const resultado = await excluirEmbarque(e.id);
    setExcluindoId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <input
        type="text"
        value={busca}
        onChange={(ev) => setBusca(ev.target.value)}
        placeholder="Filtrar por colaborador, obra ou empresa..."
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 mb-3"
      />

      {erro && <p className="text-sm text-vermelho mb-3">{erro}</p>}

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Colaborador</th>
              <th className="px-3 py-2 font-semibold">Empresa / Obra</th>
              <th className="px-3 py-2 font-semibold">Início</th>
              <th className="px-3 py-2 font-semibold">Fim</th>
              <th className="px-3 py-2 font-semibold">Situação</th>
              <th className="px-3 py-2 font-semibold text-center">RDOs</th>
              <th className="px-3 py-2 font-semibold text-center">Anexos</th>
              <th className="px-3 py-2 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  Nenhum embarque encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-navy">{e.efetivoNome || "-"}</td>
                <td className="px-3 py-2 text-gray-600">
                  {e.obraEmpresa || "-"}
                  {e.obraNome ? ` · ${e.obraNome}` : ""}
                </td>
                <td className="px-3 py-2 text-gray-600">{formatarDataBr(e.dataInicio)}</td>
                <td className="px-3 py-2 text-gray-600">{formatarDataBr(e.dataFim)}</td>
                <td className="px-3 py-2">
                  {e.ativo ? (
                    <span className="text-[11px] font-semibold text-verde bg-verde/10 rounded-full px-2 py-0.5">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                      Finalizado{e.statusFinal === "com_pendencia" ? " (c/ pendência)" : ""}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-gray-600">{e.totalRdos}</td>
                <td className="px-3 py-2 text-center text-gray-600">{e.totalAnexos}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {e.ativo && (
                      <button
                        type="button"
                        onClick={() => setEmbarqueEncerrando(e)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-azul hover:underline cursor-pointer"
                      >
                        <LogOut size={13} />
                        Encerrar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => excluir(e)}
                      disabled={excluindoId === e.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      <Trash2 size={13} />
                      {excluindoId === e.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {embarqueEncerrando && (
        <ModalEncerrarEmbarque
          embarque={embarqueEncerrando}
          aoFechar={() => setEmbarqueEncerrando(null)}
          aoEncerrar={() => {
            setEmbarqueEncerrando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
