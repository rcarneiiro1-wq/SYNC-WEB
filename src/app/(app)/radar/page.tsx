import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Radar as RadarIcon } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { AtendimentosInternosPrototype } from "@/components/radar/AtendimentosInternosPrototype";

/** "Radar" (19/09, a pedido do Rafael) - área reservada pra ideias de
 * projetos futuros, ainda em fase de estudo/protótipo, bem separada do
 * resto do sistema (mesmo esquema de acesso do /admin: só quem tem
 * `eh_admin = true` enxerga essa página e o item na Sidebar).
 *
 * Por enquanto só tem uma aba: "Sistema de Atendimentos Internos" - o
 * protótipo VISUAL do ERP de atendimentos que o Rafael desenhou fora do
 * sistema (organograma + tela de fila por setor). Puro protótipo: nenhum
 * botão aqui lê ou grava nada no banco. Quando esse projeto sair do papel
 * de verdade, essa página vira o rascunho de onde partir - ou é
 * substituída pelas telas reais.
 */
export default async function PaginaRadar() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  if (!sessao || !sessao.ehAdmin) {
    redirect("/");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <RadarIcon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Radar</h1>
          <p className="text-sm text-gray-500">
            Ideias de projetos futuros, ainda em estudo. Visível só pra você.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
        <span className="px-3 py-2 text-sm font-semibold text-navy border-b-2 border-azul -mb-px">
          Sistema de Atendimentos Internos
        </span>
      </div>

      <AtendimentosInternosPrototype />
    </main>
  );
}
