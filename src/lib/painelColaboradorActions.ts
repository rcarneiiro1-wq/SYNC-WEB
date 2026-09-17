"use server";

import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import {
  resolverColaboradorDoUsuario,
  buscarDiariasColaborador,
  buscarDocumentosColaborador,
  type DiariasColaborador,
  type MeusDocumentos,
} from "@/lib/painelColaborador";
import type { Periodo } from "@/lib/relatorios";

export type ResultadoMeuPainel =
  | { vinculado: true; nome: string; dados: DiariasColaborador }
  | { vinculado: false };

export type ResultadoMeusDocumentos =
  | { vinculado: true; dados: MeusDocumentos }
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

/**
 * Busca os RDOs e Relatórios de Embarque de QUEM ESTIVER LOGADO agora
 * (17/09) - mesma identidade resolvida pelo cookie de sessão, nunca por
 * parâmetro do cliente (mesma garantia de `buscarMeuPainel` acima).
 * Chamada SEPARADA da diária de propósito: os documentos não dependem do
 * período escolhido na tela (mostra o histórico completo do colaborador),
 * então não faz sentido buscar de novo toda vez que a pessoa troca de mês.
 */
export async function buscarMeusDocumentos(): Promise<ResultadoMeusDocumentos> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) {
    throw new Error("Sessão expirada - atualiza a página e loga de novo.");
  }

  const colaborador = await resolverColaboradorDoUsuario(sessao.usuario);
  if (!colaborador) {
    return { vinculado: false };
  }

  const dados = await buscarDocumentosColaborador(colaborador.colaboradorId);
  return { vinculado: true, dados };
}
