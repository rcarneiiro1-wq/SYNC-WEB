"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOME_COOKIE } from "@/lib/auth";

export async function sair() {
  const jar = await cookies();
  jar.delete(NOME_COOKIE);
  redirect("/login");
}
