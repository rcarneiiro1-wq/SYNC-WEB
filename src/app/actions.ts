"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOME_COOKIE_USUARIO } from "@/lib/auth-usuario";

export async function sair() {
  const jar = await cookies();
  jar.delete(NOME_COOKIE_USUARIO);
  redirect("/login");
}
