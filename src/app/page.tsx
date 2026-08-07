import { buscarEmbarquesAtivos, type LinhaEmbarque } from "@/lib/embarques";
import { sair } from "./actions";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

function corPercentual(percentual: number | null): string {
  if (percentual === null) return "bg-gray-200 text-gray-500";
  if (percentual >= 70) return "bg-verde/15 text-verde";
  if (percentual >= 40) return "bg-amarelo/15 text-amarelo";
  return "bg-vermelho/15 text-vermelho";
}

function CartaoEmbarque({ linha }: { linha: LinhaEmbarque }) {
  const { embarque, obra, totalRdos, percentual, diasEmbarcado } = linha;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy leading-tight">{embarque.efetivo_nome || "-"}</p>
          <p className="text-sm text-gray-500">{embarque.efetivo_funcao || "Função não informada"}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${corPercentual(percentual)}`}>
          {percentual !== null ? `${percentual}%` : "sem dados"}
        </span>
      </div>

      <div className="h-px bg-gray-100" />

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-gray-400">Obra / Plataforma</dt>
        <dd className="text-right text-gray-700 font-medium">{embarque.obra_nome || "-"}</dd>

        <dt className="text-gray-400">Empresa</dt>
        <dd className="text-right text-gray-700">{obra?.empresa || "-"}</dd>

        <dt className="text-gray-400">Embarcado desde</dt>
        <dd className="text-right text-gray-700">{embarque.data_inicio || "-"}</dd>

        <dt className="text-gray-400">Dias a bordo</dt>
        <dd className="text-right text-gray-700">{diasEmbarcado !== null ? `${diasEmbarcado} dia(s)` : "-"}</dd>

        <dt className="text-gray-400">Previsão de desembarque</dt>
        <dd className="text-right text-gray-700">{obra?.data_desembarque_prevista || "-"}</dd>

        <dt className="text-gray-400">RDOs lançados</dt>
        <dd className="text-right text-gray-700">{totalRdos}</dd>
      </dl>
    </div>
  );
}

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
      <header className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold leading-tight">Sync ERP</p>
            <p className="text-azul text-xs font-semibold tracking-wide">GERENCIAMENTO DE EMBARQUE</p>
          </div>
          <form action={sair}>
            <button
              type="submit"
              className="text-xs text-gray-300 hover:text-white underline cursor-pointer"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

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
