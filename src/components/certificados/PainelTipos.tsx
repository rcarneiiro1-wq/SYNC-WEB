"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import type { TipoCertificado } from "@/lib/certificados";
import { salvarTipoCertificado } from "@/lib/certificadosActions";

function FormularioTipo({
  tipo,
  aoCancelar,
  aoSalvar,
}: {
  tipo: TipoCertificado | null;
  aoCancelar: () => void;
  aoSalvar: () => void;
}) {
  const [nome, setNome] = useState(tipo?.nome || "");
  const [cargaHoraria, setCargaHoraria] = useState(tipo?.cargaHoraria || "");
  const [validadeAnos, setValidadeAnos] = useState(tipo?.validadeAnos != null ? String(tipo.validadeAnos) : "");
  const [categoria, setCategoria] = useState(tipo?.categoria || "");
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
    const resultado = await salvarTipoCertificado(
      {
        nome: nome.trim(),
        cargaHoraria: cargaHoraria || null,
        validadeAnos: validadeAnos ? Number(validadeAnos.replace(",", ".")) : null,
        categoria: categoria || null,
      },
      tipo?.id || null
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
          <label className="block text-xs font-semibold text-gray-500 mb-1">Nome (ex: NR 35 - Trabalho em Altura) *</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(ev) => setNome(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Carga horária (ex: 8h)</label>
          <input
            type="text"
            value={cargaHoraria}
            onChange={(ev) => setCargaHoraria(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Validade (anos - deixe em branco se não tiver)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex: 1, 2 ou 5"
            value={validadeAnos}
            onChange={(ev) => setValidadeAnos(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria (a &quot;planilha&quot; de origem - ex: NR, CFT, ASO)</label>
          <input
            type="text"
            value={categoria}
            onChange={(ev) => setCategoria(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
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

export function PainelTipos({ tiposIniciais }: { tiposIniciais: TipoCertificado[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? tiposIniciais.filter((t) => t.nome.toLowerCase().includes(termo) || (t.categoria || "").toLowerCase().includes(termo))
    : tiposIniciais;

  const fechar = () => {
    setCriando(false);
    setEditandoId(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mt-6 mb-4">
        <input
          type="text"
          value={busca}
          onChange={(ev) => setBusca(ev.target.value)}
          placeholder="🔍 Pesquisar por nome ou categoria..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
        />
        {!criando && (
          <button
            type="button"
            onClick={() => { setCriando(true); setEditandoId(null); }}
            className="inline-flex items-center gap-1.5 bg-azul text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-azul/90 transition-colors"
          >
            <Plus size={15} /> Novo tipo
          </button>
        )}
      </div>

      {criando && <FormularioTipo tipo={null} aoCancelar={() => setCriando(false)} aoSalvar={fechar} />}

      <p className="text-xs text-gray-400 mb-2">{filtrados.length} tipo(s)</p>

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">Categoria</th>
              <th className="px-3 py-2 font-semibold">Carga horária</th>
              <th className="px-3 py-2 font-semibold">Validade</th>
              <th className="px-3 py-2 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">Nenhum tipo encontrado.</td>
              </tr>
            )}
            {filtrados.map((t) =>
              editandoId === t.id ? (
                <tr key={t.id}>
                  <td colSpan={5} className="px-3 py-3">
                    <FormularioTipo tipo={t} aoCancelar={() => setEditandoId(null)} aoSalvar={fechar} />
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-navy">{t.nome}</td>
                  <td className="px-3 py-2 text-gray-600">{t.categoria || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{t.cargaHoraria || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{t.validadeAnos ? `${t.validadeAnos} ano(s)` : "sem vencimento fixo"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => { setEditandoId(t.id); setCriando(false); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-azul hover:underline cursor-pointer"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {(criando || editandoId) && (
        <button
          type="button"
          onClick={() => { setCriando(false); setEditandoId(null); }}
          className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={13} /> fechar formulário sem salvar
        </button>
      )}
    </div>
  );
}
