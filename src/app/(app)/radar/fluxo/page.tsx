import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Workflow } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { FluxoSistema } from "@/components/radar/FluxoSistema";

/** "Fluxo do Sistema" (19/09, a pedido do Rafael) - segunda peça do
 * protótipo do Radar, mesmo esquema de acesso de /radar (só admin).
 * Conta em 2 passos a jornada completa de um atendimento de exemplo,
 * do momento em que é aberto até o parecer final pro cliente. Igual ao
 * resto do Radar: puro protótipo visual, nada aqui grava no banco. */
export default async function PaginaFluxoSistema() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  if (!sessao || !sessao.ehAdmin) {
    redirect("/");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <Workflow size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Fluxo do Sistema</h1>
          <p className="text-sm text-gray-500">
            Exemplo guiado, passo a passo, de como um atendimento nasce e chega até o cliente.
          </p>
        </div>
      </div>

      <FluxoSistema />
    </main>
  );
}
