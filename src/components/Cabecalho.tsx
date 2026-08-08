import Link from "next/link";
import { sair } from "@/app/actions";

export function Cabecalho({ paginaAtiva }: { paginaAtiva: "ativos" | "historico" | "relatorios" }) {
  const linkClasse = (pagina: "ativos" | "historico" | "relatorios") =>
    `text-sm font-medium ${
      paginaAtiva === pagina ? "text-white" : "text-gray-400 hover:text-white"
    }`;

  return (
    <header className="bg-navy text-white">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-lg font-bold leading-tight">Sync ERP</p>
            <p className="text-azul text-xs font-semibold tracking-wide">GERENCIAMENTO DE EMBARQUE</p>
          </div>
          <nav className="flex gap-5">
            <Link href="/" className={linkClasse("ativos")}>
              Embarques ativos
            </Link>
            <Link href="/historico" className={linkClasse("historico")}>
              Histórico
            </Link>
            <Link href="/relatorios" className={linkClasse("relatorios")}>
              Relatório por empresa
            </Link>
          </nav>
        </div>
        <form action={sair}>
          <button type="submit" className="text-xs text-gray-300 hover:text-white underline cursor-pointer">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
