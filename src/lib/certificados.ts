import { supabase } from "@/lib/supabase";

// Mesmo cuidado de sempre com IDs grandes (ver aviso completo em
// embarques.ts): todo id aqui é `string`, nunca `number` - por isso os
// selects pedem os campos de id com `::text`.

// Prazo de aviso: quantos dias antes do vencimento já conta como "A VENCER" -
// mesma regra do desktop (`DIAS_AVISO_VENCIMENTO` em modulos/certificados/database.py).
const DIAS_AVISO_VENCIMENTO = 30;
// Certificado excluído fica na Lixeira por esse tanto de dias antes de
// sumir de vez - mesma regra do desktop (`DIAS_GUARDA_LIXEIRA`).
const DIAS_GUARDA_LIXEIRA = 15;

export type StatusCertificado = "VÁLIDO" | "A VENCER" | "EM ATRASO" | "SEM DATA";

/** Datas no banco vêm como texto "DD/MM/AAAA" (mesmo formato que o
 * desktop grava, via `aplicar_mascara_data`) - nunca ISO. */
export function parseDataBr(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  return Number.isNaN(data.getTime()) ? null : data;
}

function hoje(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

/** Calcula o status NA HORA a partir do vencimento - nunca fica
 * desatualizado (mesma lógica de `status_certificado()` no desktop). */
export function calcularStatus(dataVencimento: string | null | undefined): StatusCertificado {
  const vencimento = parseDataBr(dataVencimento);
  if (!vencimento) return "SEM DATA";
  const dias = Math.round((vencimento.getTime() - hoje().getTime()) / 86_400_000);
  if (dias < 0) return "EM ATRASO";
  if (dias <= DIAS_AVISO_VENCIMENTO) return "A VENCER";
  return "VÁLIDO";
}

export function diasParaVencimento(dataVencimento: string | null | undefined): number | null {
  const vencimento = parseDataBr(dataVencimento);
  if (!vencimento) return null;
  return Math.round((vencimento.getTime() - hoje().getTime()) / 86_400_000);
}

export type Colaborador = {
  id: string;
  nome: string;
  cpf: string | null;
  empresa: string | null;
  localTrabalho: string | null;
  ehUsuarioSistema: boolean;
  ativo: boolean;
  criadoEm: string | null;
};

type ColaboradorRaw = {
  id: string; nome: string; cpf: string | null; empresa: string | null;
  local_trabalho: string | null; eh_usuario_sistema: boolean | null; ativo: boolean | null;
  criado_em: string | null;
};

function converterColaborador(c: ColaboradorRaw): Colaborador {
  return {
    id: c.id, nome: c.nome, cpf: c.cpf, empresa: c.empresa, localTrabalho: c.local_trabalho,
    ehUsuarioSistema: Boolean(c.eh_usuario_sistema), ativo: c.ativo !== false, criadoEm: c.criado_em,
  };
}

export async function buscarColaboradores(somenteAtivos = true): Promise<Colaborador[]> {
  let query = supabase
    .from("colaboradores")
    .select("id::text, nome, cpf, empresa, local_trabalho, eh_usuario_sistema, ativo, criado_em")
    .order("nome");
  if (somenteAtivos) query = query.eq("ativo", true);
  const { data, error } = await query;
  if (error) throw new Error(`Não consegui buscar os colaboradores: ${error.message}`);
  return ((data || []) as unknown as ColaboradorRaw[]).map(converterColaborador);
}

export type TipoCertificado = {
  id: string;
  nome: string;
  cargaHoraria: string | null;
  validadeAnos: number | null;
  categoria: string | null;
};

type TipoRaw = {
  id: string; nome: string; carga_horaria: string | null; validade_anos: number | null; categoria: string | null;
};

export async function buscarTiposCertificado(): Promise<TipoCertificado[]> {
  const { data, error } = await supabase
    .from("tipos_certificado")
    .select("id::text, nome, carga_horaria, validade_anos, categoria")
    .order("nome");
  if (error) throw new Error(`Não consegui buscar os tipos de certificado: ${error.message}`);
  return ((data || []) as unknown as TipoRaw[]).map((t) => ({
    id: t.id, nome: t.nome, cargaHoraria: t.carga_horaria, validadeAnos: t.validade_anos, categoria: t.categoria,
  }));
}

export async function buscarCategoriasTipos(): Promise<string[]> {
  const { data, error } = await supabase.from("tipos_certificado").select("categoria");
  if (error) throw new Error(`Não consegui buscar as categorias: ${error.message}`);
  const categorias = new Set(
    ((data || []) as unknown as { categoria: string | null }[])
      .map((t) => t.categoria)
      .filter((c): c is string => Boolean(c))
  );
  return Array.from(categorias).sort();
}

export async function buscarEmpresasCertificados(): Promise<string[]> {
  const { data, error } = await supabase.from("colaboradores").select("empresa");
  if (error) throw new Error(`Não consegui buscar as empresas: ${error.message}`);
  const empresas = new Set(
    ((data || []) as unknown as { empresa: string | null }[])
      .map((c) => c.empresa)
      .filter((e): e is string => Boolean(e))
  );
  return Array.from(empresas).sort();
}

export type CertificadoLista = {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorEmpresa: string | null;
  colaboradorLocal: string | null;
  tipoId: string;
  tipoNome: string;
  categoria: string | null;
  empresa: string | null;
  numero: string | null;
  dataEmissao: string | null;
  dataVencimento: string | null;
  status: StatusCertificado;
};

type CertificadoRaw = {
  id: string; colaborador_id: string; tipo_id: string; empresa: string | null; numero: string | null;
  data_emissao: string | null; data_vencimento: string | null;
};

export type FiltrosCertificados = {
  empresa?: string | null;
  colaboradorId?: string | null;
  categoria?: string | null;
  localTrabalho?: string | null;
};

/** Todos os certificados ATIVOS (não excluídos), já juntados com o nome
 * do colaborador/tipo e o status calculado - equivalente ao
 * `listar_certificados()` do desktop (mesmos filtros: empresa aceita a
 * do certificado OU a do colaborador, igual lá). Sem FK configurada no
 * Postgres entre essas tabelas, então o "join" é feito à mão em memória -
 * mesmo padrão já usado em embarques.ts/admin.ts. */
export async function buscarCertificados(filtros: FiltrosCertificados = {}): Promise<CertificadoLista[]> {
  const { data: certRaw, error } = await supabase
    .from("certificados")
    .select("id::text, colaborador_id::text, tipo_id::text, empresa, numero, data_emissao, data_vencimento")
    .eq("excluido", false);
  if (error) throw new Error(`Não consegui buscar os certificados: ${error.message}`);
  const certificados = (certRaw || []) as unknown as CertificadoRaw[];
  if (certificados.length === 0) return [];

  const [colaboradores, tipos] = await Promise.all([buscarColaboradores(false), buscarTiposCertificado()]);
  const colaboradorPorId = new Map(colaboradores.map((c) => [c.id, c]));
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));

  let resultado: CertificadoLista[] = certificados
    .map((c) => {
      const colaborador = colaboradorPorId.get(c.colaborador_id);
      const tipo = tipoPorId.get(c.tipo_id);
      if (!colaborador || !tipo) return null; // registro órfão (colaborador/tipo apagado) - não deveria acontecer, mas não quebra a tela
      return {
        id: c.id,
        colaboradorId: c.colaborador_id,
        colaboradorNome: colaborador.nome,
        colaboradorEmpresa: colaborador.empresa,
        colaboradorLocal: colaborador.localTrabalho,
        tipoId: c.tipo_id,
        tipoNome: tipo.nome,
        categoria: tipo.categoria,
        empresa: c.empresa,
        numero: c.numero,
        dataEmissao: c.data_emissao,
        dataVencimento: c.data_vencimento,
        status: calcularStatus(c.data_vencimento),
      };
    })
    .filter((c): c is CertificadoLista => c !== null);

  if (filtros.empresa) {
    resultado = resultado.filter((c) => c.empresa === filtros.empresa || c.colaboradorEmpresa === filtros.empresa);
  }
  if (filtros.colaboradorId) {
    resultado = resultado.filter((c) => c.colaboradorId === filtros.colaboradorId);
  }
  if (filtros.categoria) {
    resultado = resultado.filter((c) => c.categoria === filtros.categoria);
  }
  if (filtros.localTrabalho) {
    resultado = resultado.filter((c) => c.colaboradorLocal === filtros.localTrabalho);
  }
  return resultado;
}

/** Um certificado específico pelo id, já juntado com colaborador/tipo -
 * usado pra pré-carregar o formulário de "Lançar Certificado" no modo
 * edição (?id=...). */
export async function buscarCertificadoPorId(certificadoId: string): Promise<CertificadoLista | null> {
  const { data, error } = await supabase
    .from("certificados")
    .select("id::text, colaborador_id::text, tipo_id::text, empresa, numero, data_emissao, data_vencimento")
    .eq("id", certificadoId)
    .maybeSingle();
  if (error) throw new Error(`Não consegui buscar o certificado: ${error.message}`);
  if (!data) return null;
  const c = data as unknown as CertificadoRaw;
  const [colaboradores, tipos] = await Promise.all([buscarColaboradores(false), buscarTiposCertificado()]);
  const colaborador = colaboradores.find((x) => x.id === c.colaborador_id);
  const tipo = tipos.find((x) => x.id === c.tipo_id);
  if (!colaborador || !tipo) return null;
  return {
    id: c.id, colaboradorId: c.colaborador_id, colaboradorNome: colaborador.nome,
    colaboradorEmpresa: colaborador.empresa, colaboradorLocal: colaborador.localTrabalho,
    tipoId: c.tipo_id, tipoNome: tipo.nome, categoria: tipo.categoria, empresa: c.empresa,
    numero: c.numero, dataEmissao: c.data_emissao, dataVencimento: c.data_vencimento,
    status: calcularStatus(c.data_vencimento),
  };
}

export type CertificadoLixeira = CertificadoLista & { excluidoEm: string | null; diasRestantes: number };

/** Certificados na lixeira (excluido=true) - já limpa (marca como
 * "pra excluir de vez") os que passaram dos 15 dias de guarda; quem
 * decide excluir de verdade é a Server Action (excluirDefinitivamente),
 * essa função só calcula e informa. */
export async function buscarLixeira(): Promise<CertificadoLixeira[]> {
  const { data: certRaw, error } = await supabase
    .from("certificados")
    .select("id::text, colaborador_id::text, tipo_id::text, empresa, numero, data_emissao, data_vencimento, excluido_em")
    .eq("excluido", true);
  if (error) throw new Error(`Não consegui buscar a lixeira: ${error.message}`);
  const certificados = (certRaw || []) as unknown as (CertificadoRaw & { excluido_em: string | null })[];
  if (certificados.length === 0) return [];

  const [colaboradores, tipos] = await Promise.all([buscarColaboradores(false), buscarTiposCertificado()]);
  const colaboradorPorId = new Map(colaboradores.map((c) => [c.id, c]));
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));

  return certificados
    .map((c) => {
      const colaborador = colaboradorPorId.get(c.colaborador_id);
      const tipo = tipoPorId.get(c.tipo_id);
      if (!colaborador || !tipo) return null;
      let diasRestantes = DIAS_GUARDA_LIXEIRA;
      const excluidoEmData = parseDataHoraBr(c.excluido_em);
      if (excluidoEmData) {
        const diasPassados = Math.floor((Date.now() - excluidoEmData.getTime()) / 86_400_000);
        diasRestantes = DIAS_GUARDA_LIXEIRA - diasPassados;
      }
      return {
        id: c.id, colaboradorId: c.colaborador_id, colaboradorNome: colaborador.nome,
        colaboradorEmpresa: colaborador.empresa, colaboradorLocal: colaborador.localTrabalho,
        tipoId: c.tipo_id, tipoNome: tipo.nome, categoria: tipo.categoria, empresa: c.empresa,
        numero: c.numero, dataEmissao: c.data_emissao, dataVencimento: c.data_vencimento,
        status: calcularStatus(c.data_vencimento), excluidoEm: c.excluido_em, diasRestantes,
      };
    })
    .filter((c): c is CertificadoLixeira => c !== null)
    .sort((a, b) => (b.excluidoEm || "").localeCompare(a.excluidoEm || ""));
}

/** "excluido_em" vem como "DD/MM/AAAA HH:MM" (mesmo formato que o
 * desktop grava em `excluir_certificado()`). */
function parseDataHoraBr(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const [, dia, mes, ano, hora, minuto] = m;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
  return Number.isNaN(data.getTime()) ? null : data;
}

export type ItemNumeracao = {
  id: string;
  categoria: string;
  numero: string;
  descricao: string | null;
  dataEmissao: string | null;
  validade: string | null;
  colaboradorId: string | null;
  colaboradorNome: string | null;
};

type NumeracaoRaw = {
  id: string; categoria: string; numero: string; descricao: string | null;
  data_emissao: string | null; validade: string | null; colaborador_id: string | null;
};

/** Números que a própria empresa emite (NR/PE) - equivalente a
 * `listar_numeracao()` do desktop. */
export async function buscarNumeracao(categoria?: string | null): Promise<ItemNumeracao[]> {
  let query = supabase
    .from("numeracao_certificados")
    .select("id::text, categoria, numero, descricao, data_emissao, validade, colaborador_id::text")
    .order("id", { ascending: false });
  if (categoria) query = query.eq("categoria", categoria);
  const { data, error } = await query;
  if (error) throw new Error(`Não consegui buscar a numeração: ${error.message}`);
  const linhas = (data || []) as unknown as NumeracaoRaw[];
  if (linhas.length === 0) return [];

  const colaboradores = await buscarColaboradores(false);
  const nomePorId = new Map(colaboradores.map((c) => [c.id, c.nome]));

  return linhas.map((n) => ({
    id: n.id, categoria: n.categoria, numero: n.numero, descricao: n.descricao,
    dataEmissao: n.data_emissao, validade: n.validade, colaboradorId: n.colaborador_id,
    colaboradorNome: n.colaborador_id ? nomePorId.get(n.colaborador_id) || null : null,
  }));
}

/** Próximo número sugerido pra uma categoria (NR/PE) - pega o maior
 * número já emitido +1, igual `proximo_numero()` do desktop. */
export async function buscarProximoNumero(categoria: string): Promise<string> {
  const { data, error } = await supabase
    .from("numeracao_certificados")
    .select("numero")
    .eq("categoria", categoria);
  if (error) throw new Error(`Não consegui calcular o próximo número: ${error.message}`);
  const numeros = ((data || []) as unknown as { numero: string }[])
    .map((n) => Number(n.numero))
    .filter((n) => Number.isFinite(n));
  if (numeros.length === 0) return "1";
  return String(Math.max(...numeros) + 1);
}

/** Vencimento sugerido a partir da emissão + validade do tipo, mesma
 * conta do desktop (`calcular_vencimento_sugerido`: anos * 365 dias). */
export function calcularVencimentoSugerido(dataEmissaoBr: string, validadeAnos: number | null): string {
  const emissao = parseDataBr(dataEmissaoBr);
  if (!emissao || !validadeAnos) return "";
  const dias = Math.round(validadeAnos * 365);
  const vencimento = new Date(emissao.getTime() + dias * 86_400_000);
  const dd = String(vencimento.getDate()).padStart(2, "0");
  const mm = String(vencimento.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${vencimento.getFullYear()}`;
}

export type HistoricoCertificado = CertificadoLista & { excluido: boolean };

/** Todos os certificados de UM colaborador (inclusive os já excluídos) -
 * pra tela de histórico dele. Equivalente a `historico_colaborador()`. */
export async function buscarHistoricoColaborador(colaboradorId: string): Promise<HistoricoCertificado[]> {
  const { data, error } = await supabase
    .from("certificados")
    .select("id::text, colaborador_id::text, tipo_id::text, empresa, numero, data_emissao, data_vencimento, excluido")
    .eq("colaborador_id", colaboradorId);
  if (error) throw new Error(`Não consegui buscar o histórico: ${error.message}`);
  const linhas = (data || []) as unknown as (CertificadoRaw & { excluido: boolean | null })[];
  if (linhas.length === 0) return [];

  const tipos = await buscarTiposCertificado();
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));
  const colaborador = (await buscarColaboradores(false)).find((c) => c.id === colaboradorId) || null;

  return linhas
    .map((c) => {
      const tipo = tipoPorId.get(c.tipo_id);
      if (!tipo) return null;
      return {
        id: c.id, colaboradorId: c.colaborador_id, colaboradorNome: colaborador?.nome || "-",
        colaboradorEmpresa: colaborador?.empresa || null, colaboradorLocal: colaborador?.localTrabalho || null,
        tipoId: c.tipo_id, tipoNome: tipo.nome, categoria: tipo.categoria, empresa: c.empresa,
        numero: c.numero, dataEmissao: c.data_emissao, dataVencimento: c.data_vencimento,
        status: calcularStatus(c.data_vencimento), excluido: Boolean(c.excluido),
      };
    })
    .filter((c): c is HistoricoCertificado => c !== null)
    .sort((a, b) => (b.dataEmissao || "").localeCompare(a.dataEmissao || ""));
}
