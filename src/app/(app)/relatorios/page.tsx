import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RelatorioEmpresasConteudo } from "@/components/RelatorioEmpresasConteudo";
import { buscarEmpresasCadastradas } from "@/lib/embarques";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export default async function PaginaRelatorioEmpresas() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  // 03/09: só quem tem "gerenciamento_embarques" (ou admin)
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  const empresasCadastradas = await buscarEmpresasCadastradas();

  return (
    <div className="min-h-screen">

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Relatório por empresa</h1>
        <RelatorioEmpresasConteudo empresasCadastradas={empresasCadastradas} />
      </main>
    </div>
  );
}
