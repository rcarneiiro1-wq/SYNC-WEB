import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { sair } from "@/app/actions";
import { Sidebar } from "@/components/Sidebar";

/** Layout de TODAS as páginas autenticadas (tudo, exceto /login) - é aqui
 * que a sidebar nasce, uma vez só, em vez de cada página cuidar disso. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  // o middleware (proxy.ts) já deveria ter barrado isso antes de chegar
  // aqui, mas confere de novo - nunca custa ter as duas camadas
  if (!sessao) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        nome={sessao.nome}
        funcao={sessao.funcao}
        sair={sair}
        ehAdmin={sessao.ehAdmin}
        temAcessoEmbarques={sessao.ehAdmin || Boolean(sessao.permissoes?.includes("gerenciamento_embarques"))}
        temAcessoCertificados={sessao.ehAdmin || Boolean(sessao.permissoes?.includes("certificados"))}
      />
      {/* 03/09: pt-14 no celular só pra não ficar embaixo da barra fixa
          (hambúrguer) que a Sidebar passou a desenhar nessa largura -
          some no desktop (md:pt-0, onde não existe barra fixa nenhuma)
          e na impressão (a barra já nem aparece, mas o respiro também não
          deve aparecer no papel). */}
      <div className="flex-1 min-w-0 pt-14 md:pt-0 print:pt-0">{children}</div>
    </div>
  );
}
