import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buscarEmbarquesAtivos, type LinhaEmbarque } from "@/lib/embarques";
import { RelatorioEmbarcadosConteudo } from "@/components/RelatorioEmbarcadosConteudo";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export const dynamic = "force-dynamic";

export default async function PaginaRelatorioEmbarcados() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  // 03/09: só quem tem "gerenciamento_embarques" (ou admin)
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  let linhas: LinhaEmbarque[] = [];
  let erro: string | null = null;

  try {
    linhas = await buscarEmbarquesAtivos();
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-1">Relatório de embarcados</h1>
        <p className="text-sm text-gray-500 mb-6">Selecione quem vai entrar no relatório.</p>

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && <RelatorioEmbarcadosConteudo linhas={linhas} />}
      </main>
    </div>
  );
}
