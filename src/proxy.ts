import { NextRequest, NextResponse } from "next/server";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // a própria página de login (e os recursos estáticos) não passam pela trava
  if (pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(NOME_COOKIE_USUARIO)?.value;
  const sessao = await validarCookieSessao(cookie);

  if (sessao) {
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
