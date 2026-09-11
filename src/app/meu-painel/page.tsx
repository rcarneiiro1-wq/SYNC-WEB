import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { PainelColaboradorConteudo } from "@/components/PainelColaboradorConteudo";

export const dynamic = "force-dynamic";

/**
 * Painel próprio do colaborador (ideia de 11/09) - de propósito FORA do
 * grupo de rotas (app) (não usa `app/(app)/layout.tsx`), pra nunca herdar
 * a Sidebar nem qualquer navegação de gerência. Essa página é só isso:
 * o cabeçalho e o conteúdo montados aqui dentro, mais nada.
 *
 * A restrição "só vê o SEU dado" não é feita aqui (é feita dentro da
 * Server Action `buscarMeuPainel`, que resolve a identidade a partir do
 * cookie de novo, nunca confiando em nada vindo do cliente) - essa
 * página só confere que existe uma sessão válida, igual toda outra
 * página do site.
 */
export default async function PaginaMeuPainel() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login?proximo=/meu-painel");

  return <PainelColaboradorConteudo nomeSessao={sessao.nome} />;
}
