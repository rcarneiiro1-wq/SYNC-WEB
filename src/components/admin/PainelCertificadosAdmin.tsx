"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search, AlertTriangle } from "lucide-react";
import type { CertificadoAdmin } from "@/lib/admin";
import { excluirCertificado, buscarCertificadosParaAdmin, apagarTudoCertificados } from "@/lib/adminActions";
import { formatarDataBr } from "@/lib/embarques";

const PALAVRA_CONFIRMACAO = "APAGAR TUDO";

function BotaoApagarTudo() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  const apagar = async () => {
    setErro(null);
    setApagando(true);
    const resultado = await apagarTudoCertificados();
    setApagando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    setAberto(false);
    setDigitado("");
    setFeito(true);
    router.refresh();
  };

  if (!aberto) {
    return (
      <div className="border border-vermelho/30 bg-vermelho/5 rounded-lg p-4 mb-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-vermelho shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">Apagar tudo de Certificados (pra reimportar)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Apaga TODOS os colaboradores, tipos, certificados lançados e numeração NR/PE da nuvem - use antes de
              reimportar planilhas atualizadas da Angélica. Não mexe no histórico de auditoria.
            </p>
            {feito && <p className="text-xs text-verde font-semibold mt-1">✔ Apagado - pronto pra reimportar.</p>}
          </div>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-vermelho border border-vermelho/40 rounded-md px-3 py-1.5 hover:bg-vermelho/10 transition-colors cursor-pointer"
          >
            <Trash2 size={13} /> Apagar tudo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-vermelho/40 bg-vermelho/5 rounded-lg p-4 mb-5 space-y-2">
      <p className="text-sm font-semibold text-vermelho">
        Isso apaga TODOS os certificados, colaboradores, tipos e numeração NR/PE da nuvem - não tem como desfazer.
      </p>
      <p className="text-xs text-gray-600">
        O banco local do desktop de cada instalação não é afetado - se alguém sincronizar o desktop antes do
        reimport novo estar pronto, os dados antigos voltam. Melhor reimportar logo em seguida.
      </p>
      {erro && <p className="text-sm text-vermelho">{erro}</p>}
      <p className="text-xs text-gray-500">
        Digite <strong>{PALAVRA_CONFIRMACAO}</strong> pra confirmar:
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={digitado}
          onChange={(ev) => setDigitado(ev.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-vermelho focus:ring-2 focus:ring-vermelho/20"
        />
        <button
          type="button"
          onClick={apagar}
          disabled={digitado !== PALAVRA_CONFIRMACAO || apagando}
          className="bg-vermelho text-white text-xs font-semibold px-3 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {apagando ? "Apagando..." : "Confirmar e apagar tudo"}
        </button>
        <button
          type="button"
          onClick={() => { setAberto(false); setDigitado(""); setErro(null); }}
          className="text-xs font-semibold text-gray-500 hover:text-navy cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

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
      <BotaoApagarTudo />
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
