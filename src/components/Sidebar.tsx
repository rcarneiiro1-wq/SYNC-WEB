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
  LogOut,
  Info,
  X,
  ShieldAlert,
  ClipboardList,
  Hash,
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

// resto do sistema (ainda não migrado pro web) - "em breve" virou só uma
// linha de texto no rodapé (ver Sidebar abaixo), não itens fantasma na nav.
const AVISO_EM_BREVE = "Em breve: RDO · Relatórios gerais · Configurações";

// módulo de Certificados (03/09) - só aparece pra quem tem a permissão
// "certificados" no cadastro (ou admin, que tem tudo), igual o desktop.
// Ordem = fluxo real de uso (pedido do Rafael, 03/09): primeiro os
// cadastros-base (quem, e quais tipos de certificado existem), depois o
// lançamento em si, depois numeração, e só por último o painel de
// vencimentos (é o que se consulta depois de tudo já cadastrado).
const ITENS_CERTIFICADOS: ItemMenu[] = [
  { rotulo: "Colaboradores", href: "/certificados/colaboradores", icone: Users },
  { rotulo: "Tipos de certificado", href: "/certificados/tipos", icone: ClipboardList },
  { rotulo: "Lançar certificado", href: "/certificados/lancar", icone: FileText },
  { rotulo: "Numeração NR/PE", href: "/certificados/numeracao", icone: Hash },
  { rotulo: "Painel de vencimentos", href: "/certificados", icone: Award },
];

const VERSAO_SISTEMA = "Sync ERP v2.10.23";

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Título de seção fixo, sem clique pra abrir/fechar - a lateral inteira
 * fica sempre visível de uma vez (era um dos motivos dela parecer
 * "bagunçada": grupos fechados por padrão exigiam clique extra pra achar
 * o que precisava). Só organiza visualmente, não esconde nada. */
function TituloSecao({ titulo }: { titulo: string }) {
  return (
    <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
      {titulo}
    </div>
  );
}

function DivisorLateral() {
  return <div className="my-1 border-t border-white/10" />;
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
  temAcessoCertificados,
}: {
  nome: string;
  funcao?: string;
  sair: () => Promise<void>;
  ehAdmin?: boolean;
  temAcessoCertificados?: boolean;
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

        <TituloSecao titulo="Gerenciamento de embarque" />
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

        {temAcessoCertificados && (
          <>
            <DivisorLateral />
            <TituloSecao titulo="Certificados" />
            {ITENS_CERTIFICADOS.map((item) => {
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
          </>
        )}

        {ehAdmin && (
          <>
            <DivisorLateral />
            <TituloSecao titulo="Administração" />
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
        <p className="px-2 pb-2 text-[10px] leading-relaxed text-gray-500">{AVISO_EM_BREVE}</p>
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
