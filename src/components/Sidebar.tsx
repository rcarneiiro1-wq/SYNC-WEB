"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  FileText,
  Ship,
  Clock,
  Building2,
  Users,
  Printer,
  Award,
  BarChart3,
  Settings,
  LogOut,
  Info,
  X,
  ShieldAlert,
} from "lucide-react";

type ItemMenu = { rotulo: string; href: string; icone: React.ElementType };

// "GERENCIAMENTO DE EMBARQUE" achatado - sem sub-menu que precisa
// abrir/fechar, igual a referência do desktop (5 itens direto na lateral).
const ITENS_EMBARQUE: ItemMenu[] = [
  { rotulo: "Embarques ativos", href: "/embarques/ativos", icone: Ship },
  { rotulo: "Histórico", href: "/historico", icone: Clock },
  { rotulo: "Relatório por empresa", href: "/relatorios", icone: Building2 },
  { rotulo: "Histórico colaborador", href: "/historico-colaborador", icone: Users },
  { rotulo: "Relatório de embarcados", href: "/relatorio-embarcados", icone: Printer },
];

// resto do sistema (ainda não migrado pro web) - continua "em breve"
const ITENS_EM_BREVE: { rotulo: string; icone: React.ElementType }[] = [
  { rotulo: "RDO", icone: FileText },
  { rotulo: "Certificados", icone: Award },
  { rotulo: "Relatórios gerais", icone: BarChart3 },
  { rotulo: "Configurações", icone: Settings },
];

const VERSAO_SISTEMA = "Sync ERP v2.10.23";

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function ModalSobre({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden"
      onClick={aoFechar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={aoFechar}
          className="float-right text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
        <Image src="/logo-syncerp.png" alt="Sync ERP" width={56} height={56} className="mx-auto mb-3" />
        <p className="font-bold text-navy">{VERSAO_SISTEMA}</p>
        <p className="text-sm text-gray-500 mt-1">Desenvolvido por Rafael Carneiro</p>
        <p className="text-xs text-gray-400 mt-4">Sistema de gerenciamento de embarques offshore — MF Máquinas</p>
      </div>
    </div>
  );
}

export function Sidebar({
  nome,
  funcao,
  sair,
  ehAdmin,
}: {
  nome: string;
  funcao?: string;
  sair: () => Promise<void>;
  ehAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [sobreAberto, setSobreAberto] = useState(false);

  return (
    <aside className="w-64 shrink-0 bg-navy text-white flex flex-col h-screen sticky top-0 print:hidden">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-white/10">
        <Image src="/logo-syncerp.png" alt="Sync ERP" width={40} height={40} className="shrink-0" priority />
        <div className="min-w-0">
          <p className="font-bold leading-tight truncate">Sync ERP</p>
          <p className="text-azul text-[11px] font-semibold tracking-wide truncate">MF MÁQUINAS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 flex flex-col gap-0.5">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname === "/" ? "bg-azul text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Home size={18} className="shrink-0" />
          <span>Início</span>
        </Link>

        <p className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
          Gerenciamento de embarque
        </p>
        {ITENS_EMBARQUE.map((item) => {
          const Icone = item.icone;
          const ativo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                ativo ? "bg-azul text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icone size={18} className="shrink-0" />
              <span>{item.rotulo}</span>
            </Link>
          );
        })}

        {ITENS_EM_BREVE.map((item) => {
          const Icone = item.icone;
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
        })}

        {ehAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
              Administração
            </p>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                pathname === "/admin" ? "bg-vermelho text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ShieldAlert size={18} className="shrink-0" />
              <span>Painel admin</span>
            </Link>
          </>
        )}
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
        <button
          type="button"
          onClick={() => setSobreAberto(true)}
          className="w-full mt-0.5 flex items-center gap-2.5 px-2 py-2 rounded-md text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
        >
          <Info size={15} />
          Sobre
        </button>
        <p className="text-center text-[10px] text-gray-500 mt-2">
          {VERSAO_SISTEMA}
          <br />
          Desenvolvido por Rafael Carneiro
        </p>
      </div>

      {sobreAberto && <ModalSobre aoFechar={() => setSobreAberto(false)} />}
    </aside>
  );
}
