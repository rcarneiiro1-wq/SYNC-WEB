import { supabase } from "@/lib/supabase";

// Leituras usadas só pelo Painel Admin (/admin) - não tem relação de chave
// estrangeira configurada no Postgres entre essas tabelas (é tudo ligado
// por bigint "solto", igual o resto do sistema - ver aviso em embarques.ts
// sobre IDs grandes), então os "joins" aqui são feitos à mão em memória,
// igual o padrão já usado em `buscarEmbarquesAtivos`/`buscarEmbarquesFinalizados`.

export type EmbarqueAdmin = {
  id: string;
  obraNome: string | null;
  obraEmpresa: string | null;
  efetivoNome: string | null;
  efetivoFuncao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  ativo: boolean;
  statusFinal: string | null;
  totalRdos: number;
  totalAnexos: number;
};

/** Todos os embarques (ativos e finalizados) com contagem de RDOs/anexos -
 * pro admin enxergar tudo de uma vez e decidir o que é teste/lixo. */
export async function buscarEmbarquesAdmin(): Promise<EmbarqueAdmin[]> {
  const { data: embarquesRaw, error } = await supabase
    .from("embarques")
    .select("id::text, obra_id::text, obra_nome, efetivo_nome, efetivo_funcao, data_inicio, data_fim, ativo, status_final")
    .order("data_inicio", { ascending: false });
  if (error) throw new Error(`Não consegui buscar os embarques: ${error.message}`);
  const embarques = (embarquesRaw || []) as unknown as {
    id: string; obra_id: string | null; obra_nome: string | null; efetivo_nome: string | null;
    efetivo_funcao: string | null; data_inicio: string | null; data_fim: string | null;
    ativo: boolean; status_final: string | null;
  }[];
  if (embarques.length === 0) return [];

  const idsEmbarques = embarques.map((e) => e.id);
  const idsObras = Array.from(new Set(embarques.map((e) => e.obra_id).filter((v): v is string => Boolean(v))));

  const [{ data: obrasRaw }, { data: rdosRaw }, { data: anexosRaw }] = await Promise.all([
    supabase.from("obras").select("id::text, empresa").in("id", idsObras.length ? idsObras : ["-1"]),
    supabase.from("rdos").select("embarque_id::text").in("embarque_id", idsEmbarques),
    supabase.from("anexos_embarque").select("embarque_id::text").in("embarque_id", idsEmbarques),
  ]);

  const empresaPorObra = new Map<string, string | null>(
    ((obrasRaw || []) as unknown as { id: string; empresa: string | null }[]).map((o) => [o.id, o.empresa])
  );
  const contarPor = (linhas: { embarque_id: string }[] | null) => {
    const mapa = new Map<string, number>();
    for (const l of linhas || []) mapa.set(l.embarque_id, (mapa.get(l.embarque_id) || 0) + 1);
    return mapa;
  };
  const totalRdosPorEmbarque = contarPor((rdosRaw || []) as unknown as { embarque_id: string }[]);
  const totalAnexosPorEmbarque = contarPor((anexosRaw || []) as unknown as { embarque_id: string }[]);

  return embarques.map((e) => ({
    id: e.id,
    obraNome: e.obra_nome,
    obraEmpresa: e.obra_id ? empresaPorObra.get(e.obra_id) ?? null : null,
    efetivoNome: e.efetivo_nome,
    efetivoFuncao: e.efetivo_funcao,
    dataInicio: e.data_inicio,
    dataFim: e.data_fim,
    ativo: e.ativo,
    statusFinal: e.status_final,
    totalRdos: totalRdosPorEmbarque.get(e.id) || 0,
    totalAnexos: totalAnexosPorEmbarque.get(e.id) || 0,
  }));
}

export type UsuarioAdmin = {
  usuario: string;
  nome: string;
  funcao: string | null;
  ehAdmin: boolean;
  ativo: boolean;
};

export async function buscarUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("usuario, nome, funcao, eh_admin, ativo")
    .order("nome");
  if (error) throw new Error(`Não consegui buscar os usuários: ${error.message}`);
  return ((data || []) as unknown as { usuario: string; nome: string; funcao: string | null; eh_admin: boolean; ativo: boolean }[]).map(
    (u) => ({ usuario: u.usuario, nome: u.nome, funcao: u.funcao, ehAdmin: Boolean(u.eh_admin), ativo: u.ativo !== false })
  );
}

export type ObraAdmin = {
  id: string;
  nome: string | null;
  empresa: string | null;
  localFlotel: string | null;
  gmCodigo: string | null;
  mdCodigo: string | null;
  totalEmbarques: number;
};

/** Todas as obras cadastradas, com a contagem de embarques que apontam
 * pra cada uma - é essa contagem que decide se dá pra excluir (ver
 * `excluirObra` em adminActions.ts: só deixa excluir obra "órfã", sem
 * nenhum embarque vinculado, pra nunca derrubar embarque nenhum junto
 * por engano). */
export async function buscarObrasAdmin(): Promise<ObraAdmin[]> {
  const { data: obrasRaw, error } = await supabase
    .from("obras")
    .select("id::text, nome, empresa, local_flotel, gm_codigo, md_codigo")
    .order("nome");
  if (error) throw new Error(`Não consegui buscar as obras: ${error.message}`);
  const obras = (obrasRaw || []) as unknown as {
    id: string; nome: string | null; empresa: string | null; local_flotel: string | null;
    gm_codigo: string | null; md_codigo: string | null;
  }[];
  if (obras.length === 0) return [];

  const { data: embarquesRaw } = await supabase.from("embarques").select("obra_id::text");
  const totalPorObra = new Map<string, number>();
  for (const e of (embarquesRaw || []) as unknown as { obra_id: string | null }[]) {
    if (!e.obra_id) continue;
    totalPorObra.set(e.obra_id, (totalPorObra.get(e.obra_id) || 0) + 1);
  }

  return obras.map((o) => ({
    id: o.id,
    nome: o.nome,
    empresa: o.empresa,
    localFlotel: o.local_flotel,
    gmCodigo: o.gm_codigo,
    mdCodigo: o.md_codigo,
    totalEmbarques: totalPorObra.get(o.id) || 0,
  }));
}

export type CertificadoAdmin = {
  id: string;
  colaboradorNome: string;
  colaboradorEmpresa: string | null;
  tipoNome: string;
  numero: string | null;
  dataEmissao: string | null;
  dataVencimento: string | null;
  excluido: boolean;
};

const LIMITE_RESULTADOS_CERTIFICADOS = 100;

/** Busca certificados pelo nome do colaborador - a tabela tem 600+ linhas,
 * então (diferente de embarques/usuários) NÃO carrega tudo de cara, só
 * depois que a pessoa digitar pelo menos 2 letras. */
export async function buscarCertificadosAdmin(busca: string): Promise<CertificadoAdmin[]> {
  const termo = busca.trim();
  if (termo.length < 2) return [];

  const { data: colaboradoresRaw, error: erroColab } = await supabase
    .from("colaboradores")
    .select("id::text, nome, empresa")
    .ilike("nome", `%${termo}%`)
    .limit(50);
  if (erroColab) throw new Error(`Não consegui buscar colaboradores: ${erroColab.message}`);
  const colaboradores = (colaboradoresRaw || []) as unknown as { id: string; nome: string; empresa: string | null }[];
  if (colaboradores.length === 0) return [];
  const colaboradorPorId = new Map(colaboradores.map((c) => [c.id, c]));

  const { data: certificadosRaw, error: erroCert } = await supabase
    .from("certificados")
    .select("id::text, colaborador_id::text, tipo_id::text, numero, data_emissao, data_vencimento, excluido")
    .in("colaborador_id", colaboradores.map((c) => c.id))
    .order("data_vencimento", { ascending: false })
    .limit(LIMITE_RESULTADOS_CERTIFICADOS);
  if (erroCert) throw new Error(`Não consegui buscar certificados: ${erroCert.message}`);
  const certificados = (certificadosRaw || []) as unknown as {
    id: string; colaborador_id: string; tipo_id: string | null; numero: string | null;
    data_emissao: string | null; data_vencimento: string | null; excluido: boolean | null;
  }[];
  if (certificados.length === 0) return [];

  const idsTipos = Array.from(new Set(certificados.map((c) => c.tipo_id).filter((v): v is string => Boolean(v))));
  const { data: tiposRaw } = await supabase.from("tipos_certificado").select("id::text, nome").in("id", idsTipos.length ? idsTipos : ["-1"]);
  const nomePorTipo = new Map(((tiposRaw || []) as unknown as { id: string; nome: string }[]).map((t) => [t.id, t.nome]));

  return certificados.map((c) => {
    const colaborador = colaboradorPorId.get(c.colaborador_id);
    return {
      id: c.id,
      colaboradorNome: colaborador?.nome || "(colaborador não encontrado)",
      colaboradorEmpresa: colaborador?.empresa ?? null,
      tipoNome: (c.tipo_id && nomePorTipo.get(c.tipo_id)) || "-",
      numero: c.numero,
      dataEmissao: c.data_emissao,
      dataVencimento: c.data_vencimento,
      excluido: Boolean(c.excluido),
    };
  });
}
