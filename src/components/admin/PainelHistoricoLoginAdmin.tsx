import type { LoginHistoricoAdmin } from "@/lib/admin";
import { tempoRelativo } from "@/lib/tempo";

/** Só exibição - sem excluir/editar nada aqui, então não precisa ser
 * "use client" (sem estado, sem botão). */
export function PainelHistoricoLoginAdmin({ historico }: { historico: LoginHistoricoAdmin[] }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Só os últimos 5 dias, desktop e site juntos - depois disso o próprio sistema apaga sozinho, sem precisar
        fazer nada aqui.
      </p>

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Usuário</th>
              <th className="px-3 py-2 font-semibold">Quando logou</th>
              <th className="px-3 py-2 font-semibold text-center">Onde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {historico.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                  Nenhum login registrado nos últimos dias.
                </td>
              </tr>
            )}
            {historico.map((h, i) => (
              <tr key={`${h.usuario}-${h.logadoEm}-${i}`} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-navy">{h.nome || h.usuario}</td>
                <td className="px-3 py-2 text-gray-600">{tempoRelativo(h.logadoEm)}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      h.origem === "web" ? "bg-azul/10 text-azul" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {h.origem === "web" ? "Site" : "Desktop"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
