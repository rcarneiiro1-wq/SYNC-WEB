"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import type { Colaborador, ItemNumeracao } from "@/lib/certificados";
import { excluirNumeracao, salvarNumeracao } from "@/lib/certificadosActions";

function aplicarMascaraData(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export function PainelNumeracao({
  itensIniciais,
  colaboradores,
  proximoNumeroNr,
  proximoNumeroPe,
}: {
  itensIniciais: ItemNumeracao[];
  colaboradores: Colaborador[];
  proximoNumeroNr: string;
  proximoNumeroPe: string;
}) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<"NR" | "PE">("NR");
  const [descricao, setDescricao] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [validade, setValidade] = useState("1 ano");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const proximoNumero = categoria === "NR" ? proximoNumeroNr : proximoNumeroPe;

  const lancar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!colaboradorId) {
      setErro("Escolha o colaborador.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await salvarNumeracao({
      categoria,
      numero: proximoNumero,
      descricao: descricao || null,
      dataEmissao: dataEmissao || null,
      validade: validade || null,
      colaboradorId,
    });
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    setDescricao("");
    setColaboradorId("");
    setDataEmissao("");
    router.refresh();
  };

  const excluir = async (item: ItemNumeracao) => {
    if (!window.confirm(`Excluir a numeração ${item.categoria} ${item.numero}?`)) return;
    setExcluindoId(item.id);
    const resultado = await excluirNumeracao(item.id);
    setExcluindoId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  };

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? itensIniciais.filter((i) => (i.colaboradorNome || "").toLowerCase().includes(termo) || (i.descricao || "").toLowerCase().includes(termo))
    : itensIniciais;

  return (
    <div>
      <form onSubmit={lancar} className="bg-white border border-gray-200 rounded-xl p-5 mt-6 mb-6 space-y-3">
        {erro && <p className="text-sm text-vermelho">{erro}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(ev) => setCategoria(ev.target.value as "NR" | "PE")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
            >
              <option value="NR">NR</option>
              <option value="PE">PE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Próximo número</label>
            <p className="px-3 py-2 text-sm font-bold text-navy">{proximoNumero}</p>
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição (ex: 34 - TRABALHO A QUENTE)</label>
            <input
              type="text"
              value={descricao}
              onChange={(ev) => setDescricao(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Colaborador *</label>
            <select
              required
              value={colaboradorId}
              onChange={(ev) => setColaboradorId(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
            >
              <option value="">Selecione...</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data de emissão</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              value={dataEmissao}
              onChange={(ev) => setDataEmissao(aplicarMascaraData(ev.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Validade</label>
            <input
              type="text"
              value={validade}
              onChange={(ev) => setValidade(ev.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center gap-1.5 bg-azul text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-azul/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Plus size={15} /> {salvando ? "Lançando..." : `Lançar ${categoria} ${proximoNumero}`}
        </button>
      </form>

      <input
        type="text"
        value={busca}
        onChange={(ev) => setBusca(ev.target.value)}
        placeholder="🔍 Pesquisar por colaborador ou descrição..."
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 mb-3"
      />

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Número</th>
              <th className="px-3 py-2 font-semibold">Descrição</th>
              <th className="px-3 py-2 font-semibold">Colaborador</th>
              <th className="px-3 py-2 font-semibold">Emissão</th>
              <th className="px-3 py-2 font-semibold">Validade</th>
              <th className="px-3 py-2 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">Nenhum item encontrado.</td>
              </tr>
            )}
            {filtrados.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-navy">{i.categoria} {i.numero}</td>
                <td className="px-3 py-2 text-gray-600">{i.descricao || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{i.colaboradorNome || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{i.dataEmissao || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{i.validade || "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => excluir(i)}
                    disabled={excluindoId === i.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} /> {excluindoId === i.id ? "..." : "Excluir"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
