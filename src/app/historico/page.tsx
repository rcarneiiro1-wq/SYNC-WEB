import { buscarEmbarquesFinalizados, formatarDataBr, type LinhaHistorico } from "@/lib/embarques";
import { Cabecalho } from "@/components/Cabecalho";

export const dynamic = "force-dynamic";

function corPercentual(percentual: number | null): string {
  if (percentual === null) return "text-gray-400";
  if (percentual >= 70) return "text-verde";
  if (percentual >= 40) return "text-amarelo";
  return "text-vermelho";
}

function LinhaTabela({ linha }: { linha: LinhaHistorico }) {
  const { embarque, totalRdos, percentualFinal, dias, pendentes, itensAvanco } = linha;
  const resumoItens = [
    itensAvanco.concluido.length ? `${itensAvanco.concluido.length} concluído(s)` : null,
    itensAvanco.em_andamento.length ? `${itensAvanco.em_andamento.length} em andamento` : null,
    itensAvanco.a_iniciar.length ? `${itensAvanco.a_iniciar.length} a iniciar` : null,
  ].filter(Boolean).join(" · ");

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-4 text-sm font-medium text-navy">{embarque.efetivo_nome || "-"}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{embarque.obra_nome || "-"}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{formatarDataBr(embarque.data_inicio)}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{formatarDataBr(embarque.data_fim)}</td>
      <td className="py-3 px-4 text-sm text-gray-600 text-center">{dias ?? "-"}</td>
      <td className="py-3 px-4 text-sm text-gray-600 text-center">{totalRdos}</td>
      <td className="py-3 px-4 text-sm text-center">
        {pendentes > 0 ? (
          <span className="text-amarelo font-medium">⚠ {pendentes}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className={`py-3 px-4 text-sm text-right font-semibold ${corPercentual(percentualFinal)}`}>
        {percentualFinal !== null ? `${percentualFinal}%` : "-"}
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">{resumoItens || "-"}</td>
    </tr>
  );
}

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

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-xl font-bold text-navy">Histórico de embarques finalizados</h1>
          <p className="text-sm text-gray-500">
            {linhas.length} embarque{linhas.length === 1 ? "" : "s"}
          </p>
        </div>

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

        {linhas.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaborador</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Obra</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Início</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fim</th>
                  <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Dias</th>
                  <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">RDOs</th>
                  <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendências</th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">% Final</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">O que foi feito</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <LinhaTabela key={linha.embarque.id} linha={linha} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          "Dias" e "Pendências" são calculados pelo intervalo real coberto pelos RDOs lançados - não pela data
          administrativa de início/fim do embarque.
        </p>
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Developed by Rafael Carneiro · Sync ERP
      </footer>
    </div>
  );
}
