"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NOME_COOKIE_USUARIO, validarCookieSessao, type SessaoUsuario } from "@/lib/auth-usuario";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { buscarCertificadosAdmin, type CertificadoAdmin } from "@/lib/admin";

export type ResultadoAdmin = { sucesso: true } | { sucesso: false; erro: string };

/** Confere de novo, na Server Action, que quem está chamando é admin -
 * a página /admin já é escondida de quem não é admin, mas uma Server
 * Action pode em teoria ser chamada direto (é só uma URL de POST por
 * baixo), então NUNCA confia só no botão estar escondido na tela. */
async function exigirAdmin(): Promise<SessaoUsuario> {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao || !sessao.ehAdmin) {
    throw new Error("Essa ação é restrita ao administrador.");
  }
  return sessao;
}

type ClienteAdmin = ReturnType<typeof criarClienteAdmin>;

/** Apaga um arquivo do Storage a partir da URL PÚBLICA guardada no banco -
 * mesma técnica já usada em `removerAnexoEmbarque` (anexosActions.ts):
 * extrai o caminho de dentro da própria URL em vez de tentar remontar.
 * "Best effort" de propósito - se o arquivo já não existir mais lá (ou o
 * campo vier vazio), não trava a exclusão do registro no banco por causa
 * disso, só ignora e segue. */
async function removerArquivoPublico(admin: ClienteAdmin, bucket: string, urlPublica: string | null) {
  if (!urlPublica) return;
  const marcador = `/storage/v1/object/public/${bucket}/`;
  const indice = urlPublica.indexOf(marcador);
  if (indice === -1) return;
  const caminho = decodeURIComponent(urlPublica.slice(indice + marcador.length));
  try {
    await admin.storage.from(bucket).remove([caminho]);
  } catch {
    // arquivo já não existia, ou storage indisponível no momento - não é
    // motivo pra impedir a limpeza do registro no banco
  }
}

/** Apaga um embarque de teste/errado E tudo que depende dele (RDOs,
 * anexos/relatório de embarque, recados) - inclusive os ARQUIVOS no
 * Storage, não só as linhas do banco. Não tem como desfazer depois. */
export async function excluirEmbarque(embarqueId: string): Promise<ResultadoAdmin> {
  try {
    await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!embarqueId) return { sucesso: false, erro: "Embarque não identificado." };

  const admin = criarClienteAdmin();

  const [{ data: rdos }, { data: anexos }] = await Promise.all([
    admin.from("rdos").select("arquivo_pdf_url").eq("embarque_id", embarqueId),
    admin.from("anexos_embarque").select("url_nuvem").eq("embarque_id", embarqueId),
  ]);

  await Promise.all([
    ...(rdos || []).map((r) => removerArquivoPublico(admin, "rdos-pdf", r.arquivo_pdf_url)),
    ...(anexos || []).map((a) => removerArquivoPublico(admin, "relatorios-assinados", a.url_nuvem)),
  ]);

  // ordem importa: primeiro quem referencia o embarque, só depois o
  // embarque em si (não tem chave estrangeira configurada no Postgres pra
  // fazer isso sozinho via CASCADE - o cuidado é manual, aqui)
  await admin.from("rdos").delete().eq("embarque_id", embarqueId);
  await admin.from("anexos_embarque").delete().eq("embarque_id", embarqueId);
  await admin.from("recados_embarque").delete().eq("embarque_id", embarqueId);

  const { error } = await admin.from("embarques").delete().eq("id", embarqueId);
  if (error) return { sucesso: false, erro: `Não consegui excluir o embarque: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/embarques/ativos");
  revalidatePath("/historico");
  return { sucesso: true };
}

/** Apaga uma obra (plataforma/projeto) que não tem mais uso - lixo de
 * teste, duplicata, etc. Só deixa excluir se NENHUM embarque estiver
 * apontando pra ela (`obra_id`) - diferente de `excluirEmbarque`, não
 * faz cascata pra baixo: se tem embarque vinculado, quem exclui esses
 * embarques primeiro é a seção Embarques acima, de propósito (excluir
 * uma obra nunca deve levar embarque de verdade junto por engano). */
export async function excluirObra(obraId: string): Promise<ResultadoAdmin> {
  try {
    await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!obraId) return { sucesso: false, erro: "Obra não identificada." };

  const admin = criarClienteAdmin();

  const { count } = await admin.from("embarques").select("id", { count: "exact", head: true }).eq("obra_id", obraId);
  if ((count ?? 0) > 0) {
    return {
      sucesso: false,
      erro: `Essa obra ainda tem ${count} embarque(s) vinculado(s) - exclua (ou mova) os embarques primeiro, na seção Embarques acima.`,
    };
  }

  await admin.from("obra_referencias").delete().eq("obra_id", obraId);
  const { error } = await admin.from("obras").delete().eq("id", obraId);
  if (error) return { sucesso: false, erro: `Não consegui excluir a obra: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/relatorios");
  revalidatePath("/historico");
  return { sucesso: true };
}

/** Apaga um usuário do sistema (desktop + web, é a mesma tabela). Trava
 * duas situações perigosas: a pessoa se auto-excluir sem querer, e ficar
 * sem NENHUM admin sobrando (o que trancaria esse próprio painel). */
export async function excluirUsuario(usuarioLogin: string): Promise<ResultadoAdmin> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!usuarioLogin) return { sucesso: false, erro: "Usuário não identificado." };
  if (usuarioLogin.toLowerCase() === sessao.usuario.toLowerCase()) {
    return { sucesso: false, erro: "Você não pode excluir a própria conta enquanto está logado com ela." };
  }

  const admin = criarClienteAdmin();

  const { data: alvo } = await admin.from("usuarios").select("eh_admin").eq("usuario", usuarioLogin).maybeSingle();
  if (alvo?.eh_admin) {
    const { count } = await admin.from("usuarios").select("usuario", { count: "exact", head: true }).eq("eh_admin", true);
    if ((count ?? 0) <= 1) {
      return { sucesso: false, erro: "Esse é o único administrador do sistema - não dá pra excluir (ninguém mais poderia gerenciar usuários depois)." };
    }
  }

  await admin.from("presenca").delete().eq("usuario", usuarioLogin);
  const { error } = await admin.from("usuarios").delete().eq("usuario", usuarioLogin);
  if (error) return { sucesso: false, erro: `Não consegui excluir: ${error.message}` };

  revalidatePath("/admin");
  return { sucesso: true };
}

/** Apaga um certificado PRA VALER (diferente do fluxo normal do sistema,
 * que só marca `excluido=true` e mantém a linha pra histórico/auditoria -
 * esse aqui é só pro admin limpar lançamento de teste/duplicado errado
 * mesmo, sem deixar rastro). */
export async function excluirCertificado(certificadoId: string): Promise<ResultadoAdmin> {
  try {
    await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!certificadoId) return { sucesso: false, erro: "Certificado não identificado." };

  const admin = criarClienteAdmin();
  const { error } = await admin.from("certificados").delete().eq("id", certificadoId);
  if (error) return { sucesso: false, erro: `Não consegui excluir: ${error.message}` };

  revalidatePath("/admin");
  return { sucesso: true };
}

/** Mesmo esquema de ID usado em `gerarIdAnexo` (anexosActions.ts) e em
 * `gerar_id_global()` no desktop (modulos/rdo/database.py): horário atual
 * em milissegundos + dígitos aleatórios no final. Serve pra gerar o `id`
 * de `historico_embarque` - essa tabela NÃO tem autoincrement no Postgres
 * (o id é gerado pela aplicação, igual todas as outras tabelas do RDO),
 * então nunca dá pra deixar o banco gerar sozinho aqui. */
function gerarIdHistoricoEmbarque(): string {
  const agora = Date.now().toString();
  const sufixo = Math.floor(100000 + Math.random() * 900000).toString();
  return `${agora}${sufixo}`;
}

export type StatusFinalEmbarque = "completo" | "com_pendencia";

/** Encerra pela web um embarque que a pessoa esqueceu de encerrar no
 * desktop (caso real do Eduardo, 20/09) - espelha exatamente o que
 * `encerrar_embarque()` já faz no desktop (modulos/rdo/database.py):
 * ativo=false, data_fim, status_final, justificativa_encerramento, mais
 * uma linha em historico_embarque com evento "encerrado", pro rastro
 * ficar igual não importa de onde o encerramento veio.
 *
 * IMPORTANTE (ler antes de mexer): fechar por aqui NÃO chega sozinho no
 * computador da pessoa (o desktop só sincroniza embarque local -> nuvem,
 * nunca o contrário, hoje) - esse é só o lado "admin fecha pela web" do
 * ajuste. O lado "o desktop passa a saber que foi fechado" é uma
 * atualização separada no SyncERP (puxar o status da nuvem antes de
 * deixar lançar RDO), combinada em conversa com o Rafael em 20/09.
 * Existe também uma trava direto no banco (trigger `proteger_reabertura_embarque`,
 * migration `proteger_reabertura_embarque_sem_reabertura_registrada`) que
 * recusa qualquer tentativa de virar ativo=false -> true sem um evento
 * "reaberto" correspondente em historico_embarque - isso é o que impede
 * uma sincronização desatualizada de reabrir escondido um embarque que
 * foi encerrado por aqui. */
export async function encerrarEmbarque(
  embarqueId: string,
  dataFim: string,
  statusFinal: StatusFinalEmbarque,
  justificativa: string
): Promise<ResultadoAdmin> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }
  if (!embarqueId) return { sucesso: false, erro: "Embarque não identificado." };
  if (!dataFim) return { sucesso: false, erro: "Informe a data de encerramento." };
  if (statusFinal !== "completo" && statusFinal !== "com_pendencia") {
    return { sucesso: false, erro: "Situação final inválida." };
  }
  if (!justificativa || !justificativa.trim()) {
    return { sucesso: false, erro: "A justificativa é obrigatória - explique por que está encerrando pela web." };
  }

  const admin = criarClienteAdmin();

  const { data: embarque } = await admin
    .from("embarques")
    .select("ativo")
    .eq("id", embarqueId)
    .maybeSingle();
  if (!embarque) return { sucesso: false, erro: "Embarque não encontrado." };
  if (!embarque.ativo) return { sucesso: false, erro: "Esse embarque já está encerrado." };

  const { error: erroEmbarque } = await admin
    .from("embarques")
    .update({
      ativo: false,
      data_fim: dataFim,
      status_final: statusFinal,
      justificativa_encerramento: justificativa.trim(),
    })
    .eq("id", embarqueId);
  if (erroEmbarque) return { sucesso: false, erro: `Não consegui encerrar: ${erroEmbarque.message}` };

  try {
    await admin.from("historico_embarque").insert({
      id: gerarIdHistoricoEmbarque(),
      embarque_id: embarqueId,
      evento: "encerrado",
      data_evento: new Date().toISOString(),
      usuario: sessao.nome,
      justificativa: justificativa.trim(),
    });
  } catch {
    // não trava o encerramento por causa do registro de histórico - o
    // embarque já fechou, que é o que importa; o rastro é um extra
  }

  revalidatePath("/admin");
  revalidatePath("/embarques/ativos");
  revalidatePath("/historico");
  revalidatePath("/relatorios");
  return { sucesso: true };
}

/** Wrapper "use server" pra buscar certificados a partir do componente
 * client do painel (busca em tempo real, sem recarregar a página) - a
 * leitura em si mora em lib/admin.ts, aqui só confere admin e repassa. */
export async function buscarCertificadosParaAdmin(busca: string): Promise<CertificadoAdmin[]> {
  try {
    await exigirAdmin();
  } catch {
    return [];
  }
  return buscarCertificadosAdmin(busca);
}

/** Zera TUDO do módulo de Certificados na nuvem (colaboradores, tipos,
 * certificados lançados e numeração NR/PE) - pro Rafael reimportar do
 * zero quando a Angélica mandar as planilhas atualizadas, sem misturar
 * com o que já existe. Não mexe na tabela auditoria_certificados de
 * propósito (fica o rastro de que a limpeza aconteceu, e quando).
 *
 * IMPORTANTE (avisar sempre que usar): isso limpa só a NUVEM. O banco
 * LOCAL de cada instalação do desktop (`modulos/certificados/certificados.db`)
 * continua com os dados antigos - se alguém sincronizar o desktop ANTES
 * do reimport novo estar pronto na nuvem, os dados antigos voltam
 * (sincronizar sempre reenvia tudo que está local). Melhor reimportar
 * logo em seguida, ou avisar pra não sincronizar Certificados no
 * desktop até o reimport terminar. */
export async function apagarTudoCertificados(): Promise<ResultadoAdmin> {
  let sessao: SessaoUsuario;
  try {
    sessao = await exigirAdmin();
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Acesso negado." };
  }

  const admin = criarClienteAdmin();
  const { error: erroCert } = await admin.from("certificados").delete().neq("id", "0");
  if (erroCert) return { sucesso: false, erro: `Não consegui apagar os certificados: ${erroCert.message}` };
  const { error: erroNum } = await admin.from("numeracao_certificados").delete().neq("id", "0");
  if (erroNum) return { sucesso: false, erro: `Não consegui apagar a numeração: ${erroNum.message}` };
  const { error: erroColab } = await admin.from("colaboradores").delete().neq("id", "0");
  if (erroColab) return { sucesso: false, erro: `Não consegui apagar os colaboradores: ${erroColab.message}` };
  const { error: erroTipos } = await admin.from("tipos_certificado").delete().neq("id", "0");
  if (erroTipos) return { sucesso: false, erro: `Não consegui apagar os tipos: ${erroTipos.message}` };

  try {
    await admin.from("auditoria_certificados").insert({
      id: crypto.randomUUID(),
      quando: new Date().toLocaleString("pt-BR"),
      quando_iso: new Date().toISOString(),
      usuario: sessao.nome,
      acao: "apagou TUDO de certificados (pra reimportar)",
      entidade: "sistema",
      detalhes: "Zerou colaboradores, tipos, certificados e numeração NR/PE pela nuvem, via Painel Admin.",
    });
  } catch {
    // não trava a limpeza por causa do registro de auditoria
  }

  revalidatePath("/admin");
  revalidatePath("/certificados");
  return { sucesso: true };
}
