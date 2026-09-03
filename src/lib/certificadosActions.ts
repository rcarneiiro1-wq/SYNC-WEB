"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NOME_COOKIE_USUARIO, validarCookieSessao, type SessaoUsuario } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";

export type ResultadoCertificados = { sucesso: true } | { sucesso: false; erro: string };

/** Confere de novo, na Server Action, que quem está chamando tem a
 * permissão "certificados" (ou é admin, que tem tudo) - mesma ideia do
 * `exigirAdmin()` de adminActions.ts: nunca confiar só no link/botão
 * estar escondido na tela. */
async function exigirAcessoCertificados(): Promise<SessaoUsuario> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) throw new Error("Sessão inválida - faça login de novo.");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("certificados")) {
    throw new Error("Você não tem acesso ao módulo de Certificados.");
  }
  return sessao;
}

function agoraBr(): { data: string; iso: string } {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, "0");
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const hh = String(agora.getHours()).padStart(2, "0");
  const min = String(agora.getMinutes()).padStart(2, "0");
  return { data: `${dd}/${mm}/${agora.getFullYear()} ${hh}:${min}`, iso: agora.toISOString() };
}

/** Toda ação relevante passa por aqui - mesmo padrão de auditoria já
 * usado no desktop (`registrar_auditoria` em modulos/certificados/database.py),
 * gravando direto na tabela que já existe e já sincroniza pros dois lados
 * (`auditoria_certificados`). Best-effort: se falhar, não trava a ação
 * principal (é só o registro de histórico, não o dado em si). */
async function registrarAuditoria(
  admin: ReturnType<typeof criarClienteAdmin>,
  usuario: string,
  acao: string,
  entidade: string,
  entidadeId?: string | null,
  detalhes?: string | null
) {
  const { data: quando, iso: quandoIso } = agoraBr();
  try {
    await admin.from("auditoria_certificados").insert({
      id: randomUUID(),
      quando,
      quando_iso: quandoIso,
      usuario,
      acao,
      entidade,
      entidade_id: entidadeId ? Number(entidadeId) : null,
      detalhes: detalhes || null,
    });
  } catch {
    // não trava a ação principal por causa da auditoria
  }
}

function gerarIdGlobal(): string {
  // mesma ideia do `gerar_id_global()` do desktop (timestamp em ms + 6
  // dígitos aleatórios) - id novo criado pelo SITE, então também precisa
  // nunca colidir com o que qualquer instalação desktop já gerou.
  return `${Date.now()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
}

// ---------- COLABORADORES ----------

export type DadosColaborador = {
  nome: string;
  cpf?: string | null;
  empresa?: string | null;
  localTrabalho?: string | null;
};

export async function salvarColaborador(
  dados: DadosColaborador,
  colaboradorId?: string | null
): Promise<ResultadoCertificados & { id?: string }> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!dados.nome?.trim()) return { sucesso: false, erro: "Nome é obrigatório." };

  const admin = criarClienteAdmin();
  const linha = {
    nome: dados.nome.trim(),
    cpf: dados.cpf || null,
    empresa: dados.empresa || null,
    local_trabalho: dados.localTrabalho || null,
  };

  if (colaboradorId) {
    const { error } = await admin.from("colaboradores").update(linha).eq("id", colaboradorId);
    if (error) return { sucesso: false, erro: `Não consegui salvar: ${error.message}` };
    await registrarAuditoria(admin, sessao.nome, "editou colaborador", "colaborador", colaboradorId, dados.nome);
    revalidatePath("/certificados");
    revalidatePath("/certificados/colaboradores");
    return { sucesso: true, id: colaboradorId };
  }

  const novoId = gerarIdGlobal();
  const criadoEm = agoraBr().data.split(" ")[0];
  const { error } = await admin.from("colaboradores").insert({
    id: novoId, ...linha, eh_usuario_sistema: false, ativo: true, criado_em: criadoEm,
  });
  if (error) return { sucesso: false, erro: `Não consegui criar: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, "criou colaborador", "colaborador", novoId, dados.nome);
  revalidatePath("/certificados");
  revalidatePath("/certificados/colaboradores");
  return { sucesso: true, id: novoId };
}

export async function definirAtivoColaborador(colaboradorId: string, ativo: boolean): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  const admin = criarClienteAdmin();
  const { error } = await admin.from("colaboradores").update({ ativo }).eq("id", colaboradorId);
  if (error) return { sucesso: false, erro: `Não consegui atualizar: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, ativo ? "reativou colaborador" : "desativou colaborador", "colaborador", colaboradorId);
  revalidatePath("/certificados/colaboradores");
  return { sucesso: true };
}

/** Junta dois cadastros duplicados: move certificados e numeração do
 * "remover" pro "manter", e arquiva o "remover" (não apaga - só marca
 * inativo). Mesma lógica de `mesclar_colaboradores()` do desktop. */
export async function mesclarColaboradores(manterId: string, removerId: string): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!manterId || !removerId) return { sucesso: false, erro: "Escolha os dois colaboradores." };
  if (manterId === removerId) return { sucesso: false, erro: "Não dá pra mesclar um colaborador com ele mesmo." };

  const admin = criarClienteAdmin();
  const { data: removido } = await admin.from("colaboradores").select("nome").eq("id", removerId).maybeSingle();
  const { data: mantido } = await admin.from("colaboradores").select("nome").eq("id", manterId).maybeSingle();
  if (!removido || !mantido) return { sucesso: false, erro: "Um dos colaboradores não foi encontrado." };

  const { count: qtdCert } = await admin
    .from("certificados").select("id", { count: "exact", head: true }).eq("colaborador_id", removerId);
  await admin.from("certificados").update({ colaborador_id: manterId }).eq("colaborador_id", removerId);

  const { count: qtdNum } = await admin
    .from("numeracao_certificados").select("id", { count: "exact", head: true }).eq("colaborador_id", removerId);
  await admin.from("numeracao_certificados").update({ colaborador_id: manterId }).eq("colaborador_id", removerId);

  const { error } = await admin.from("colaboradores").update({ ativo: false }).eq("id", removerId);
  if (error) return { sucesso: false, erro: `Não consegui mesclar: ${error.message}` };

  const detalhes = `Mesclou "${removido.nome}" neste cadastro - ${qtdCert ?? 0} certificado(s) e ${qtdNum ?? 0} numeração(ões) movidos.`;
  await registrarAuditoria(admin, sessao.nome, "mesclou colaborador (recebeu)", "colaborador", manterId, detalhes);
  await registrarAuditoria(admin, sessao.nome, "mesclou colaborador (arquivado)", "colaborador", removerId, `Arquivado - dados movidos pra "${mantido.nome}".`);

  revalidatePath("/certificados");
  revalidatePath("/certificados/colaboradores");
  return { sucesso: true };
}

// ---------- TIPOS DE CERTIFICADO ----------

export type DadosTipo = {
  nome: string;
  cargaHoraria?: string | null;
  validadeAnos?: number | null;
  categoria?: string | null;
};

export async function salvarTipoCertificado(dados: DadosTipo, tipoId?: string | null): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!dados.nome?.trim()) return { sucesso: false, erro: "Nome é obrigatório." };

  const admin = criarClienteAdmin();
  const linha = {
    nome: dados.nome.trim(),
    carga_horaria: dados.cargaHoraria || null,
    validade_anos: dados.validadeAnos || null,
    categoria: dados.categoria || null,
  };

  if (tipoId) {
    const { error } = await admin.from("tipos_certificado").update(linha).eq("id", tipoId);
    if (error) return { sucesso: false, erro: `Não consegui salvar: ${error.message}` };
    await registrarAuditoria(admin, sessao.nome, "editou tipo de certificado", "tipo_certificado", tipoId, dados.nome);
  } else {
    const novoId = gerarIdGlobal();
    const { error } = await admin.from("tipos_certificado").insert({ id: novoId, ...linha });
    if (error) return { sucesso: false, erro: `Não consegui criar: ${error.message}` };
    await registrarAuditoria(admin, sessao.nome, "criou tipo de certificado", "tipo_certificado", novoId, dados.nome);
  }
  revalidatePath("/certificados");
  revalidatePath("/certificados/tipos");
  revalidatePath("/certificados/lancar");
  return { sucesso: true };
}

// ---------- CERTIFICADOS ----------

export type DadosCertificado = {
  colaboradorId: string;
  tipoId: string;
  empresa?: string | null;
  numero?: string | null;
  dataEmissao?: string | null;
  dataVencimento?: string | null;
};

export async function salvarCertificado(
  dados: DadosCertificado,
  certificadoId?: string | null
): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!dados.colaboradorId || !dados.tipoId) {
    return { sucesso: false, erro: "Escolha o colaborador e o tipo de certificado." };
  }

  const admin = criarClienteAdmin();
  const linha = {
    colaborador_id: dados.colaboradorId,
    tipo_id: dados.tipoId,
    empresa: dados.empresa || null,
    numero: dados.numero || null,
    data_emissao: dados.dataEmissao || null,
    data_vencimento: dados.dataVencimento || null,
  };

  if (certificadoId) {
    const { data: anterior } = await admin
      .from("certificados").select("data_vencimento").eq("id", certificadoId).maybeSingle();
    const { error } = await admin.from("certificados").update(linha).eq("id", certificadoId);
    if (error) return { sucesso: false, erro: `Não consegui salvar: ${error.message}` };
    const detalhes = (anterior?.data_vencimento || "") !== (dados.dataVencimento || "")
      ? `Vencimento: ${anterior?.data_vencimento || "-"} → ${dados.dataVencimento || "-"}`
      : "Editou os dados do certificado.";
    await registrarAuditoria(admin, sessao.nome, "editou certificado", "certificado", certificadoId, detalhes);
  } else {
    const novoId = gerarIdGlobal();
    const { error } = await admin.from("certificados").insert({ id: novoId, ...linha, excluido: false });
    if (error) return { sucesso: false, erro: `Não consegui lançar: ${error.message}` };
    await registrarAuditoria(admin, sessao.nome, "lançou certificado", "certificado", novoId, `Vencimento: ${dados.dataVencimento || "-"}`);
  }
  revalidatePath("/certificados");
  revalidatePath("/certificados/lancar");
  return { sucesso: true };
}

/** Não apaga de verdade - manda pra Lixeira (recuperável por 15 dias),
 * igual `excluir_certificado()` do desktop. */
export async function excluirCertificado(certificadoId: string): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!certificadoId) return { sucesso: false, erro: "Certificado não identificado." };

  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("certificados")
    .update({ excluido: true, excluido_em: agoraBr().data })
    .eq("id", certificadoId);
  if (error) return { sucesso: false, erro: `Não consegui excluir: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, "excluiu certificado (foi pra lixeira)", "certificado", certificadoId);
  revalidatePath("/certificados");
  return { sucesso: true };
}

export async function restaurarCertificado(certificadoId: string): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("certificados")
    .update({ excluido: false, excluido_em: null })
    .eq("id", certificadoId);
  if (error) return { sucesso: false, erro: `Não consegui restaurar: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, "restaurou certificado (saiu da lixeira)", "certificado", certificadoId);
  revalidatePath("/certificados");
  return { sucesso: true };
}

/** Excluir DE VEZ direto da Lixeira (antes dos 15 dias, se a pessoa
 * tiver certeza) - diferente de `excluirCertificado`, aqui não tem
 * volta nenhuma. */
export async function excluirCertificadoDefinitivo(certificadoId: string): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  const admin = criarClienteAdmin();
  const { error } = await admin.from("certificados").delete().eq("id", certificadoId).eq("excluido", true);
  if (error) return { sucesso: false, erro: `Não consegui excluir: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, "excluiu certificado (definitivo, da lixeira)", "certificado", certificadoId);
  revalidatePath("/certificados");
  return { sucesso: true };
}

// ---------- NUMERAÇÃO NR/PE ----------

export type DadosNumeracao = {
  categoria: string;
  numero: string;
  descricao?: string | null;
  dataEmissao?: string | null;
  validade?: string | null;
  colaboradorId?: string | null;
};

export async function salvarNumeracao(dados: DadosNumeracao): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!dados.categoria || !dados.numero) return { sucesso: false, erro: "Categoria e número são obrigatórios." };

  const admin = criarClienteAdmin();
  const novoId = gerarIdGlobal();
  const { error } = await admin.from("numeracao_certificados").insert({
    id: novoId,
    categoria: dados.categoria,
    numero: dados.numero,
    descricao: dados.descricao || null,
    data_emissao: dados.dataEmissao || null,
    validade: dados.validade || null,
    colaborador_id: dados.colaboradorId || null,
  });
  if (error) return { sucesso: false, erro: `Não consegui lançar: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, "lançou numeração", "numeracao", novoId, `${dados.categoria} ${dados.numero}`);
  revalidatePath("/certificados/numeracao");
  return { sucesso: true };
}

export async function excluirNumeracao(numeracaoId: string): Promise<ResultadoCertificados> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAcessoCertificados();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  const admin = criarClienteAdmin();
  const { error } = await admin.from("numeracao_certificados").delete().eq("id", numeracaoId);
  if (error) return { sucesso: false, erro: `Não consegui excluir: ${error.message}` };
  await registrarAuditoria(admin, sessao.nome, "excluiu numeração", "numeracao", numeracaoId);
  revalidatePath("/certificados/numeracao");
  return { sucesso: true };
}
