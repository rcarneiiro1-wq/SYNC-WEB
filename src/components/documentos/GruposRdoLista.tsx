"use client";

import { Fragment, useState } from "react";
import type { GrupoRdoEmbarque } from "@/lib/documentosPlataformaTipos";
import { urlDownloadArquivo } from "@/lib/download";
import { formatarDataBr } from "@/lib/embarques";

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "-";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Categoria "RDOs" (automática): uma linha por EMBARQUE (não por arquivo -
 * pedido do Rafael em 14/09, pensando no volume que isso vai virar), com
 * "Ver mais" pra abrir a listagem individual dos RDOs daquele embarque.
 *
 * Redesenho de 15/09 (aprovado pelo Rafael a partir do mockup dele): virou
 * uma tabela de verdade (Usuário/Data-Hora/Status/Qtd. RDOs/Ações), com
 * badge de Status - "Em andamento" (azul-claro, exatamente como ele pediu)
 * pra embarque ainda ativo, "Concluído" (verde) pro resto - reaproveitando
 * a MESMA condição que já existia pra montar o texto de `periodo`
 * (`emAndamento`, ver documentosPlataforma.ts). O botão de cabeçalho "Ver
 * todos →" expande/recolhe TODAS as linhas de uma vez (mesmo mecanismo do
 * "Ver mais" por linha) - combinado assim porque a tabela já mostra a
 * lista inteira sem paginação, então "ver todos" aqui significa "abrir
 * tudo de uma vez" em vez de navegar pra uma página separada. */
export function GruposRdoLista({ grupos }: { grupos: GrupoRdoEmbarque[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const alternar = (embarqueId: string) => {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(embarqueId)) novo.delete(embarqueId);
      else novo.add(embarqueId);
      return novo;
    });
  };

  const todosAbertos = grupos.length > 0 && grupos.every((g) => abertos.has(g.embarqueId));
  const alternarTodos = () => {
    setAbertos(todosAbertos ? new Set() : new Set(grupos.map((g) => g.embarqueId)));
  };

  if (grupos.length === 0) {
    return <p className="text-xs text-gray-400 px-4 py-4">Nenhum RDO ainda.</p>;
  }

  return (
    <div>
      <div className="flex justify-end px-4 pt-2.5">
        <button
          type="button"
          onClick={alternarTodos}
          className="text-xs font-semibold text-azul hover:underline cursor-pointer"
        >
          {todosAbertos ? "Recolher todos" : "Ver todos →"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 font-semibold">Usuário</th>
              <th className="px-4 py-2 font-semibold">Data/Hora</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Qtd. RDOs</th>
              <th className="px-4 py-2 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => {
              const aberto = abertos.has(grupo.embarqueId);
              return (
                <Fragment key={grupo.embarqueId}>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-none w-6 h-6 rounded-full bg-azul/10 text-azul-escuro text-[11px] font-bold flex items-center justify-center">
                          {iniciaisDoNome(grupo.colaborador)}
                        </span>
                        <span className="text-gray-700 font-semibold truncate" title={grupo.colaborador}>
                          {grupo.colaborador}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{grupo.periodo}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-azul-escuro bg-azul/10 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-azul" />
                        {grupo.emAndamento ? "Em andamento" : "Concluído"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-azul whitespace-nowrap">
                      {grupo.totalRdos} RDO{grupo.totalRdos === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => alternar(grupo.embarqueId)}
                        className="text-xs font-semibold text-azul hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {aberto ? "Ver menos" : "Ver mais ↗"}
                      </button>
                    </td>
                  </tr>
                  {aberto && (
                    <tr>
                      <td colSpan={5} className="bg-gray-50 px-4 py-2">
                        <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-md bg-white overflow-hidden">
                          {grupo.rdos.map((rdo) => (
                            <div key={rdo.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="flex-1 text-gray-600">RDO #{rdo.numeroRdo}</span>
                              <span className="text-gray-400 whitespace-nowrap">{formatarDataBr(rdo.data)}</span>
                              {rdo.url ? (
                                <a
                                  href={urlDownloadArquivo(rdo.url, `RDO_${String(rdo.numeroRdo).padStart(3, "0")}.pdf`)}
                                  className="text-azul font-semibold hover:underline"
                                  title="Baixar"
                                >
                                  ⬇
                                </a>
                              ) : (
                                <span className="text-gray-300">enviando...</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
