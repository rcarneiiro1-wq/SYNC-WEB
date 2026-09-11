import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { registrarNavegacao } from "@/lib/historicoNavegacao";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // a própria página de login (e os recursos estáticos) não passam pela trava
  if (pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(NOME_COOKIE_USUARIO)?.value;
  const sessao = await validarCookieSessao(cookie);

  if (sessao) {
    // 11/09: rastro de navegação pro Rafael (painel /admin, só ele vê) -
    // não conta chamada de /api (download de arquivo etc.), só troca de
    // tela de verdade. `event.waitUntil` deixa a gravação terminar em
    // segundo plano, sem atrasar em nada a resposta pra quem tá navegando.
    if (!pathname.startsWith("/api/")) {
      event.waitUntil(registrarNavegacao(sessao.usuario, sessao.nome, pathname));
    }

    // 11/09: quem só tem "painel_colaborador" (sem ser admin, sem
    // "acesso_web") NUNCA pode alcançar o resto do site de gerência -
    // nem digitando a URL na mão. Essa é a trava principal (a segunda
    // camada, mais fraca, fica em app/(app)/layout.tsx). Fica de fora
    // dessa trava só a própria /meu-painel e as chamadas de /api que a
    // página dela eventualmente precise.
    const ehSoColaborador =
      !sessao.ehAdmin &&
      !sessao.permissoes?.includes("acesso_web") &&
      Boolean(sessao.permissoes?.includes("painel_colaborador"));
    if (ehSoColaborador && !pathname.startsWith("/meu-painel") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/meu-painel", request.url));
    }

    return NextResponse.next();
  }

  const urlLogin = new URL("/login", request.url);
  urlLogin.searchParams.set("proximo", pathname);
  return NextResponse.redirect(urlLogin);
}

export const config = {
  // além do login e dos internos do Next, deixa passar direto qualquer
  // arquivo estático de public/ (logo, ícones, imagens) - sem isso, a
  // logo na PRÓPRIA tela de login era barrada pelo middleware (pedia
  // login pra carregar a imagem, e virava ícone de "imagem quebrada"
  // bem na tela que deveria estar mostrando ela)
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
