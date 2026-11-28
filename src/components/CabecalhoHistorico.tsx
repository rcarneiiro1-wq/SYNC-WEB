"use client";

import { Ship, Download } from "lucide-react";
import { formatarDataBr, type LinhaHistorico } from "@/lib/embarques";

/** Mesmo texto que já aparece no badge de "Status" da tabela (ver
 * `TabelaHistorico.tsx`) - duplicado aqui de propósito (função pequena,
 * import cruzado não compensa) só pra virar texto puro no CSV. */
function rotuloStatus(linha: LinhaHistorico): string {
  if (linha.embarque.status_final === "com_pendencia") return "Encerrado com pendência";
  if (linha.embarque.status_final === "completo") return "Completo";
  if (linha.pendentes > 0) return `${linha.pendentes} dia(s) sem RDO`;
  return "Em dia";
}

/** `;` como separador (não `,`) - é o que o Excel em PT-BR espera por
 * padrão; com vírgula ele não quebra em colunas sozinho. */
function gerarCsv(linhas: LinhaHistorico[]): string {
  const cabecalho = [
    "Colaborador", "Função", "Empresa", "Plataforma", "Início", "Fim",
    "Duração (dias)", "RDOs lançados", "Status", "Conclusão (%)",
  ];
  const corpo = linhas.map((l) => [
    l.embarque.efetivo_nome || "-",
    l.embarque.efetivo_funcao || "-",
    l.obra?.empresa || "-",
    l.obra?.nome || l.embarque.obra_nome || "-",
    formatarDataBr(l.inicioReal),
    formatarDataBr(l.fimReal),
    l.dias ?? "-",
    l.totalRdos,
    rotuloStatus(l),
    l.percentualFinal ?? "-",
  ]);
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [cabecalho, ...corpo].map((linha) => linha.map(escapar).join(";")).join("\r\n");
}

/** Cabeçalho da tela de Histórico - ícone + título + subtítulo + botão de
 * exportar. Recebe `linhas` (já filtradas/buscadas, igual a tabela abaixo
 * recebe) só pra poder gerar o .csv - não faz nenhuma busca própria, não
 * duplica consulta nenhuma. */
export function CabecalhoHistorico({ linhas }: { linhas: LinhaHistorico[] }) {
  const exportar = () => {
    // BOM no início (﻿) - sem isso o Excel abre acentuação (é, ã, ç)
    // toda errada num .csv UTF-8, mesmo o conteúdo estando certo.
    const csv = "﻿" + gerarCsv(linhas);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-embarques-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
          <Ship size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-navy leading-tight">Histórico de embarques finalizados</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Consulte embarques concluídos, RDOs e relatórios por colaborador, empresa e período.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={exportar}
        disabled={linhas.length === 0}
        title={linhas.length === 0 ? "Nenhum embarque pra exportar com esse filtro" : "Baixar os embarques desse filtro em .csv"}
        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm font-medium px-3.5 py-2 rounded-md hover:border-azul hover:text-azul transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-600 whitespace-nowrap"
      >
        <Download size={14} /> Exportar relatório
      </button>
    </div>
  );
}
