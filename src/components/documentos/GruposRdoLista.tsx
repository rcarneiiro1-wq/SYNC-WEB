"use client";

import { useState } from "react";
import type { GrupoRdoEmbarque } from "@/lib/documentosPlataformaTipos";
import { urlDownloadArquivo } from "@/lib/download";
import { formatarDataBr } from "@/lib/embarques";

/** Categoria "RDOs" (automática): uma linha por EMBARQUE (não por arquivo -
 * pedido do Rafael em 14/09, pensando no volume que isso vai virar), com
 * "Ver mais" pra abrir a listagem individual dos RDOs daquele embarque. */
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

  if (grupos.length === 0) {
    return <p className="text-xs text-gray-400 px-4 py-4">Nenhum RDO ainda.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {grupos.map((grupo) => {
        const aberto = abertos.has(grupo.embarqueId);
        return (
          <div key={grupo.embarqueId}>
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="flex-1 min-w-0 text-gray-700 truncate" title={grupo.colaborador}>
                {grupo.colaborador}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">{grupo.periodo}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap hidden md:inline">
                {grupo.enviadoPor}
              </span>
              <span className="text-xs font-semibold text-azul whitespace-nowrap">
                {grupo.totalRdos} RDO{grupo.totalRdos === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => alternar(grupo.embarqueId)}
                className="text-xs font-medium text-azul hover:underline cursor-pointer whitespace-nowrap"
              >
                {aberto ? "Ver menos" : "Ver mais"}
              </button>
            </div>
            {aberto && (
              <div className="bg-gray-50 px-4 py-2">
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
