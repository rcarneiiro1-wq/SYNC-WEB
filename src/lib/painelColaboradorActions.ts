"use server";

import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { resolverColaboradorDoUsuario, buscarDiariasColaborador, type DiariasColaborador } from "@/lib/painelColaborador";
import type { Periodo } from "@/lib/relatorios";

export type ResultadoMeuPainel =
  | { vinculado: true; nome: string; dados: DiariasColaborador }
  | { vinculado: false };

/**
 * Busca as diárias de QUEM ESTIVER LOGADO agora - a identidade vem
 * sempre do cookie de sessão, validado de novo aqui dentro (nunca de um
 * "colaboradorId" vindo como parâmetro do cliente). É isso que garante
 * que ninguém, nem mexendo direto no JavaScript do navegador, consiga
 * pedir o painel de outra pessoa - só o período (datas) vem do cliente,
 * e isso sozinho não vaza dado de ninguém.
 */
export async function buscarMeuPainel(periodo: Periodo): Promise<ResultadoMeuPainel> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) {
    throw new Error("Sessão expirada - atualiza a página e loga de novo.");
  }

  const colaborador = await resolverColaboradorDoUsuario(sessao.usuario);
  if (!colaborador) {
    return { vinculado: false };
  }

  const dados = await buscarDiariasColaborador(colaborador.colaboradorId, periodo);
  return { vinculado: true, nome: colaborador.nome, dados };
}
