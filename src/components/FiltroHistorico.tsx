"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, ChevronDown } from "lucide-react";
import { corDaEmpresa } from "@/components/SeletorEmpresas";

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

/** Rótulo curto de mês ("Jan", "Fev"...) pro botão de período fechado -
 * não precisa do nome inteiro ali, só o suficiente pra reconhecer. */
function rotuloMesCurto(mesValor: string): string {
  const opcao = OPCOES_MES.find((o) => o.valor === mesValor);
  return opcao ? opcao.rotulo.slice(0, 3) : mesValor;
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
  // 28/11 (redesign visual pedido pelo Rafael): o período inteiro (os 4
  // selects De/Até) agora mora dentro desse popover, fechado por padrão -
  // a barra de filtro principal só mostra 1 botão resumindo a escolha
  // ("Todos os períodos" ou "Nov/2026 → ..."), pra caber tudo numa linha só
  // mesmo quando mais empresas forem cadastradas. O FILTRO em si (os 4
  // selects, o `buscar()`) continua exatamente igual a antes.
  const [periodoAberto, setPeriodoAberto] = useState(false);
  const opcoesAno = useMemo(() => gerarOpcoesAno(), []);

  const rotuloPeriodo = useMemo(() => {
    const de = mesDeMes && mesDeAno ? `${rotuloMesCurto(mesDeMes)}/${mesDeAno}` : null;
    const ate = mesAteMes && mesAteAno ? `${rotuloMesCurto(mesAteMes)}/${mesAteAno}` : null;
    if (!de && !ate) return "Todos os períodos";
    if (de && ate) return de === ate ? de : `${de} → ${ate}`;
    return de || ate || "Todos os períodos";
  }, [mesDeMes, mesDeAno, mesAteMes, mesAteAno]);

  function alternarEmpresa(empresa: string) {
    const novas = new Set(empresas);
    if (novas.has(empresa)) novas.delete(empresa);
    else novas.add(empresa);
    setEmpresas(novas);
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setPeriodoAberto(false);
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
    setPeriodoAberto(false);
    router.push("/historico");
  }

  return (
    <form
      onSubmit={buscar}
      className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-end gap-3"
    >
      {empresasCadastradas.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-medium">Empresa</span>
          {/* 28/11 (pedido do Rafael): voltou a usar a cor própria de cada
           * empresa (mesma função `corDaEmpresa` do SeletorEmpresas/coluna
           * Empresa da tabela - por acaso ela já cai em roxo pra "hydra" e
           * azul pra "infotec", exatamente o que ele queria) - só que num
           * formato de pill mais compacto que o card antigo, pra não devolver
           * aquele espaço horizontal que a gente acabou de cortar na tabela. */}
          <div className="flex flex-wrap gap-1.5">
            {empresasCadastradas.map((empresa) => {
              const ativa = empresas.has(empresa);
              const cor = corDaEmpresa(empresa);
              return (
                <button
                  key={empresa}
                  type="button"
                  onClick={() => alternarEmpresa(empresa)}
                  aria-pressed={ativa}
                  className="px-3.5 py-2 rounded-md text-sm font-bold capitalize cursor-pointer transition-all whitespace-nowrap border-2"
                  style={{
                    backgroundColor: cor.bg,
                    color: cor.fg,
                    borderColor: ativa ? cor.fg : "transparent",
                    opacity: ativa ? 1 : 0.55,
                  }}
                >
                  {empresa}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
        <label className="text-xs text-gray-500 font-medium" htmlFor="filtro-busca">
          Buscar
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="filtro-busca"
            list="lista-sugestoes-historico"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colaborador, plataforma, código, MD ou GM..."
            className="border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-azul"
          />
        </div>
        <datalist id="lista-sugestoes-historico">
          {sugestoes.map((texto) => (
            <option key={texto} value={texto} />
          ))}
        </datalist>
      </div>

      <div className="relative flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">Período</span>
        <button
          type="button"
          onClick={() => setPeriodoAberto((v) => !v)}
          className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:border-azul cursor-pointer whitespace-nowrap"
        >
          <Calendar size={14} className="text-gray-400 shrink-0" />
          {rotuloPeriodo}
          <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${periodoAberto ? "rotate-180" : ""}`} />
        </button>

        {periodoAberto && (
          <div className="absolute z-10 top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col gap-3 w-[300px]">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500 font-medium">De - Mês</label>
                <select
                  value={mesDeMes}
                  onChange={(e) => setMesDeMes(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-azul"
                >
                  <option value="">Mês</option>
                  {OPCOES_MES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs text-gray-500 font-medium">Ano</label>
                <select
                  value={mesDeAno}
                  onChange={(e) => setMesDeAno(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-azul"
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

            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500 font-medium">Até - Mês</label>
                <select
                  value={mesAteMes}
                  onChange={(e) => setMesAteMes(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-azul"
                >
                  <option value="">Mês</option>
                  {OPCOES_MES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs text-gray-500 font-medium">Ano</label>
                <select
                  value={mesAteAno}
                  onChange={(e) => setMesAteAno(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-azul"
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

            <button
              type="button"
              onClick={() => setPeriodoAberto(false)}
              className="self-end text-xs font-semibold text-azul hover:underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          type="submit"
          className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-navy-light transition-colors cursor-pointer whitespace-nowrap"
        >
          <Search size={14} /> Buscar
        </button>
        <button
          type="button"
          onClick={limpar}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 cursor-pointer whitespace-nowrap"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
