"use client";

import { LayoutGrid, Check } from "lucide-react";

/** Paleta fixa de cores pros cards de empresa - cicla determinística (por
 * hash do nome), então a mesma empresa sempre cai na mesma cor entre
 * telas diferentes (Histórico e Relatório por empresa usam esse mesmo
 * componente), sem precisar cadastrar cor em lugar nenhum. */
const PALETA = [
  { bg: "#E8F0F9", fg: "#3D6FA6" }, // azul
  { bg: "#E8F5E8", fg: "#3d7a3d" }, // verde
  { bg: "#EEE9F9", fg: "#6a4fb0" }, // roxo
  { bg: "#FBF0DF", fg: "#c07a12" }, // âmbar
  { bg: "#FDE8E8", fg: "#c0392b" }, // vermelho
  { bg: "#E0F7F5", fg: "#0f9488" }, // teal
];

function corDaEmpresa(nome: string): { bg: string; fg: string } {
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  return PALETA[soma % PALETA.length];
}

/** Cards de empresa selecionáveis (multi-seleção) - mesma ideia da tela
 * "Relatório por Empresa" do desktop. Usado tanto no Histórico (filtro
 * de busca) quanto no Relatório por empresa do web (pra ver uma empresa
 * de cada vez, em vez de sempre todas juntas). */
export function SeletorEmpresas({
  empresas,
  selecionadas,
  aoMudar,
}: {
  empresas: string[];
  selecionadas: Set<string>;
  aoMudar: (novas: Set<string>) => void;
}) {
  if (empresas.length === 0) return null;

  const alternar = (empresa: string) => {
    const novas = new Set(selecionadas);
    if (novas.has(empresa)) novas.delete(empresa);
    else novas.add(empresa);
    aoMudar(novas);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-gray-500 font-medium">Empresas</p>
      <div className="flex flex-wrap gap-2.5">
        {empresas.map((empresa) => {
          const cor = corDaEmpresa(empresa);
          const ativa = selecionadas.has(empresa);
          return (
            <button
              key={empresa}
              type="button"
              onClick={() => alternar(empresa)}
              aria-pressed={ativa}
              className={`relative flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-lg border-2 transition-all cursor-pointer bg-white ${
                ativa ? "border-azul shadow-sm" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: cor.bg, color: cor.fg }}
              >
                <LayoutGrid size={14} />
              </span>
              <span className="text-xs font-bold text-navy uppercase tracking-wide">{empresa}</span>
              {ativa && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-azul text-white flex items-center justify-center ring-2 ring-white">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
