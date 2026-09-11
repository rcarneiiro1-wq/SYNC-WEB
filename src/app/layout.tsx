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

  // 11/09: mesma lógica do proxy.ts, de novo aqui como segunda camada -
  // quem só tem "painel_colaborador" nunca deveria alcançar nenhuma
  // página desse grupo (é tudo tela de gerência), então nem chega a
  // montar a Sidebar pra essa pessoa.
  const ehSoColaborador =
    !sessao.ehAdmin &&
    !sessao.permissoes?.includes("acesso_web") &&
    Boolean(sessao.permissoes?.includes("painel_colaborador"));
  if (ehSoColaborador) {
    redirect("/meu-painel");
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
      <div className="flex-1 min-w-0 pt-14 md:pt-0 print:pt-0 flex flex-col">
        <div className="flex-1 min-w-0">{children}</div>

        {/* 11/09: aviso de uso monitorado - junto com o rastro de
            navegação que passou a ser gravado (ver proxy.ts). Fica em
            toda tela logada, discreto, sem atrapalhar a impressão. */}
        <p className="print:hidden text-[11px] text-gray-300 text-center px-4 py-3">
          O uso deste sistema é monitorado (login e navegação).
        </p>
      </div>
    </div>
  );
}
