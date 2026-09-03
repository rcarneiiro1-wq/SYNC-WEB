import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buscarEmbarquesAtivos, formatarDataBr, recadoDeHoje, type LinhaEmbarque } from "@/lib/embarques";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export const dynamic = "force-dynamic";

type ParametrosBusca = { [chave: string]: string | string[] | undefined };

// classes escritas por extenso (nunca montadas com replace/concat em
// tempo de execução) - o Tailwind só gera a classe se ela aparecer
// LITERALMENTE em algum lugar do código-fonte
function corPercentual(percentual: number | null): { fundo: string; texto: string; barra: string } {
  if (percentual === null) return { fundo: "bg-gray-100", texto: "text-gray-500", barra: "bg-gray-300" };
  if (percentual >= 70) return { fundo: "bg-verde/15", texto: "text-verde", barra: "bg-verde" };
  if (percentual >= 40) return { fundo: "bg-amarelo/15", texto: "text-amarelo", barra: "bg-amarelo" };
  return { fundo: "bg-vermelho/15", texto: "text-vermelho", barra: "bg-vermelho" };
}

function CartaoRelatorioPessoa({ linha }: { linha: LinhaEmbarque }) {
  const { embarque, obra, percentual, itensAvanco } = linha;
  const cor = corPercentual(percentual);
  const pct = percentual ?? 0;
  const recado = recadoDeHoje(embarque);

  const partesSubinfo = [
    embarque.efetivo_funcao,
    obra?.nome || embarque.obra_nome,
    obra?.data_desembarque_prevista
      ? `Previsão de desembarque: ${formatarDataBr(obra.data_desembarque_prevista)}`
      : null,
  ].filter(Boolean);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid mb-4">
      {recado && (
        <div className="bg-azul/10 border-b border-azul/20 text-azul text-xs px-4 py-2">
          <span className="font-bold uppercase tracking-wide">
            📢 Recado do dia — {recado.data} {recado.hora}Hrs
          </span>
          <span className="block mt-0.5">{recado.texto}</span>
        </div>
      )}

      <div className="px-4 pt-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-navy">{embarque.efetivo_nome || "-"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{partesSubinfo.join("  ·  ") || "-"}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${cor.fundo} ${cor.texto}`}>
          {percentual !== null ? `${percentual}%` : "sem dados"}
        </span>
      </div>

      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${cor.barra}`} style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2.5">
        <div>
          <p className="text-[10px] font-bold text-azul uppercase tracking-wide mb-1.5">Em andamento</p>
          {itensAvanco.em_andamento.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {itensAvanco.em_andamento.map((item) => (
                <span key={item} className="text-[11px] font-semibold bg-amarelo/10 text-amarelo px-2 py-0.5 rounded-full">
                  ● {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">nenhum item em andamento no momento</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-azul uppercase tracking-wide mb-1.5">Concluído</p>
          {itensAvanco.concluido.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {itensAvanco.concluido.map((item) => (
                <span key={item} className="text-[11px] font-semibold bg-verde/10 text-verde px-2 py-0.5 rounded-full">
                  ✓ {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">nenhum item concluído ainda</p>
          )}
        </div>
        {itensAvanco.a_iniciar.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-azul uppercase tracking-wide mb-1.5">À iniciar</p>
            <div className="flex flex-wrap gap-1.5">
              {itensAvanco.a_iniciar.map((item) => (
                <span key={item} className="text-[11px] font-semibold bg-vermelho/10 text-vermelho px-2 py-0.5 rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function PaginaRelatorioAvanco({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusca>;
}) {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  // 03/09: só quem tem "gerenciamento_embarques" (ou admin) - essa página
  // é a versão pra imprimir/salvar PDF, aberta a partir do "Ver RDOs"
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  const params = await searchParams;
  const idsParam = params.ids;
  const idsTexto = Array.isArray(idsParam) ? idsParam[0] : idsParam;
  const idsFiltro = idsTexto ? new Set(idsTexto.split(",").filter(Boolean)) : null;

  let linhas: LinhaEmbarque[] = [];
  let erro: string | null = null;
  try {
    const todas = await buscarEmbarquesAtivos();
    linhas = idsFiltro ? todas.filter((l) => idsFiltro.has(l.embarque.id)) : todas;
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  const agora = new Date();
  const geradoEm = `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  })}`;

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <main className="max-w-3xl mx-auto px-6 py-6 print:px-0 print:py-0 print:max-w-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <p className="text-sm text-gray-500">
            {linhas.length} pessoa{linhas.length === 1 ? "" : "s"} nesse relatório
          </p>
          <BotaoImprimir />
        </div>

        {/* barra navy - mesma identidade do relatório em PDF do desktop */}
        <div className="bg-navy text-white rounded-t-lg px-5 py-4 flex items-start justify-between print:rounded-none">
          <div>
            <p className="font-bold text-lg leading-tight">Sync ERP</p>
            <p className="text-[11px] text-azul font-semibold tracking-wide mt-0.5">GERENCIAMENTO DE EMBARQUE</p>
          </div>
          <div className="text-right">
            <p className="font-bold leading-tight">RELATÓRIO DE AVANÇO OFFSHORE</p>
            <p className="text-[11px] text-azul mt-0.5">Gerado em {geradoEm}</p>
          </div>
        </div>

        {/* legenda */}
        <div className="flex items-center justify-center gap-4 border border-t-0 border-gray-200 rounded-b-lg px-5 py-3 mb-5 print:rounded-none">
          <span className="text-[11px] font-semibold bg-verde/10 text-verde px-2.5 py-1 rounded-full">✓ Concluído</span>
          <span className="text-[11px] font-semibold bg-amarelo/10 text-amarelo px-2.5 py-1 rounded-full">● Em andamento</span>
          <span className="text-[11px] font-semibold bg-vermelho/10 text-vermelho px-2.5 py-1 rounded-full">À iniciar</span>
        </div>

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            Ninguém encontrado pra montar esse relatório.
          </div>
        )}

        {linhas.map((linha) => (
          <CartaoRelatorioPessoa key={linha.embarque.id} linha={linha} />
        ))}

        <p className="text-center text-[10px] text-gray-400 mt-8 print:mt-4">
          Sync ERP · MF Máquinas
        </p>
      </main>
    </div>
  );
}
