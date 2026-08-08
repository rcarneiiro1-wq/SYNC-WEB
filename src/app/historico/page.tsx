import { buscarEmbarquesFinalizados, type LinhaHistorico } from "@/lib/embarques";
import { Cabecalho } from "@/components/Cabecalho";
import { TabelaHistorico } from "@/components/TabelaHistorico";

export const dynamic = "force-dynamic";

export default async function PaginaHistorico() {
  let linhas: LinhaHistorico[] = [];
  let erro: string | null = null;

  try {
    linhas = await buscarEmbarquesFinalizados();
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  return (
    <div className="min-h-screen">
      <Cabecalho paginaAtiva="historico" />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Histórico de embarques finalizados</h1>

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            Nenhum embarque finalizado ainda.
          </div>
        )}

        {!erro && linhas.length > 0 && <TabelaHistorico linhas={linhas} />}
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Developed by Rafael Carneiro · Sync ERP
      </footer>
    </div>
  );
}
