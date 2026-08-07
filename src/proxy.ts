import { NextRequest, NextResponse } from "next/server";
import { NOME_COOKIE, valorEsperadoDoCookie } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // a própria página de login (e os recursos estáticos) não passam pela trava
  if (pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(NOME_COOKIE)?.value;
  const esperado = await valorEsperadoDoCookie();

  if (cookie === esperado) {
    return NextResponse.next();
  }

  const urlLogin = new URL("/login", request.url);
  urlLogin.searchParams.set("proximo", pathname);
  return NextResponse.redirect(urlLogin);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
