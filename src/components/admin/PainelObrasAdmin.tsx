"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { ObraAdmin } from "@/lib/admin";
import { excluirObra } from "@/lib/adminActions";

export function PainelObrasAdmin({ obras }: { obras: ObraAdmin[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? obras.filter(
        (o) =>
          (o.nome || "").toLowerCase().includes(termo) ||
          (o.empresa || "").toLowerCase().includes(termo) ||
          (o.localFlotel || "").toLowerCase().includes(termo)
      )
    : obras;

  const excluir = async (o: ObraAdmin) => {
    const confirmado = window.confirm(
      `Excluir DE VEZ a obra "${o.nome || "-"}" (${o.empresa || "-"})?\n\nNão tem como desfazer. Confirma?`
    );
    if (!confirmado) return;
    setErro(null);
    setExcluindoId(o.id);
    const resultado = await excluirObra(o.id);
    setExcluindoId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Só dá pra excluir obra sem nenhum embarque vinculado (lixo de teste, duplicata sem uso, etc.) - obra com
        embarque em cima precisa ter o(s) embarque(s) excluído(s) primeiro, na seção Embarques acima.
      </p>

      <input
        type="text"
        value={busca}
        onChange={(ev) => setBusca(ev.target.value)}
        placeholder="Filtrar por nome, empresa ou plataforma..."
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 mb-3"
      />

      {erro && <p className="text-sm text-vermelho mb-3">{erro}</p>}

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Obra</th>
              <th className="px-3 py-2 font-semibold">Empresa</th>
              <th className="px-3 py-2 font-semibold">GM / MD</th>
              <th className="px-3 py-2 font-semibold text-center">Embarques</th>
              <th className="px-3 py-2 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  Nenhuma obra encontrada.
                </td>
              </tr>
            )}
            {filtradas.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-navy">
                  {o.nome || "-"}
                  {o.localFlotel && o.localFlotel !== o.nome ? (
                    <span className="text-gray-400 font-normal"> · {o.localFlotel}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-gray-600">{o.empresa || "-"}</td>
                <td className="px-3 py-2 text-gray-600">
                  {o.gmCodigo ? `GM ${o.gmCodigo}` : ""}
                  {o.gmCodigo && o.mdCodigo ? " · " : ""}
                  {o.mdCodigo ? `MD ${o.mdCodigo}` : ""}
                  {!o.gmCodigo && !o.mdCodigo ? "-" : ""}
                </td>
                <td className="px-3 py-2 text-center text-gray-600">{o.totalEmbarques}</td>
                <td className="px-3 py-2 text-right">
                  {o.totalEmbarques > 0 ? (
                    <span className="text-xs text-gray-400">em uso</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => excluir(o)}
                      disabled={excluindoId === o.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      <Trash2 size={13} />
                      {excluindoId === o.id ? "Excluindo..." : "Excluir"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
