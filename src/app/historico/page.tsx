import { buscarEmbarquesFinalizados, buscarOpcoesFiltro, type LinhaHistorico, type FiltrosHistorico } from "@/lib/embarques";
import { Cabecalho } from "@/components/Cabecalho";
import { TabelaHistorico } from "@/components/TabelaHistorico";
import { FiltroHistorico } from "@/components/FiltroHistorico";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

type ParametrosBusca = { [chave: string]: string | string[] | undefined };

function _texto(valor: string | string[] | undefined): string | undefined {
  // o Next.js tipa cada parâmetro da URL como string OU lista de strings
  // (caso o mesmo parâmetro apareça repetido na URL) - aqui a gente só
  // usa o primeiro valor, que é o caso normal (99,9% das vezes)
  if (Array.isArray(valor)) return valor[0];
  return valor;
}

export default async function PaginaHistorico({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusca>;
}) {
  const params = await searchParams;

  const filtros: FiltrosHistorico = {
    colaborador: _texto(params.colaborador),
    obra: _texto(params.obra),
    dataInicio: _texto(params.dataInicio),
    dataFim: _texto(params.dataFim),
    situacao: (_texto(params.situacao) as FiltrosHistorico["situacao"]) || "todos",
  };

  let linhas: LinhaHistorico[] = [];
  let erro: string | null = null;
  let opcoes: { colaboradores: string[]; obras: string[] } = { colaboradores: [], obras: [] };

  try {
    const [linhasResultado, opcoesResultado] = await Promise.all([
      buscarEmbarquesFinalizados(filtros),
      buscarOpcoesFiltro(),
    ]);
    linhas = linhasResultado;
    opcoes = opcoesResultado;
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  const temFiltroAtivo = Boolean(
    filtros.colaborador || filtros.obra || filtros.dataInicio || filtros.dataFim ||
      (filtros.situacao && filtros.situacao !== "todos")
  );

  return (
    <div className="min-h-screen">
      <Cabecalho paginaAtiva="historico" />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Histórico de embarques finalizados</h1>

        <FiltroHistorico
          colaboradoresSugeridos={opcoes.colaboradores}
          obrasSugeridas={opcoes.obras}
          valoresIniciais={{
            colaborador: filtros.colaborador ?? "",
            obra: filtros.obra ?? "",
            situacao: filtros.situacao ?? "todos",
            dataInicio: filtros.dataInicio ?? "",
            dataFim: filtros.dataFim ?? "",
          }}
        />

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            {temFiltroAtivo
              ? "Nenhum embarque encontrado com esses filtros."
              : "Nenhum embarque finalizado ainda."}
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
