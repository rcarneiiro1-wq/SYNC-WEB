import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Home, Info } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarPlataformas, buscarDocumentosPlataforma } from "@/lib/documentosPlataforma";
import { GruposRdoLista } from "@/components/documentos/GruposRdoLista";
import { ListaRelatoriosEmbarque } from "@/components/documentos/ListaRelatoriosEmbarque";
import { SecaoDocumentosGerais } from "@/components/documentos/SecaoDocumentosGerais";
import { ResumoPlataforma } from "@/components/documentos/ResumoPlataforma";
import { AcoesRapidas } from "@/components/documentos/AcoesRapidas";

export const dynamic = "force-dynamic";

/** "Documentos da Plataforma" (14/09) - uma aba por plataforma já visitada,
 * com os RDOs e Relatórios de Embarque alimentando sozinhos (agregação do
 * que já existe em `rdos`/`anexos_embarque`) + documentos gerais manuais
 * (Isométricos/P&ID/Plantas/MD-GM-SS-WO/Outros). Reaproveita a mesma
 * permissão de "gerenciamento_embarques" por enquanto (decisão do Rafael,
 * 14/09).
 *
 * Redesenho de 15/09 (aprovado pelo Rafael a partir de um mockup que ele
 * mesmo trouxe, alinhado com um briefing detalhado): breadcrumb, RDOs em
 * tabela com Status, e uma coluna de CONTEÚDO à direita (Resumo da
 * Plataforma / Ações Rápidas / Dica) - explicitamente NÃO é a Sidebar de
 * navegação, que continua intocada (vem do layout, `src/app/(app)/layout.tsx`). */
export default async function PaginaDocumentosPlataforma({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string }>;
}) {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  const { obra: obraSelecionadaParam } = await searchParams;
  const plataformas = await buscarPlataformas();

  if (plataformas.length === 0) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-1">Documentos da Plataforma</h1>
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500 mt-6">
          Nenhuma plataforma com embarque registrado ainda.
        </div>
      </main>
    );
  }

  const obraSelecionada =
    plataformas.find((p) => p.obraId === obraSelecionadaParam) || plataformas[0];
  const dados = await buscarDocumentosPlataforma(obraSelecionada.obraId);

  return (
    <main className="max-w-[1240px] mx-auto px-6 py-8">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <Home size={12} />
        <span>Plataformas</span>
        <span className="text-gray-300">›</span>
        <span className="text-navy font-semibold">Documentos</span>
      </div>

      <h1 className="text-xl font-bold text-navy mb-1">📁 Documentos da Plataforma</h1>
      <p className="text-sm text-gray-500 mb-6">
        RDOs e Relatórios de Embarque alimentados sozinhos, documentos gerais enviados manualmente.
      </p>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {plataformas.map((p) => {
          const ativa = p.obraId === obraSelecionada.obraId;
          return (
            <Link
              key={p.obraId}
              href={`/documentos-plataforma?obra=${p.obraId}`}
              className={`text-sm font-semibold px-4 py-2 rounded-md transition-colors ${
                ativa ? "bg-azul text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🛢️ {p.nome}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy text-sm">RDOs</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-azul-escuro bg-azul-escuro/10 px-2 py-0.5 rounded-full">
                  🔄 Automático
                </span>
                <Info size={13} className="text-gray-300" />
              </div>
              <span className="text-xs text-gray-400">Alimentado sozinho a cada RDO lançado</span>
            </div>
            <GruposRdoLista grupos={dados.gruposRdo} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy text-sm">Relatórios de Embarque</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-azul-escuro bg-azul-escuro/10 px-2 py-0.5 rounded-full">
                  🔄 Automático
                </span>
                <span className="text-xs text-gray-400">({dados.relatoriosEmbarque.length})</span>
                <Info size={13} className="text-gray-300" />
              </div>
              <span className="text-xs text-gray-400">Alimentado sozinho ao enviar o relatório</span>
            </div>
            <ListaRelatoriosEmbarque relatorios={dados.relatoriosEmbarque} />
          </div>

          <SecaoDocumentosGerais obraId={obraSelecionada.obraId} documentosGerais={dados.documentosGerais} />
        </div>

        <div className="flex flex-col gap-5">
          <ResumoPlataforma resumo={dados.resumo} />
          <AcoesRapidas obraId={obraSelecionada.obraId} />
          <div className="bg-azul/5 border border-azul/20 rounded-xl p-4 flex gap-2.5">
            <Info size={16} className="text-azul shrink-0 mt-0.5" />
            <p className="text-xs text-azul/90 leading-relaxed">
              Organize os documentos por categoria pra facilitar a consulta e o acesso da equipe.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
