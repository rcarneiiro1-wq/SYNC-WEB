import { buscarEmbarquesAtivos } from "@/lib/embarques";
import { CartaoEmbarque } from "@/components/CartaoEmbarque";
import type { LinhaEmbarque } from "@/lib/embarques";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

export default async function PaginaEmbarques() {
  let linhas: LinhaEmbarque[] = [];
  let erro: string | null = null;

  try {
    linhas = await buscarEmbarquesAtivos();
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  return (
    <div className="min-h-screen">

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-xl font-bold text-navy">Embarques ativos agora</h1>
          <p className="text-sm text-gray-500">
            {linhas.length} pessoa{linhas.length === 1 ? "" : "s"} embarcada{linhas.length === 1 ? "" : "s"}
          </p>
        </div>

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            Nenhum embarque ativo no momento.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {linhas.map((linha) => (
            <CartaoEmbarque key={linha.embarque.id} linha={linha} />
          ))}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Developed by Rafael Carneiro · Sync ERP
      </footer>
    </div>
  );
}
