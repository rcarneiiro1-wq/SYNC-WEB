"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, Users } from "lucide-react";
import type { ColaboradorResumo } from "@/lib/relatorios";

/** Seletor multi-seleção de colaboradores - mesma ideia do
 * `SeletorEmpresas`, só que em formato de busca + dropdown em vez de
 * cards soltos, porque a lista de colaboradores tende a crescer bem mais
 * que a de empresas (pedido do Rafael, 27/11: "talvez a gente consiga
 * selecionar apenas alguns"). Pensado pra já escalar com 25+ pessoas sem
 * virar uma parede de botões. */
export function SeletorColaboradores({
  colaboradores,
  selecionados,
  aoMudar,
}: {
  colaboradores: ColaboradorResumo[];
  selecionados: Set<string>;
  aoMudar: (novos: Set<string>) => void;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return colaboradores;
    return colaboradores.filter((c) => c.nome.toLowerCase().includes(termo));
  }, [colaboradores, busca]);

  const selecionadosObjs = useMemo(
    () => colaboradores.filter((c) => selecionados.has(c.id)),
    [colaboradores, selecionados]
  );

  const alternar = (id: string) => {
    const novos = new Set(selecionados);
    if (novos.has(id)) novos.delete(id);
    else novos.add(id);
    aoMudar(novos);
  };

  if (colaboradores.length === 0) return null;

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 relative">
      <p className="text-xs text-gray-500 font-medium">Colaboradores</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {selecionadosObjs.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-azul/10 pl-2.5 pr-1.5 py-1 rounded-full"
          >
            {c.nome}
            <button
              type="button"
              onClick={() => alternar(c.id)}
              className="hover:bg-azul/20 rounded-full p-0.5 cursor-pointer"
              aria-label={`Remover ${c.nome} do filtro`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:border-azul bg-white cursor-pointer"
        >
          <Users size={13} />
          {selecionadosObjs.length === 0 ? "Todos" : "+ adicionar"}
        </button>
      </div>

      {aberto && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg w-72 p-2">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2 py-1.5 mb-2">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar colaborador..."
              className="text-xs w-full outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
            {filtrados.length === 0 && <p className="text-xs text-gray-400 px-2 py-3 text-center">Nenhum colaborador encontrado.</p>}
            {filtrados.map((c) => {
              const marcado = selecionados.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => alternar(c.id)}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-gray-50 text-left cursor-pointer"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      marcado ? "bg-azul border-azul" : "border-gray-300"
                    }`}
                  >
                    {marcado && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate flex-1 text-navy font-medium">{c.nome}</span>
                  {c.empresa && <span className="text-[10px] text-gray-400 capitalize shrink-0">{c.empresa}</span>}
                </button>
              );
            })}
          </div>
          {selecionadosObjs.length > 0 && (
            <button
              type="button"
              onClick={() => aoMudar(new Set())}
              className="text-[11px] text-azul font-medium mt-2 px-2 hover:underline cursor-pointer"
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
}
