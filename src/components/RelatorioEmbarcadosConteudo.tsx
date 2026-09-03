"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LinhaEmbarque } from "@/lib/embarques";

/** Tela "Relatório de embarcados" - escolhe quem entra no relatório de
 * avanço (todo mundo marcado por padrão, igual o desktop) e manda pra
 * página de relatório/impressão só com os selecionados. */
export function RelatorioEmbarcadosConteudo({ linhas }: { linhas: LinhaEmbarque[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(linhas.map((l) => l.embarque.id))
  );

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarTodos(valor: boolean) {
    setSelecionados(valor ? new Set(linhas.map((l) => l.embarque.id)) : new Set());
  }

  const idsSelecionados = useMemo(() => Array.from(selecionados).join(","), [selecionados]);

  if (linhas.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
        Ninguém embarcado no momento.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex gap-4">
          <button type="button" onClick={() => marcarTodos(true)} className="text-xs font-bold text-azul hover:underline cursor-pointer">
            ☑ Selecionar todos
          </button>
          <button type="button" onClick={() => marcarTodos(false)} className="text-xs font-bold text-azul hover:underline cursor-pointer">
            ☐ Desmarcar todos
          </button>
        </div>
        <p className="text-xs font-semibold text-gray-500">
          {selecionados.size} de {linhas.length} selecionado{linhas.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wide">
              <th className="px-4 py-2 text-left w-8"></th>
              <th className="px-4 py-2 text-left">Colaborador</th>
              <th className="px-4 py-2 text-left">Função</th>
              <th className="px-4 py-2 text-left">Obra / Plataforma</th>
              <th className="px-4 py-2 text-left">Empresa</th>
              <th className="px-4 py-2 text-left">%</th>
              <th className="px-4 py-2 text-left">Dias a bordo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {linhas.map((linha) => {
              const { embarque, obra, percentual, diasEmbarcado } = linha;
              const marcado = selecionados.has(embarque.id);
              return (
                <tr key={embarque.id} className={marcado ? "" : "opacity-50"}>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(embarque.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-navy">{embarque.efetivo_nome || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{embarque.efetivo_funcao || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{obra?.nome || embarque.obra_nome || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{obra?.empresa || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{percentual !== null ? `${percentual}%` : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {diasEmbarcado !== null ? `${diasEmbarcado} dia(s)` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        {selecionados.size === 0 ? (
          <span className="text-xs text-gray-400">Marca pelo menos uma pessoa pra gerar o relatório.</span>
        ) : (
          <Link
            href={`/relatorios/avanco?ids=${idsSelecionados}`}
            target="_blank"
            className="inline-flex items-center gap-2 bg-azul-escuro hover:bg-navy text-white text-sm font-bold px-4 py-2 rounded-md transition-colors"
          >
            🖨️ Gerar relatório PDF com os selecionados
          </Link>
        )}
      </div>
    </div>
  );
}
