"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeletorEmpresas } from "@/components/SeletorEmpresas";

type ValoresFiltro = {
  colaborador: string;
  obra: string;
  empresas: string[];
  situacao: string;
  dataInicio: string;
  dataFim: string;
};

export function FiltroHistorico({
  colaboradoresSugeridos,
  obrasSugeridas,
  empresasCadastradas,
  valoresIniciais,
}: {
  colaboradoresSugeridos: string[];
  obrasSugeridas: string[];
  empresasCadastradas: string[];
  valoresIniciais: ValoresFiltro;
}) {
  const router = useRouter();
  const [colaborador, setColaborador] = useState(valoresIniciais.colaborador);
  const [obra, setObra] = useState(valoresIniciais.obra);
  const [empresas, setEmpresas] = useState<Set<string>>(new Set(valoresIniciais.empresas));
  const [situacao, setSituacao] = useState(valoresIniciais.situacao);
  const [dataInicio, setDataInicio] = useState(valoresIniciais.dataInicio);
  const [dataFim, setDataFim] = useState(valoresIniciais.dataFim);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (colaborador) params.set("colaborador", colaborador);
    if (obra) params.set("obra", obra);
    for (const empresa of empresas) params.append("empresa", empresa);
    if (situacao && situacao !== "todos") params.set("situacao", situacao);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    const querystring = params.toString();
    router.push(`/historico${querystring ? `?${querystring}` : ""}`);
  }

  function limpar() {
    setColaborador("");
    setObra("");
    setEmpresas(new Set());
    setSituacao("todos");
    setDataInicio("");
    setDataFim("");
    router.push("/historico");
  }

  return (
    <form
      onSubmit={buscar}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-col gap-4"
    >
      <SeletorEmpresas empresas={empresasCadastradas} selecionadas={empresas} aoMudar={setEmpresas} />

      <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-colaborador">
          Colaborador
        </label>
        <input
          id="filtro-colaborador"
          list="lista-colaboradores"
          value={colaborador}
          onChange={(e) => setColaborador(e.target.value)}
          placeholder="Nome..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-azul"
        />
        <datalist id="lista-colaboradores">
          {colaboradoresSugeridos.map((nome) => (
            <option key={nome} value={nome} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-obra">
          Obra / Plataforma
        </label>
        <input
          id="filtro-obra"
          list="lista-obras"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
          placeholder="Plataforma..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-azul"
        />
        <datalist id="lista-obras">
          {obrasSugeridas.map((nome) => (
            <option key={nome} value={nome} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-situacao">
          Situação
        </label>
        <select
          id="filtro-situacao"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
        >
          <option value="todos">Todos</option>
          <option value="concluido">Só em dia</option>
          <option value="pendencia">Só com pendência</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-data-inicio">
          De
        </label>
        <input
          id="filtro-data-inicio"
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-data-fim">
          Até
        </label>
        <input
          id="filtro-data-fim"
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-azul text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-azul-escuro cursor-pointer"
        >
          🔍 Buscar
        </button>
        <button
          type="button"
          onClick={limpar}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 cursor-pointer"
        >
          Limpar
        </button>
      </div>
      </div>
    </form>
  );
}
