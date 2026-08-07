import { buscarEmbarquesAtivos, formatarDataBr, type LinhaEmbarque } from "@/lib/embarques";
import { sair } from "./actions";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

function corPercentual(percentual: number | null): string {
  if (percentual === null) return "bg-gray-200 text-gray-500";
  if (percentual >= 70) return "bg-verde/15 text-verde";
  if (percentual >= 40) return "bg-amarelo/15 text-amarelo";
  return "bg-vermelho/15 text-vermelho";
}

function CartaoEmbarque({ linha }: { linha: LinhaEmbarque }) {
  const { embarque, obra, totalRdos, percentual, diasEmbarcado, dataInicioReal, itensAvanco, rdosPendentes } = linha;
  const temItens = itensAvanco.concluido.length + itensAvanco.em_andamento.length + itensAvanco.a_iniciar.length > 0;
  const temPendencia = rdosPendentes > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy leading-tight">{embarque.efetivo_nome || "-"}</p>
          <p className="text-sm text-gray-500">{embarque.efetivo_funcao || "Função não informada"}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${corPercentual(percentual)}`}>
            {percentual !== null ? `${percentual}%` : "sem dados"}
          </span>
          {temPendencia && (
            <span className="text-[10px] text-amarelo font-medium whitespace-nowrap">
              defasado {rdosPendentes}d
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-gray-400">Obra / Plataforma</dt>
        <dd className="text-right text-gray-700 font-medium">{embarque.obra_nome || "-"}</dd>

        <dt className="text-gray-400">Empresa</dt>
        <dd className="text-right text-gray-700">{obra?.empresa || "-"}</dd>

        <dt className="text-gray-400">Embarcado desde</dt>
        <dd className="text-right text-gray-700">{formatarDataBr(dataInicioReal)}</dd>

        <dt className="text-gray-400">Dias a bordo</dt>
        <dd className="text-right text-gray-700">{diasEmbarcado !== null ? `${diasEmbarcado} dia(s)` : "-"}</dd>

        <dt className="text-gray-400">Previsão de desembarque</dt>
        <dd className="text-right text-gray-700">{formatarDataBr(obra?.data_desembarque_prevista ?? null)}</dd>

        <dt className="text-gray-400">RDOs lançados</dt>
        <dd className="text-right text-gray-700">{totalRdos}</dd>

        {temPendencia && (
          <>
            <dt className="text-amarelo font-medium">RDOs pendentes</dt>
            <dd className="text-right text-amarelo font-medium">
              {rdosPendentes} dia{rdosPendentes === 1 ? "" : "s"} sem RDO
            </dd>
          </>
        )}
      </dl>

      {temPendencia && (
        <div className="bg-amarelo/10 border border-amarelo/25 text-amarelo text-xs rounded-md px-3 py-2">
          ⚠ O % de avanço acima é do último RDO sincronizado - com {rdosPendentes} dia
          {rdosPendentes === 1 ? "" : "s"} sem lançamento (comum com internet instável a bordo), pode não
          refletir a situação mais recente.
        </div>
      )}

      {temItens && (
        <>
          <div className="h-px bg-gray-100" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1 bg-verde/10 text-verde font-semibold px-2 py-1 rounded-full">
                ✓ {itensAvanco.concluido.length} concluído{itensAvanco.concluido.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1 bg-amarelo/10 text-amarelo font-semibold px-2 py-1 rounded-full">
                ● {itensAvanco.em_andamento.length} em andamento
              </span>
              <span className="flex items-center gap-1 bg-gray-100 text-gray-500 font-semibold px-2 py-1 rounded-full">
                ○ {itensAvanco.a_iniciar.length} a iniciar
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {itensAvanco.concluido.map((item) => (
                <span key={item} className="text-verde">✓ {item}</span>
              ))}
              {itensAvanco.em_andamento.map((item) => (
                <span key={item} className="text-amarelo">● {item}</span>
              ))}
              {itensAvanco.a_iniciar.map((item) => (
                <span key={item} className="text-gray-400">○ {item}</span>
              ))}
            </div>
          </div>
        </>
      )}
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
