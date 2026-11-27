import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-navy leading-tight">Relatório por empresa</h1>
            <p className="text-sm text-gray-500">Desempenho de embarques, diárias e qualidade operacional.</p>
          </div>
        </div>
        <RelatorioEmpresasConteudo empresasCadastradas={empresasCadastradas} />
      </main>
    </div>
  );
}
