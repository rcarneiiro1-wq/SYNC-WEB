"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SeletorEmpresas } from "@/components/SeletorEmpresas";

type ValoresFiltro = {
  busca: string;
  empresas: string[];
  mesDe: string; // "AAAA-MM" ou "" (qualquer mês)
  mesAte: string;
};

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** 27/11 (pedido do Rafael): lista de meses pra ESCOLHER no "De"/"Até" em
 * vez de digitar a data (ele achou mais fácil pro pessoal leigo clicar na
 * seta do que preencher dd/mm/aaaa). Cobre os últimos 24 meses até o mês
 * atual - como é calculado a partir de "hoje" (não é uma lista fixa), vai
 * sempre acompanhar o calendário sozinho conforme a empresa for crescendo
 * e acumulando mais histórico, sem precisar mexer nisso de novo. */
function gerarOpcoesMes(): { valor: string; rotulo: string }[] {
  const opcoes: { valor: string; rotulo: string }[] = [];
  const hoje = new Date();
  for (let i = 23; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1;
    const valor = `${ano}-${String(mes).padStart(2, "0")}`;
    opcoes.push({ valor, rotulo: `${NOMES_MES[mes - 1]} de ${ano}` });
  }
  return opcoes;
}

/** "AAAA-MM" -> "AAAA-MM-DD" do ÚLTIMO dia daquele mês (dia 0 do mês
 * seguinte, truque clássico do `Date` do JS) - é o que o filtro "Até"
 * (data_fim <= isso) precisa pra cobrir o mês inteiro escolhido. */
function ultimoDiaDoMes(mesValor: string): string {
  const [ano, mes] = mesValor.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return `${mesValor}-${String(ultimoDia).padStart(2, "0")}`;
}

export function FiltroHistorico({
  sugestoes,
  empresasCadastradas,
  valoresIniciais,
}: {
  sugestoes: string[];
  empresasCadastradas: string[];
  valoresIniciais: ValoresFiltro;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(valoresIniciais.busca);
  const [empresas, setEmpresas] = useState<Set<string>>(new Set(valoresIniciais.empresas));
  const [mesDe, setMesDe] = useState(valoresIniciais.mesDe);
  const [mesAte, setMesAte] = useState(valoresIniciais.mesAte);
  const opcoesMes = useMemo(() => gerarOpcoesMes(), []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    for (const empresa of empresas) params.append("empresa", empresa);
    if (mesDe) params.set("dataInicio", `${mesDe}-01`);
    if (mesAte) params.set("dataFim", ultimoDiaDoMes(mesAte));
    const querystring = params.toString();
    router.push(`/historico${querystring ? `?${querystring}` : ""}`);
  }

  function limpar() {
    setBusca("");
    setEmpresas(new Set());
    setMesDe("");
    setMesAte("");
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
          <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-busca">
            Buscar (nome, plataforma, código, MD ou GM)
          </label>
          <div className="relative w-72">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              id="filtro-busca"
              list="lista-sugestoes-historico"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: Eduardo, MV-33, GM..."
              className="border border-gray-300 rounded-md pl-7 pr-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-azul"
            />
          </div>
          <datalist id="lista-sugestoes-historico">
            {sugestoes.map((texto) => (
              <option key={texto} value={texto} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-mes-de">
            De
          </label>
          <select
            id="filtro-mes-de"
            value={mesDe}
            onChange={(e) => setMesDe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
          >
            <option value="">Qualquer mês</option>
            {opcoesMes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-mes-ate">
            Até
          </label>
          <select
            id="filtro-mes-ate"
            value={mesAte}
            onChange={(e) => setMesAte(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
          >
            <option value="">Qualquer mês</option>
            {opcoesMes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
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
