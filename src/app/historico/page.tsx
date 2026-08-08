import { buscarEmbarquesFinalizados, formatarDataBr, type LinhaHistorico } from "@/lib/embarques";
import { Cabecalho } from "@/components/Cabecalho";

export const dynamic = "force-dynamic";

function corPercentualBadge(percentual: number | null): string {
  if (percentual === null) return "bg-gray-100 text-gray-400";
  if (percentual >= 70) return "bg-verde/15 text-verde";
  if (percentual >= 40) return "bg-amarelo/15 text-amarelo";
  return "bg-vermelho/15 text-vermelho";
}

/** Mesmas bolinhas de status usadas nos cards de "Embarques ativos" -
 * mantém a mesma linguagem visual entre as duas páginas, e ocupa bem
 * menos espaço horizontal que escrever "2 concluídos · 1 em andamento". */
function ResumoItens({ itensAvanco }: { itensAvanco: LinhaHistorico["itensAvanco"] }) {
  const { concluido, em_andamento, a_iniciar } = itensAvanco;
  const total = concluido.length + em_andamento.length + a_iniciar.length;
  if (total === 0) return <span className="text-gray-300 text-xs">sem itens</span>;

  const titulo = [
    concluido.length ? `Concluído: ${concluido.join(", ")}` : null,
    em_andamento.length ? `Em andamento: ${em_andamento.join(", ")}` : null,
    a_iniciar.length ? `A iniciar: ${a_iniciar.join(", ")}` : null,
  ].filter(Boolean).join(" — ");

  return (
    <div className="flex gap-1.5 text-xs" title={titulo}>
      {concluido.length > 0 && <span className="text-verde font-medium">✓{concluido.length}</span>}
      {em_andamento.length > 0 && <span className="text-amarelo font-medium">●{em_andamento.length}</span>}
      {a_iniciar.length > 0 && <span className="text-gray-400 font-medium">○{a_iniciar.length}</span>}
    </div>
  );
}

function LinhaTabela({ linha, par }: { linha: LinhaHistorico; par: boolean }) {
  const { embarque, totalRdos, percentualFinal, dias, pendentes, itensAvanco, inicioReal, fimReal } = linha;

  return (
    <tr className={`${par ? "bg-gray-50/60" : "bg-white"} hover:bg-azul/5 transition-colors`}>
      <td className="py-3.5 px-4">
        <p className="text-sm font-semibold text-navy leading-tight">{embarque.efetivo_nome || "-"}</p>
        <p className="text-xs text-gray-400 leading-tight mt-0.5">{embarque.obra_nome || "-"}</p>
      </td>

      <td className="py-3.5 px-4 text-sm text-gray-600 whitespace-nowrap">
        {formatarDataBr(inicioReal)}
        <span className="text-gray-300 mx-1.5">→</span>
        {formatarDataBr(fimReal)}
      </td>

      <td className="py-3.5 px-4 text-center">
        <p className="text-sm font-medium text-gray-700">
          {dias ?? "-"}
          {dias !== null && <span className="text-gray-400 font-normal text-xs"> d</span>}
        </p>
        <p className="text-xs text-gray-400">{totalRdos} RDO{totalRdos === 1 ? "" : "s"}</p>
      </td>

      <td className="py-3.5 px-4 text-center">
        {pendentes > 0 ? (
          <span className="inline-flex items-center gap-1 bg-amarelo/10 text-amarelo text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
            ⚠ {pendentes} pendente{pendentes === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">em dia</span>
        )}
      </td>

      <td className="py-3.5 px-4 text-center">
        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${corPercentualBadge(percentualFinal)}`}>
          {percentualFinal !== null ? `${percentualFinal}%` : "-"}
        </span>
      </td>

      <td className="py-3.5 px-4">
        <ResumoItens itensAvanco={itensAvanco} />
      </td>
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

      <main className="max-w-5xl mx-auto px-6 py-8">
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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaborador</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Duração</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendências</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">% Final</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">O que foi feito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linhas.map((linha, i) => (
                  <LinhaTabela key={linha.embarque.id} linha={linha} par={i % 2 === 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          "Período" e "Duração" são calculados pelo intervalo real coberto pelos RDOs lançados - não pela data
          administrativa de início/fim do embarque. Passa o mouse em cima das bolinhas de "O que foi feito" pra ver os
          itens de cada uma.
        </p>
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Developed by Rafael Carneiro · Sync ERP
      </footer>
    </div>
  );
}
