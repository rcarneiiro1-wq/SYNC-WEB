import {
  buscarEmbarquesFinalizados, buscarNomesTodosColaboradores, type LinhaHistorico, type FiltrosHistorico,
} from "@/lib/embarques";
import { TabelaHistorico } from "@/components/TabelaHistorico";
import { FiltroColaborador } from "@/components/FiltroColaborador";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

type ParametrosBusca = { [chave: string]: string | string[] | undefined };

function _texto(valor: string | string[] | undefined): string | undefined {
  if (Array.isArray(valor)) return valor[0];
  return valor;
}

export default async function PaginaHistoricoColaborador({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusca>;
}) {
  const params = await searchParams;
  const colaborador = _texto(params.colaborador);
  const dataInicio = _texto(params.dataInicio);
  const dataFim = _texto(params.dataFim);

  let linhas: LinhaHistorico[] = [];
  let nomesSugeridos: string[] = [];
  let erro: string | null = null;

  try {
    nomesSugeridos = await buscarNomesTodosColaboradores();
    if (colaborador) {
      const filtros: FiltrosHistorico = { colaborador, dataInicio, dataFim };
      linhas = await buscarEmbarquesFinalizados(filtros);
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-1">Histórico colaborador</h1>
        <p className="text-sm text-gray-500 mb-6">
          Busca o histórico de embarques finalizados de uma pessoa específica.
        </p>

        <FiltroColaborador
          colaboradoresSugeridos={nomesSugeridos}
          valoresIniciais={{
            colaborador: colaborador ?? "",
            dataInicio: dataInicio ?? "",
            dataFim: dataFim ?? "",
          }}
        />

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && !colaborador && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            Busca um colaborador acima pra ver o histórico dele.
          </div>
        )}

        {!erro && colaborador && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            Nenhum embarque finalizado encontrado pra &quot;{colaborador}&quot; nesse período.
          </div>
        )}

        {!erro && linhas.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-2">
              {linhas.length} embarque{linhas.length === 1 ? "" : "s"} encontrado{linhas.length === 1 ? "" : "s"}
            </p>
            <TabelaHistorico linhas={linhas} />
          </>
        )}
      </main>
    </div>
  );
}
