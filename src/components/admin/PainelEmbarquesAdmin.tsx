"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { EmbarqueAdmin } from "@/lib/admin";
import { excluirEmbarque } from "@/lib/adminActions";
import { formatarDataBr } from "@/lib/embarques";

export function PainelEmbarquesAdmin({ embarques }: { embarques: EmbarqueAdmin[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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
                  <button
                    type="button"
                    onClick={() => excluir(e)}
                    disabled={excluindoId === e.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                  >
                    <Trash2 size={13} />
                    {excluindoId === e.id ? "Excluindo..." : "Excluir"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
