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

/** 27/11 (ajuste depois do Rafael reparar "2 Janeiros" na lista - tinha
 * misturado mês+ano numa lista só de 24 meses, dava pra repetir o mesmo
 * nome de mês duas vezes sem ficar óbvio de qual ano). Agora o mês é uma
 * lista fixa de 12 nomes normais (Janeiro...Dezembro) - o ano vai num
 * segundo "seta" separado, ver `gerarOpcoesAno`. */
const OPCOES_MES = NOMES_MES.map((nome, indice) => ({
  valor: String(indice + 1).padStart(2, "0"),
  rotulo: nome,
}));

/** Lista de anos pro segundo "seta" do De/Até - do ano atual pra trás, 4
 * anos de folga. Calculada a partir de "hoje" (não é fixa), então vai
 * sempre acompanhar o calendário sozinha conforme a empresa for crescendo
 * e acumulando mais histórico, sem precisar mexer nisso de novo. */
function gerarOpcoesAno(): string[] {
  const anoAtual = new Date().getFullYear();
  const anos: string[] = [];
  for (let ano = anoAtual - 4; ano <= anoAtual; ano++) anos.push(String(ano));
  return anos;
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
  // "AAAA-MM" (vindo do servidor, ver historico/page.tsx) vira 2 pedaços
  // separados aqui dentro - um pro select de Mês, outro pro select de Ano.
  const [mesDeMes, setMesDeMes] = useState(valoresIniciais.mesDe.slice(5, 7));
  const [mesDeAno, setMesDeAno] = useState(valoresIniciais.mesDe.slice(0, 4));
  const [mesAteMes, setMesAteMes] = useState(valoresIniciais.mesAte.slice(5, 7));
  const [mesAteAno, setMesAteAno] = useState(valoresIniciais.mesAte.slice(0, 4));
  const opcoesAno = useMemo(() => gerarOpcoesAno(), []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    for (const empresa of empresas) params.append("empresa", empresa);
    // só aplica o limite se mês E ano estiverem escolhidos - só um dos dois
    // sozinho não forma uma data, melhor ignorar do que adivinhar.
    if (mesDeMes && mesDeAno) params.set("dataInicio", `${mesDeAno}-${mesDeMes}-01`);
    if (mesAteMes && mesAteAno) params.set("dataFim", ultimoDiaDoMes(`${mesAteAno}-${mesAteMes}`));
    const querystring = params.toString();
    router.push(`/historico${querystring ? `?${querystring}` : ""}`);
  }

  function limpar() {
    setBusca("");
    setEmpresas(new Set());
    setMesDeMes("");
    setMesDeAno("");
    setMesAteMes("");
    setMesAteAno("");
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
          <div className="flex gap-1.5">
            <select
              id="filtro-mes-de"
              value={mesDeMes}
              onChange={(e) => setMesDeMes(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
            >
              <option value="">Mês</option>
              {OPCOES_MES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <select
              value={mesDeAno}
              onChange={(e) => setMesDeAno(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
            >
              <option value="">Ano</option>
              {opcoesAno.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-mes-ate">
            Até
          </label>
          <div className="flex gap-1.5">
            <select
              id="filtro-mes-ate"
              value={mesAteMes}
              onChange={(e) => setMesAteMes(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
            >
              <option value="">Mês</option>
              {OPCOES_MES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <select
              value={mesAteAno}
              onChange={(e) => setMesAteAno(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
            >
              <option value="">Ano</option>
              {opcoesAno.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
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
