"use client";

import { useState, useTransition } from "react";
import { Trash2, Search } from "lucide-react";
import type { CertificadoAdmin } from "@/lib/admin";
import { excluirCertificado, buscarCertificadosParaAdmin } from "@/lib/adminActions";
import { formatarDataBr } from "@/lib/embarques";

export function PainelCertificadosAdmin() {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<CertificadoAdmin[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarBusca] = useTransition();

  const buscar = (valor: string) => {
    setBusca(valor);
    if (valor.trim().length < 2) {
      setResultados([]);
      setBuscou(false);
      return;
    }
    iniciarBusca(async () => {
      const dados = await buscarCertificadosParaAdmin(valor);
      setResultados(dados);
      setBuscou(true);
    });
  };

  const excluir = async (c: CertificadoAdmin) => {
    const confirmado = window.confirm(
      `Excluir DE VEZ o certificado "${c.tipoNome}" de "${c.colaboradorNome}" (nº ${c.numero || "-"})?\n\n` +
        `Diferente do "excluir" normal do sistema (que só arquiva), esse apaga a linha de vez, sem manter histórico.\n\n` +
        `Não tem como desfazer. Confirma?`
    );
    if (!confirmado) return;
    setErro(null);
    setExcluindoId(c.id);
    const resultado = await excluirCertificado(c.id);
    setExcluindoId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    setResultados((atual) => atual.filter((r) => r.id !== c.id));
  };

  return (
    <div>
      <div className="relative w-full max-w-sm mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={(ev) => buscar(ev.target.value)}
          placeholder="Digite o nome do colaborador (mín. 2 letras)..."
          className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
        />
      </div>

      {erro && <p className="text-sm text-vermelho mb-3">{erro}</p>}

      {busca.trim().length < 2 ? (
        <p className="text-sm text-gray-400">Digite pelo menos 2 letras do nome do colaborador pra buscar.</p>
      ) : pendente ? (
        <p className="text-sm text-gray-400">Buscando...</p>
      ) : buscou && resultados.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum certificado encontrado pra esse nome.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Colaborador</th>
                <th className="px-3 py-2 font-semibold">Empresa</th>
                <th className="px-3 py-2 font-semibold">Certificado</th>
                <th className="px-3 py-2 font-semibold">Número</th>
                <th className="px-3 py-2 font-semibold">Emissão</th>
                <th className="px-3 py-2 font-semibold">Vencimento</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                <th className="px-3 py-2 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resultados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-navy">{c.colaboradorNome}</td>
                  <td className="px-3 py-2 text-gray-600">{c.colaboradorEmpresa || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{c.tipoNome}</td>
                  <td className="px-3 py-2 text-gray-600">{c.numero || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{formatarDataBr(c.dataEmissao)}</td>
                  <td className="px-3 py-2 text-gray-600">{formatarDataBr(c.dataVencimento)}</td>
                  <td className="px-3 py-2">
                    {c.excluido && (
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                        Já arquivado
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => excluir(c)}
                      disabled={excluindoId === c.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-vermelho hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      <Trash2 size={13} />
                      {excluindoId === c.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
