"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw, Pencil, ChevronDown, ChevronUp, Search, Filter, Plus } from "lucide-react";
import { diasParaVencimento, type CertificadoLista, type CertificadoLixeira, type StatusCertificado } from "@/lib/certificados";
import { excluirCertificado, excluirCertificadoDefinitivo, restaurarCertificado } from "@/lib/certificadosActions";
import { Paginacao } from "@/components/Paginacao";

// Rótulo exibido pro usuário (03/09: reformulação visual do painel) -
// puramente de exibição, o VALOR de verdade guardado/comparado em todo
// o resto do código continua sendo VÁLIDO/A VENCER/EM ATRASO/SEM DATA
// (o que `calcularStatus()` em lib/certificados.ts devolve). Não mudou
// nem uma vírgula na regra de cálculo do status, só o texto do badge.
const RETULO_STATUS: Record<StatusCertificado, string> = {
  "VÁLIDO": "EM DIA",
  "A VENCER": "EM ATENÇÃO",
  "EM ATRASO": "VENCIDO",
  "SEM DATA": "SEM DATA",
};

const CORES_BADGE: Record<StatusCertificado, string> = {
  "VÁLIDO": "bg-verde/15 text-verde",
  "A VENCER": "bg-amarelo/15 text-amarelo",
  "EM ATRASO": "bg-vermelho/15 text-vermelho",
  "SEM DATA": "bg-gray-100 text-gray-500",
};

// Fundo de linha bem clarinho conforme o status (pedido do Rafael:
// "elegante e discreto", nunca cor forte/saturada) - o hover escurece
// um pouco só pra dar feedback de "isso é clicável/passível de ação".
const CORES_LINHA: Record<StatusCertificado, string> = {
  "VÁLIDO": "bg-verde/5 hover:bg-verde/10",
  "A VENCER": "bg-amarelo/5 hover:bg-amarelo/10",
  "EM ATRASO": "bg-vermelho/5 hover:bg-vermelho/10",
  "SEM DATA": "hover:bg-gray-50",
};

// mesma cor do status aplicada no texto de "dias para vencer" - é a
// mesma informação vista de outro ângulo, então usa a mesma linguagem
// visual (pedido explícito do mockup).
const CORES_TEXTO_STATUS: Record<StatusCertificado, string> = {
  "VÁLIDO": "text-verde",
  "A VENCER": "text-amarelo",
  "EM ATRASO": "text-vermelho",
  "SEM DATA": "text-gray-400",
};

function Pilula({ status }: { status: StatusCertificado }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${CORES_BADGE[status]}`}>
      {RETULO_STATUS[status]}
    </span>
  );
}

/** "+120 dias" / "-25 dias" / "—" (sem data de vencimento cadastrada) -
 * só formata o número que `diasParaVencimento()` (lib/certificados.ts)
 * já calcula; nenhuma conta nova aqui. */
function formatarDias(dias: number | null): string {
  if (dias === null) return "—";
  const sinal = dias >= 0 ? "+" : "";
  return `${sinal}${dias} dia${Math.abs(dias) === 1 ? "" : "s"}`;
}

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function PainelVencimentos({
  certificadosIniciais,
  lixeiraInicial,
  categorias,
  empresas,
}: {
  certificadosIniciais: CertificadoLista[];
  lixeiraInicial: CertificadoLixeira[];
  categorias: string[];
  empresas: string[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroRegime, setFiltroRegime] = useState("");
  const [ordemDecrescente, setOrdemDecrescente] = useState(false);
  const [mostrarLixeira, setMostrarLixeira] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const termo = busca.trim().toLowerCase();
  const filtrados = useMemo(() => {
    let lista = certificadosIniciais;
    if (termo) lista = lista.filter((c) => c.colaboradorNome.toLowerCase().includes(termo));
    if (filtroEmpresa) lista = lista.filter((c) => c.empresa === filtroEmpresa || c.colaboradorEmpresa === filtroEmpresa);
    if (filtroCategoria) lista = lista.filter((c) => c.categoria === filtroCategoria);
    if (filtroRegime) lista = lista.filter((c) => (c.colaboradorLocal || "").toUpperCase() === filtroRegime);
    const comData = lista.filter((c) => c.dataVencimento);
    const semData = lista.filter((c) => !c.dataVencimento);
    comData.sort((a, b) => {
      const [da, ma, aa] = (a.dataVencimento as string).split("/").map(Number);
      const [db, mb, ab] = (b.dataVencimento as string).split("/").map(Number);
      const diff = new Date(aa, ma - 1, da).getTime() - new Date(ab, mb - 1, db).getTime();
      return ordemDecrescente ? -diff : diff;
    });
    return [...comData, ...semData];
  }, [certificadosIniciais, termo, filtroEmpresa, filtroCategoria, filtroRegime, ordemDecrescente]);

  // sempre que o filtro/busca muda o total de resultados, volta pra
  // página 1 - senão a pessoa pode ficar "presa" numa página que não
  // existe mais depois de filtrar
  const chaveFiltro = `${termo}|${filtroEmpresa}|${filtroCategoria}|${filtroRegime}`;
  const [chaveFiltroAnterior, setChaveFiltroAnterior] = useState(chaveFiltro);
  if (chaveFiltro !== chaveFiltroAnterior) {
    setChaveFiltroAnterior(chaveFiltro);
    setPagina(1);
  }

  const paginados = useMemo(
    () => filtrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina),
    [filtrados, pagina, itensPorPagina]
  );

  const limparFiltros = () => {
    setBusca("");
    setFiltroEmpresa("");
    setFiltroCategoria("");
    setFiltroRegime("");
  };

  const excluir = async (c: CertificadoLista) => {
    if (!window.confirm(`Excluir o certificado de ${c.colaboradorNome} — ${c.tipoNome}?\nDá pra recuperar na Lixeira por 15 dias.`)) return;
    setErro(null);
    setProcessando(c.id);
    const resultado = await excluirCertificado(c.id);
    setProcessando(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  const restaurar = async (id: string) => {
    setErro(null);
    setProcessando(id);
    const resultado = await restaurarCertificado(id);
    setProcessando(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  const excluirDeVez = async (c: CertificadoLixeira) => {
    if (!window.confirm(`Excluir DE VEZ o certificado de ${c.colaboradorNome} — ${c.tipoNome}?\nNão tem como desfazer.`)) return;
    setErro(null);
    setProcessando(c.id);
    const resultado = await excluirCertificadoDefinitivo(c.id);
    setProcessando(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6 mt-6 mb-5">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-wide">
          <Filter size={13} /> Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Colaborador</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(ev) => setBusca(ev.target.value)}
                placeholder="Buscar por nome..."
                className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Empresa</label>
            <select
              value={filtroEmpresa}
              onChange={(ev) => setFiltroEmpresa(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
            >
              <option value="">(todas)</option>
              {empresas.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Categoria (planilha)</label>
            <select
              value={filtroCategoria}
              onChange={(ev) => setFiltroCategoria(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
            >
              <option value="">(todas)</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Regime</label>
            <select
              value={filtroRegime}
              onChange={(ev) => setFiltroRegime(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
            >
              <option value="">(todos)</option>
              <option value="ONSHORE">Onshore</option>
              <option value="OFFSHORE">Offshore</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={limparFiltros}
            className="text-xs font-semibold text-gray-500 hover:text-navy px-2 py-2 cursor-pointer"
          >
            Limpar filtros
          </button>
          <Link
            href="/certificados/lancar"
            className="inline-flex items-center gap-1.5 bg-azul text-white text-sm font-semibold px-4 py-2.5 rounded-md hover:bg-azul/90 transition-colors shadow-sm"
          >
            <Plus size={15} /> Lançar certificado
          </Link>
        </div>
      </div>

      {erro && <p className="text-sm text-vermelho mb-3">{erro}</p>}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200">
          <p className="text-sm font-semibold text-navy">Certificados e treinamentos</p>
          <p className="text-xs text-gray-400">{filtrados.length} certificado(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Colaborador</th>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">Tipo de certificado</th>
                <th className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => setOrdemDecrescente((v) => !v)}
                    className="flex items-center gap-1 cursor-pointer hover:text-navy"
                  >
                    Vencimento {ordemDecrescente ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">Dias para vencer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">Nenhum certificado encontrado.</td>
                </tr>
              )}
              {paginados.map((c) => {
                const dias = diasParaVencimento(c.dataVencimento);
                return (
                  <tr key={c.id} className={`transition-colors ${CORES_LINHA[c.status]}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-azul/15 text-azul flex items-center justify-center text-[11px] font-bold shrink-0">
                          {iniciaisDoNome(c.colaboradorNome)}
                        </div>
                        <span className="font-medium text-navy">{c.colaboradorNome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.empresa || c.colaboradorEmpresa || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">{c.tipoNome}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.dataVencimento || "-"}</td>
                    <td className={`px-4 py-3 font-semibold tabular-nums whitespace-nowrap ${CORES_TEXTO_STATUS[c.status]}`}>
                      {formatarDias(dias)}
                    </td>
                    <td className="px-4 py-3"><Pilula status={c.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/certificados/lancar?id=${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-azul hover:bg-azul/10 rounded-md px-2 py-1.5 transition-colors"
                        >
                          <Pencil size={13} /> Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => excluir(c)}
                          disabled={processando === c.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:bg-vermelho/10 rounded-md px-2 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} /> {processando === c.id ? "..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100">
          <Paginacao
            total={filtrados.length}
            pagina={pagina}
            itensPorPagina={itensPorPagina}
            aoMudarPagina={setPagina}
            aoMudarItensPorPagina={(n) => { setItensPorPagina(n); setPagina(1); }}
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setMostrarLixeira((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-navy cursor-pointer"
        >
          {mostrarLixeira ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          🗑️ Lixeira {lixeiraInicial.length > 0 ? `(${lixeiraInicial.length})` : ""}
        </button>

        {mostrarLixeira && (
          <div className="mt-3 overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold">Tipo de certificado</th>
                  <th className="px-4 py-3 font-semibold">Excluído em</th>
                  <th className="px-4 py-3 font-semibold">Some em</th>
                  <th className="px-4 py-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lixeiraInicial.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">Lixeira vazia.</td>
                  </tr>
                )}
                {lixeiraInicial.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-navy">{c.colaboradorNome}</td>
                    <td className="px-4 py-3 text-gray-600">{c.tipoNome}</td>
                    <td className="px-4 py-3 text-gray-600">{c.excluidoEm || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.diasRestantes > 0 ? `${c.diasRestantes} dia(s)` : "a qualquer momento"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => restaurar(c.id)}
                          disabled={processando === c.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-azul hover:bg-azul/10 rounded-md px-2 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw size={13} /> Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirDeVez(c)}
                          disabled={processando === c.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:bg-vermelho/10 rounded-md px-2 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} /> Excluir de vez
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
