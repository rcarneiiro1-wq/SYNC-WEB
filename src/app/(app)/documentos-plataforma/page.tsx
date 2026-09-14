import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarPlataformas, buscarDocumentosPlataforma } from "@/lib/documentosPlataforma";
import { GruposRdoLista } from "@/components/documentos/GruposRdoLista";
import { ListaRelatoriosEmbarque } from "@/components/documentos/ListaRelatoriosEmbarque";
import { SecaoDocumentosGerais } from "@/components/documentos/SecaoDocumentosGerais";

export const dynamic = "force-dynamic";

/** "Documentos da Plataforma" (14/09) - uma aba por plataforma já visitada,
 * com os RDOs e Relatórios de Embarque alimentando sozinhos (agregação do
 * que já existe em `rdos`/`anexos_embarque`) + documentos gerais manuais
 * (Isométricos/P&ID/Plantas/Outros). Reaproveita a mesma permissão de
 * "gerenciamento_embarques" por enquanto (decisão do Rafael, 14/09). */
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
    <main className="max-w-6xl mx-auto px-6 py-8">
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

      <div className="flex flex-col gap-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-navy text-sm">RDOs</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-azul-escuro bg-azul-escuro/10 px-2 py-0.5 rounded-full">
                🔄 Automático
              </span>
            </div>
            <span className="text-xs text-gray-400">Alimentado sozinho a cada RDO lançado</span>
          </div>
          <GruposRdoLista grupos={dados.gruposRdo} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-navy text-sm">Relatórios de Embarque</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-azul-escuro bg-azul-escuro/10 px-2 py-0.5 rounded-full">
                🔄 Automático
              </span>
              <span className="text-xs text-gray-400">({dados.relatoriosEmbarque.length})</span>
            </div>
            <span className="text-xs text-gray-400">Alimentado sozinho ao enviar o relatório</span>
          </div>
          <ListaRelatoriosEmbarque relatorios={dados.relatoriosEmbarque} />
        </div>

        <SecaoDocumentosGerais obraId={obraSelecionada.obraId} documentosGerais={dados.documentosGerais} />
      </div>
    </main>
  );
}
