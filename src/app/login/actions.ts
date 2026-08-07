"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOME_COOKIE, senhaEstaCorreta, valorEsperadoDoCookie } from "@/lib/auth";

export async function entrar(formData: FormData) {
  const senha = String(formData.get("senha") || "");
  const proximo = String(formData.get("proximo") || "/");

  const correta = await senhaEstaCorreta(senha);
  if (!correta) {
    redirect(`/login?erro=1&proximo=${encodeURIComponent(proximo)}`);
  }

  const valor = await valorEsperadoDoCookie();
  const jar = await cookies();
  jar.set(NOME_COOKIE, valor, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias - não precisa logar de novo toda hora
    path: "/",
  });

  redirect(proximo || "/");
}
