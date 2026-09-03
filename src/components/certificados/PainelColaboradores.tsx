"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X, GitMerge, History, Search } from "lucide-react";
import type { Colaborador, HistoricoCertificado } from "@/lib/certificados";
import { buscarHistoricoColaborador } from "@/lib/certificados";
import { mesclarColaboradores, salvarColaborador } from "@/lib/certificadosActions";
import { Paginacao } from "@/components/Paginacao";

function FormularioColaborador({
  colaborador,
  aoCancelar,
  aoSalvar,
}: {
  colaborador: Colaborador | null;
  aoCancelar: () => void;
  aoSalvar: () => void;
}) {
  const [nome, setNome] = useState(colaborador?.nome || "");
  const [cpf, setCpf] = useState(colaborador?.cpf || "");
  const [empresa, setEmpresa] = useState(colaborador?.empresa || "");
  const [localTrabalho, setLocalTrabalho] = useState(colaborador?.localTrabalho || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await salvarColaborador(
      { nome: nome.trim(), cpf: cpf || null, empresa: empresa || null, localTrabalho: localTrabalho || null },
      colaborador?.id || null
    );
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    aoSalvar();
  };

  return (
    <form onSubmit={salvar} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
      {erro && <p className="text-sm text-vermelho">{erro}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Nome *</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(ev) => setNome(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">CPF</label>
          <input
            type="text"
            value={cpf}
            onChange={(ev) => setCpf(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Empresa</label>
          <input
            type="text"
            value={empresa}
            onChange={(ev) => setEmpresa(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Regime</label>
          <select
            value={localTrabalho}
            onChange={(ev) => setLocalTrabalho(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
          >
            <option value="">(não definido)</option>
            <option value="ONSHORE">Onshore</option>
            <option value="OFFSHORE">Offshore</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="bg-azul text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-azul/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={aoCancelar} className="text-sm font-semibold text-gray-500 hover:text-navy cursor-pointer">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function LinhaMesclar({
  colaborador,
  outros,
  aoCancelar,
  aoConcluir,
}: {
  colaborador: Colaborador;
  outros: Colaborador[];
  aoCancelar: () => void;
  aoConcluir: () => void;
}) {
  const [duplicadoId, setDuplicadoId] = useState("");
  const [mesclando, setMesclando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mesclar = async () => {
    if (!duplicadoId) {
      setErro("Escolha o cadastro duplicado.");
      return;
    }
    const duplicado = outros.find((o) => o.id === duplicadoId);
    if (!window.confirm(
      `Mesclar "${duplicado?.nome}" dentro de "${colaborador.nome}"?\n\nOs certificados e a numeração do duplicado passam pra ${colaborador.nome}, e o cadastro "${duplicado?.nome}" fica arquivado (inativo). Não tem como desfazer.`
    )) return;
    setErro(null);
    setMesclando(true);
    const resultado = await mesclarColaboradores(colaborador.id, duplicadoId);
    setMesclando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    aoConcluir();
  };

  return (
    <div className="bg-amarelo/5 border border-amarelo/30 rounded-lg p-4 space-y-2">
      {erro && <p className="text-sm text-vermelho">{erro}</p>}
      <p className="text-sm text-gray-600">
        Mesclar um cadastro duplicado <strong>dentro de {colaborador.nome}</strong> - escolha qual é o duplicado (ele vai ficar arquivado, e os certificados dele passam pra cá):
      </p>
      <div className="flex items-center gap-3">
        <select
          value={duplicadoId}
          onChange={(ev) => setDuplicadoId(ev.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
        >
          <option value="">Selecione o cadastro duplicado...</option>
          {outros.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}{o.empresa ? ` (${o.empresa})` : ""}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={mesclar}
          disabled={mesclando}
          className="bg-amarelo text-white text-sm font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          {mesclando ? "Mesclando..." : "Confirmar mesclagem"}
        </button>
        <button type="button" onClick={aoCancelar} className="text-sm font-semibold text-gray-500 hover:text-navy cursor-pointer">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ModalHistorico({ colaborador, aoFechar }: { colaborador: Colaborador; aoFechar: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<HistoricoCertificado[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    buscarHistoricoColaborador(colaborador.id)
      .then((r) => { if (!cancelado) setItens(r); })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : "Não consegui buscar o histórico."); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [colaborador.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={aoFechar}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-navy text-lg">Histórico — {colaborador.nome}</h2>
            <p className="text-xs text-gray-500">{colaborador.empresa || "s/ empresa"} — {colaborador.localTrabalho || "s/ local definido"}</p>
          </div>
          <button type="button" onClick={aoFechar} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {carregando && <p className="text-sm text-gray-400">Carregando...</p>}
        {erro && <p className="text-sm text-vermelho">{erro}</p>}
        {!carregando && !erro && itens.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum certificado lançado ainda pra essa pessoa.</p>
        )}
        {!carregando && itens.length > 0 && (
          <div className="space-y-2">
            {itens.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <p className="text-sm font-medium text-navy">{c.tipoNome}</p>
                  <p className="text-xs text-gray-500">
                    Emissão: {c.dataEmissao || "-"} · Vencimento: {c.dataVencimento || "-"}
                    {c.numero ? ` · Nº ${c.numero}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                    c.excluido ? "bg-gray-100 text-gray-500" : "bg-verde/10 text-verde"
                  }`}
                >
                  {c.excluido ? "EXCLUÍDO" : c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PainelColaboradores({ colaboradoresIniciais }: { colaboradoresIniciais: Colaborador[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mesclandoId, setMesclandoId] = useState<string | null>(null);
  const [historicoDe, setHistoricoDe] = useState<Colaborador | null>(null);
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const termo = busca.trim().toLowerCase();
  const filtrados = termo ? colaboradoresIniciais.filter((c) => c.nome.toLowerCase().includes(termo)) : colaboradoresIniciais;

  // volta pra página 1 quando a busca muda, senão a pessoa pode ficar
  // "presa" numa página que não existe mais depois de filtrar
  const [termoAnterior, setTermoAnterior] = useState(termo);
  if (termo !== termoAnterior) {
    setTermoAnterior(termo);
    setPagina(1);
  }

  const paginados = useMemo(
    () => filtrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina),
    [filtrados, pagina, itensPorPagina]
  );

  const fechar = () => {
    setCriando(false);
    setEditandoId(null);
    setMesclandoId(null);
    router.refresh();
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mt-6 mb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(ev) => setBusca(ev.target.value)}
              placeholder="Pesquisar por nome..."
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>
          {!criando && (
            <button
              type="button"
              onClick={() => { setCriando(true); setEditandoId(null); setMesclandoId(null); }}
              className="inline-flex items-center gap-1.5 bg-azul text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-azul/90 transition-colors whitespace-nowrap"
            >
              <Plus size={15} /> Novo colaborador
            </button>
          )}
        </div>

        {criando && (
          <div className="mt-4">
            <FormularioColaborador colaborador={null} aoCancelar={() => setCriando(false)} aoSalvar={fechar} />
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-navy">Colaboradores cadastrados</p>
          <p className="text-xs text-gray-400">{filtrados.length} colaborador(es)</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">CPF</th>
              <th className="px-3 py-2 font-semibold">Empresa</th>
              <th className="px-3 py-2 font-semibold">Regime</th>
              <th className="px-3 py-2 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">Nenhum colaborador encontrado.</td>
              </tr>
            )}
            {paginados.map((c) => (
              <Fragment key={c.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-navy">{c.nome}</td>
                  <td className="px-3 py-2 text-gray-600">{c.cpf || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{c.empresa || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{c.localTrabalho || "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setHistoricoDe(c)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-navy cursor-pointer"
                      >
                        <History size={13} /> Histórico
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMesclandoId(mesclandoId === c.id ? null : c.id); setCriando(false); setEditandoId(null); }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amarelo hover:underline cursor-pointer"
                      >
                        <GitMerge size={13} /> Mesclar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditandoId(c.id); setCriando(false); setMesclandoId(null); }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-azul hover:underline cursor-pointer"
                      >
                        <Pencil size={13} /> Editar
                      </button>
                    </div>
                  </td>
                </tr>
                {editandoId === c.id && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3">
                      <FormularioColaborador colaborador={c} aoCancelar={() => setEditandoId(null)} aoSalvar={fechar} />
                    </td>
                  </tr>
                )}
                {mesclandoId === c.id && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3">
                      <LinhaMesclar
                        colaborador={c}
                        outros={colaboradoresIniciais.filter((o) => o.id !== c.id)}
                        aoCancelar={() => setMesclandoId(null)}
                        aoConcluir={fechar}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
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

      {historicoDe && <ModalHistorico colaborador={historicoDe} aoFechar={() => setHistoricoDe(null)} />}
    </div>
  );
}
