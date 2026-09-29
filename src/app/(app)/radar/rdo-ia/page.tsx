import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ScanSearch } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { RevisaoRdoIaPrototype } from "@/components/radar/RevisaoRdoIaPrototype";

/** "Revisão de RDOs (IA)" (28/09, a pedido do Rafael) - terceira peça do
 * Radar, mesmo esquema de acesso das outras duas: admin OU quem tem a
 * permissão `radar` (ver SISTEMAS_PERMISSAO em lib/usuarios.ts, criada em
 * 29/09 pra dar acesso ao Radar sem precisar virar Administrador).
 *
 * Ideia: uma IA leria o texto livre da `descricao` de cada RDO (não as
 * caixinhas de SIM/N/A, pouco confiáveis) pra sinalizar se existe uma
 * atividade real descrita - pensado pros casos em que dá algum
 * impedimento (ex: gangway desconectada) mas ainda precisa constar uma
 * atividade de verdade pra Petrobras liberar a medição. A Raquel seria
 * quem revisaria essa fila.
 *
 * Por enquanto é só protótipo visual (dados de exemplo, nenhum botão lê
 * ou grava no banco) - a proposta já foi levada ao Fabiano, ainda
 * aguardando aprovação antes de qualquer schema/backend de verdade. */
export default async function PaginaRevisaoRdoIa() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  if (!sessao || (!sessao.ehAdmin && !sessao.permissoes?.includes("radar"))) {
    redirect("/");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <ScanSearch size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Revisão de RDOs (IA)</h1>
          <p className="text-sm text-gray-500">
            Ideia de projeto futuro, ainda em estudo. Visível só pra você.
          </p>
        </div>
      </div>

      <RevisaoRdoIaPrototype />
    </main>
  );
}
