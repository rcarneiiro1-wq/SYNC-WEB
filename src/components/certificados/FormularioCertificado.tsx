"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Colaborador, TipoCertificado, CertificadoLista } from "@/lib/certificados";
import { calcularVencimentoSugerido } from "@/lib/certificados";
import { salvarCertificado } from "@/lib/certificadosActions";

/** Aplica a máscara DD/MM/AAAA enquanto a pessoa digita só números -
 * mesma ideia do `aplicar_mascara_data` do desktop. */
function aplicarMascaraData(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export function FormularioCertificado({
  colaboradores,
  tipos,
  certificadoExistente,
}: {
  colaboradores: Colaborador[];
  tipos: TipoCertificado[];
  certificadoExistente: CertificadoLista | null;
}) {
  const router = useRouter();
  const [colaboradorId, setColaboradorId] = useState(certificadoExistente?.colaboradorId || "");
  const [tipoId, setTipoId] = useState(certificadoExistente?.tipoId || "");
  const [empresa, setEmpresa] = useState(certificadoExistente?.empresa || "");
  const [numero, setNumero] = useState(certificadoExistente?.numero || "");
  const [dataEmissao, setDataEmissao] = useState(certificadoExistente?.dataEmissao || "");
  const [dataVencimento, setDataVencimento] = useState(certificadoExistente?.dataVencimento || "");
  const [vencimentoTocadoManualmente, setVencimentoTocadoManualmente] = useState(Boolean(certificadoExistente?.dataVencimento));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aoMudarEmissao = (valor: string) => {
    const mascarado = aplicarMascaraData(valor);
    setDataEmissao(mascarado);
    if (!vencimentoTocadoManualmente && tipoId) {
      const tipo = tipos.find((t) => t.id === tipoId);
      if (tipo?.validadeAnos && mascarado.length === 10) {
        setDataVencimento(calcularVencimentoSugerido(mascarado, tipo.validadeAnos));
      }
    }
  };

  const aoMudarTipo = (novoTipoId: string) => {
    setTipoId(novoTipoId);
    if (!vencimentoTocadoManualmente && dataEmissao.length === 10) {
      const tipo = tipos.find((t) => t.id === novoTipoId);
      if (tipo?.validadeAnos) {
        setDataVencimento(calcularVencimentoSugerido(dataEmissao, tipo.validadeAnos));
      }
    }
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!colaboradorId || !tipoId) {
      setErro("Escolha o colaborador e o tipo de certificado.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await salvarCertificado(
      {
        colaboradorId,
        tipoId,
        empresa: empresa || null,
        numero: numero || null,
        dataEmissao: dataEmissao || null,
        dataVencimento: dataVencimento || null,
      },
      certificadoExistente?.id || null
    );
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    router.push("/certificados");
    router.refresh();
  };

  return (
    <form onSubmit={salvar} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {erro && <p className="text-sm text-vermelho">{erro}</p>}

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Colaborador *</label>
        <select
          required
          value={colaboradorId}
          onChange={(ev) => setColaboradorId(ev.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
        >
          <option value="">Selecione...</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}{c.empresa ? ` (${c.empresa})` : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de certificado *</label>
        <select
          required
          value={tipoId}
          onChange={(ev) => aoMudarTipo(ev.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20 bg-white"
        >
          <option value="">Selecione...</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>{t.categoria ? `[${t.categoria}] ` : ""}{t.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Empresa (se for diferente da do colaborador)</label>
        <input
          type="text"
          value={empresa}
          onChange={(ev) => setEmpresa(ev.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Número do certificado</label>
        <input
          type="text"
          value={numero}
          onChange={(ev) => setNumero(ev.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Data de emissão</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            value={dataEmissao}
            onChange={(ev) => aoMudarEmissao(ev.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Data de vencimento</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            value={dataVencimento}
            onChange={(ev) => {
              setVencimentoTocadoManualmente(true);
              setDataVencimento(aplicarMascaraData(ev.target.value));
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          />
          <p className="text-[11px] text-gray-400 mt-1">preenchido sozinho pela validade do tipo - pode ajustar</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={salvando}
          className="bg-azul text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-azul/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {salvando ? "Salvando..." : certificadoExistente ? "Salvar alterações" : "Lançar certificado"}
        </button>
      </div>
    </form>
  );
}
