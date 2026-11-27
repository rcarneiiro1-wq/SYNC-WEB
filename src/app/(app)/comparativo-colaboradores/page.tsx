import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users2 } from "lucide-react";
import { ComparativoColaboradoresConteudo } from "@/components/ComparativoColaboradoresConteudo";
import { buscarColaboradoresCadastrados } from "@/lib/relatorios";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export default async function PaginaComparativoColaboradores() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  // mesma permissão já usada em /relatorios e /historico-colaborador - só
  // pra gestão, como pedido explicitamente pelo Rafael
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  const colaboradoresCadastrados = await buscarColaboradoresCadastrados();

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
              <Users2 size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-navy leading-tight">Comparativo entre colaboradores</h1>
              <p className="text-sm text-gray-500">Quem está embarcando mais, quem está parado e como cada um vem performando.</p>
            </div>
          </div>
          {/* Redesign 27/11 (pedido do Rafael) - selo discreto lembrando que essa
           * tela é restrita, mesma permissão de sempre (gerenciamento_embarques). */}
          <span className="text-xs font-semibold text-[#6a4fb0] bg-[#EEE9F9] px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap">
            Apenas gestão
          </span>
        </div>
        <ComparativoColaboradoresConteudo colaboradoresCadastrados={colaboradoresCadastrados} />
      </main>
    </div>
  );
}
