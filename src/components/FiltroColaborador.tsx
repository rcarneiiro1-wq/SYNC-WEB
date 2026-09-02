"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Busca do histórico de UM colaborador - mesma ideia da tela equivalente
 * do desktop: escolhe o nome (autocomplete) e o período (tudo, ou um
 * mês/ano específico), e busca. Resultado usa o mesmo <TabelaHistorico />
 * que a tela de Histórico geral já usa. */
export function FiltroColaborador({
  colaboradoresSugeridos,
  valoresIniciais,
}: {
  colaboradoresSugeridos: string[];
  valoresIniciais: { colaborador: string; dataInicio: string; dataFim: string };
}) {
  const router = useRouter();
  const [colaborador, setColaborador] = useState(valoresIniciais.colaborador);
  const [periodo, setPeriodo] = useState<"tudo" | "mes">(
    valoresIniciais.dataInicio ? "mes" : "tudo"
  );
  const agora = new Date();
  const [mes, setMes] = useState(
    valoresIniciais.dataInicio ? Number(valoresIniciais.dataInicio.slice(5, 7)) - 1 : agora.getMonth()
  );
  const [ano, setAno] = useState(
    valoresIniciais.dataInicio ? Number(valoresIniciais.dataInicio.slice(0, 4)) : agora.getFullYear()
  );

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!colaborador.trim()) return;
    const params = new URLSearchParams();
    params.set("colaborador", colaborador.trim());
    if (periodo === "mes") {
      const inicio = new Date(ano, mes, 1);
      const fim = new Date(ano, mes + 1, 0);
      const paraIso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      params.set("dataInicio", paraIso(inicio));
      params.set("dataFim", paraIso(fim));
    }
    router.push(`/historico-colaborador?${params.toString()}`);
  }

  return (
    <form onSubmit={buscar} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium" htmlFor="busca-colaborador">
          🔍 Colaborador
        </label>
        <input
          id="busca-colaborador"
          list="lista-colaboradores-hist"
          value={colaborador}
          onChange={(e) => setColaborador(e.target.value)}
          placeholder="Nome do colaborador..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-azul"
        />
        <datalist id="lista-colaboradores-hist">
          {colaboradoresSugeridos.map((nome) => (
            <option key={nome} value={nome} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">Período</span>
        <div className="flex bg-gray-100 rounded-md p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPeriodo("tudo")}
            className={`px-3 py-1.5 rounded-md cursor-pointer ${periodo === "tudo" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}
          >
            Todo o período
          </button>
          <button
            type="button"
            onClick={() => setPeriodo("mes")}
            className={`px-3 py-1.5 rounded-md cursor-pointer ${periodo === "mes" ? "bg-white text-navy shadow-sm" : "text-gray-500"}`}
          >
            Mês específico
          </button>
        </div>
      </div>

      {periodo === "mes" && (
        <div className="flex gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium" htmlFor="mes-colaborador">Mês</label>
            <select
              id="mes-colaborador"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
            >
              {MESES.map((nomeMes, i) => (
                <option key={nomeMes} value={i}>{nomeMes}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium" htmlFor="ano-colaborador">Ano</label>
            <select
              id="ano-colaborador"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
            >
              {Array.from({ length: 4 }, (_, i) => agora.getFullYear() - 3 + i).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="bg-azul text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-azul-escuro cursor-pointer"
      >
        🔍 Buscar histórico
      </button>
    </form>
  );
}
