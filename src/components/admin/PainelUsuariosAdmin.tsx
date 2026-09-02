"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShieldCheck } from "lucide-react";
import type { UsuarioAdmin } from "@/lib/admin";
import { excluirUsuario } from "@/lib/adminActions";

export function PainelUsuariosAdmin({ usuarios, usuarioLogado }: { usuarios: UsuarioAdmin[]; usuarioLogado: string }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const excluir = async (u: UsuarioAdmin) => {
    const confirmado = window.confirm(
      `Excluir o usuário "${u.nome}" (login: ${u.usuario})?\n\nA pessoa perde o acesso ao sistema (desktop e web) imediatamente. Não tem como desfazer. Confirma?`
    );
    if (!confirmado) return;
    setErro(null);
    setExcluindo(u.usuario);
    const resultado = await excluirUsuario(u.usuario);
    setExcluindo(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      {erro && <p className="text-sm text-vermelho mb-3">{erro}</p>}

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">Login</th>
              <th className="px-3 py-2 font-semibold">Função</th>
              <th className="px-3 py-2 font-semibold">Admin</th>
              <th className="px-3 py-2 font-semibold">Situação</th>
              <th className="px-3 py-2 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u) => {
              const souEu = u.usuario.toLowerCase() === usuarioLogado.toLowerCase();
              return (
                <tr key={u.usuario} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-navy">
                    {u.nome} {souEu && <span className="text-[10px] text-gray-400">(você)</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{u.usuario}</td>
                  <td className="px-3 py-2 text-gray-600">{u.funcao || "-"}</td>
                  <td className="px-3 py-2">
                    {u.ehAdmin && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-azul bg-azul/10 rounded-full px-2 py-0.5">
                        <ShieldCheck size={12} /> Admin
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.ativo ? (
                      <span className="text-[11px] font-semibold text-verde bg-verde/10 rounded-full px-2 py-0.5">Ativo</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Inativo</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!souEu && (
                      <button
                        type="button"
                        onClick={() => excluir(u)}
                        disabled={excluindo === u.usuario}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >
                        <Trash2 size={13} />
                        {excluindo === u.usuario ? "Excluindo..." : "Excluir"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
