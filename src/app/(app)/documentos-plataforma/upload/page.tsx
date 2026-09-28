import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarPlataformas, buscarDocumentosPlataforma } from "@/lib/documentosPlataforma";
import { SecaoDocumentosGerais } from "@/components/documentos/SecaoDocumentosGerais";

export const dynamic = "force-dynamic";

/** "Upload de Arquivos" (14/09) - tela dedicada só pra subir documentos
 * gerais (Isométricos/P&ID/Plantas/Outros): escolhe a plataforma primeiro,
 * depois usa os mesmos cards/botão de "Documentos da Plataforma". Só
 * gerência por enquanto (mesma permissão de "gerenciamento_embarques") -
 * o colaborador embarcado ainda não tem acesso a essa tela (ver Rafael,
 * 14/09: "depois pensamos em como os colaborados embarcados podem fazer
 * isso, mas por enquanto deixa só assim mesmo"). */
export default async function PaginaUploadDocumentos({
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
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-1">Upload de Arquivos</h1>
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500 mt-6">
          Nenhuma plataforma com embarque registrado ainda.
        </div>
      </main>
    );
  }

  const obraSelecionada =
    plataformas.find((p) => p.obraId === obraSelecionadaParam) || plataformas[0];
  // só precisa dos documentos gerais aqui - RDOs/Relatório de Embarque não
  // têm upload manual, então nem vale a pena buscar (o `Promise` interno já
  // pula as duas queries quando não tem embarque, mas aqui buscamos mesmo
  // assim porque a função devolve tudo junto - o custo extra é pequeno)
  const dados = await buscarDocumentosPlataforma(obraSelecionada.obraId);

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-navy mb-1">⬆️ Upload de Arquivos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Envia Isométricos, P&ID, Plantas ou outros documentos gerais pra biblioteca da plataforma escolhida.{" "}
        <Link href="/documentos-plataforma" className="text-azul hover:underline">
          Ver a biblioteca completa
        </Link>
        .
      </p>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {plataformas.map((p) => {
          const ativa = p.obraId === obraSelecionada.obraId;
          return (
            <Link
              key={p.obraId}
              href={`/documentos-plataforma/upload?obra=${p.obraId}`}
              className={`text-sm font-semibold px-4 py-2 rounded-md transition-colors ${
                ativa ? "bg-azul text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🛢️ {p.nome}
            </Link>
          );
        })}
      </div>

      <SecaoDocumentosGerais obraId={obraSelecionada.obraId} documentosGerais={dados.documentosGerais} />
    </main>
  );
}
