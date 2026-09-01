"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  FileText,
  Ship,
  Award,
  Users,
  Building2,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";

type ItemMenu = {
  rotulo: string;
  href?: string;
  icone: React.ElementType;
  emBreve?: boolean;
  subItens?: { rotulo: string; href: string }[];
};

const ITENS: ItemMenu[] = [
  { rotulo: "Início", href: "/", icone: Home },
  { rotulo: "RDO", icone: FileText, emBreve: true },
  {
    rotulo: "Embarques",
    icone: Ship,
    subItens: [
      { rotulo: "Ativos agora", href: "/embarques/ativos" },
      { rotulo: "Histórico", href: "/historico" },
      { rotulo: "Relatório por empresa", href: "/relatorios" },
    ],
  },
  { rotulo: "Certificados", icone: Award, emBreve: true },
  { rotulo: "Colaboradores", icone: Users, emBreve: true },
  { rotulo: "Empresas", icone: Building2, emBreve: true },
  { rotulo: "Relatórios", icone: BarChart3, emBreve: true },
  { rotulo: "Configurações", icone: Settings, emBreve: true },
];

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Sidebar({
  nome,
  funcao,
  sair,
}: {
  nome: string;
  funcao?: string;
  sair: () => Promise<void>;
}) {
  const pathname = usePathname();
  // o grupo "Embarques" começa aberto se a página atual for uma das
  // sub-páginas dele - assim quem está em "Histórico" não vê o menu
  // fechado, sem saber onde está
  const [embarquesAberto, setEmbarquesAberto] = useState(
    pathname.startsWith("/embarques") || pathname.startsWith("/historico") || pathname.startsWith("/relatorios")
  );

  return (
    <aside className="w-64 shrink-0 bg-navy text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-full border-2 border-azul flex items-center justify-center text-azul text-lg font-bold shrink-0">
          S
        </div>
        <div className="min-w-0">
          <p className="font-bold leading-tight truncate">Sync ERP</p>
          <p className="text-azul text-[11px] font-semibold tracking-wide truncate">MF MÁQUINAS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 flex flex-col gap-0.5">
        {ITENS.map((item) => {
          const Icone = item.icone;

          if (item.subItens) {
            return (
              <div key={item.rotulo}>
                <button
                  type="button"
                  onClick={() => setEmbarquesAberto((v) => !v)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  <Icone size={18} className="shrink-0" />
                  <span className="flex-1 text-left">{item.rotulo}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${embarquesAberto ? "rotate-180" : ""}`}
                  />
                </button>
                {embarquesAberto && (
                  <div className="ml-4 pl-4 border-l border-white/10 flex flex-col gap-0.5 mt-0.5 mb-1">
                    {item.subItens.map((sub) => {
                      const ativo = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`px-3 py-2 rounded-md text-sm transition-colors ${
                            ativo
                              ? "bg-azul/20 text-white font-semibold"
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {sub.rotulo}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (item.emBreve) {
            return (
              <div
                key={item.rotulo}
                title="Em breve nessa área"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-500 cursor-not-allowed select-none"
              >
                <Icone size={18} className="shrink-0" />
                <span className="flex-1">{item.rotulo}</span>
                <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">em breve</span>
              </div>
            );
          }

          const ativo = pathname === item.href;
          return (
            <Link
              key={item.rotulo}
              href={item.href!}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                ativo ? "bg-azul text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icone size={18} className="shrink-0" />
              <span>{item.rotulo}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
          <div className="w-9 h-9 rounded-full bg-azul/25 text-azul flex items-center justify-center text-xs font-bold shrink-0">
            {iniciaisDoNome(nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{nome}</p>
            {/* função de verdade em vez de "Administrador" - a pessoa quer
                saber o cargo dela, não o nível de permissão no sistema */}
            <p className="text-[11px] text-gray-400 truncate">{funcao || "—"}</p>
          </div>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="w-full mt-1 flex items-center gap-2.5 px-2 py-2 rounded-md text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            Sair do sistema
          </button>
        </form>
      </div>
    </aside>
  );
}
