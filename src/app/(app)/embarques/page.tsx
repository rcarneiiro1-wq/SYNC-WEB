import Link from "next/link";
import { Users, History, BarChart3 } from "lucide-react";

const CARTOES = [
  {
    titulo: "Embarques Ativos",
    descricao: "Quem está embarcado agora, com % de avanço e dias a bordo.",
    icone: Users,
    href: "/embarques/ativos",
  },
  {
    titulo: "Histórico",
    descricao: "Busque embarques já encerrados, por colaborador ou período.",
    icone: History,
    href: "/historico",
  },
  {
    titulo: "Relatório por Empresa",
    descricao: "Filtre por empresa e veja RDOs e relatórios assinados de cada pessoa.",
    icone: BarChart3,
    href: "/relatorios",
  },
];

export default function PaginaGerenciamentoEmbarques() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-xl font-bold text-navy mb-1">Gerenciamento de Embarques</h1>
      <p className="text-sm text-gray-500 mb-8">Escolha o que você quer consultar.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {CARTOES.map((c) => {
          const Icone = c.icone;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-azul/10 text-azul flex items-center justify-center">
                <Icone size={26} />
              </div>
              <h2 className="font-bold text-navy text-[15px]">{c.titulo}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">{c.descricao}</p>
              <span className="text-xs font-semibold text-azul mt-1">Acessar →</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
