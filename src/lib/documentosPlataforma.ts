import { supabase } from "@/lib/supabase";
import { criarClienteAdmin } from "@/lib/supabase-admin";
import { formatarDataBr } from "@/lib/embarques";
import {
  CATEGORIAS_DOCUMENTO,
  type CategoriaDocumento,
  type DocumentoGeral,
  type DocumentosPlataforma,
  type GrupoRdoEmbarque,
  type RdoResumoDoc,
  type RelatorioEmbarqueDoc,
} from "@/lib/documentosPlataformaTipos";

// re-exporta os tipos/rótulos pra quem já importava daqui (server
// components) continuar funcionando sem precisar trocar o import - só
// componentes CLIENT é que precisam importar direto de
// documentosPlataformaTipos.ts (ver nota nesse arquivo).
export * from "@/lib/documentosPlataformaTipos";

// IMPORTANTE: mesma regra de IDs do resto do sistema (ver nota em
// embarques.ts) - todo id/obra_id/embarque_id é `string`, nunca `number`.

const NOME_BUCKET_DOCUMENTOS = "documentos-plataforma";
// bucket PRIVADO (diferente dos outros do sistema) - URL de download nunca
// é a pública do Storage, é sempre uma signed URL gerada aqui, com validade
// curta (1h - dá tempo de sobra pra alguém abrir a lista e clicar em
// baixar, sem deixar um link "eterno" solto por aí).
const VALIDADE_URL_SEGUNDOS = 60 * 60;

export type Plataforma = {
  obraId: string;
  nome: string;
  empresa: string | null;
  totalEmbarques: number;
};

/** Só plataformas que já tiveram pelo menos 1 embarque de verdade - evita
 * obra de teste/cadastro vazio poluindo as abas (ver "Plataforma Teste
 * Vazio" etc., achadas ao investigar o schema em 14/09). Ordenada pela
 * atividade mais recente primeiro (mesmo critério de "Embarques ativos"). */
export async function buscarPlataformas(): Promise<Plataforma[]> {
  const { data, error } = await supabase
    .from("embarques")
    .select("obra_id::text, obra_nome, data_inicio")
    .order("data_inicio", { ascending: false });
  if (error || !data) return [];

  const porObra = new Map<string, Plataforma>();
  for (const linha of data as unknown as { obra_id: string; obra_nome: string | null; data_inicio: string | null }[]) {
    if (!linha.obra_id) continue;
    const atual = porObra.get(linha.obra_id);
    if (atual) {
      atual.totalEmbarques += 1;
    } else {
      porObra.set(linha.obra_id, {
        obraId: linha.obra_id,
        nome: linha.obra_nome || "(sem nome)",
        empresa: null,
        totalEmbarques: 1,
      });
    }
  }

  // empresa não vem de `embarques` (só `obra_nome`, texto solto) - busca à
  // parte na tabela `obras` pros ids que sobraram, só pra completar o dado
  const ids = Array.from(porObra.keys());
  if (ids.length > 0) {
    const { data: obrasRaw } = await supabase.from("obras").select("id::text, empresa").in("id", ids);
    for (const obra of (obrasRaw as unknown as { id: string; empresa: string | null }[]) || []) {
      const p = porObra.get(obra.id);
      if (p) p.empresa = obra.empresa;
    }
  }

  return Array.from(porObra.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function periodoDoEmbarque(dataInicio: string | null, dataFim: string | null, ativo: boolean): string {
  const inicio = dataInicio ? formatarDataBr(dataInicio) : "-";
  if (ativo || !dataFim) return `${inicio} - em andamento`;
  return `${inicio} - ${formatarDataBr(dataFim)}`;
}

/** Busca e monta TUDO que a tela "Documentos da Plataforma" precisa pra uma
 * obra: os RDOs agrupados por embarque (categoria "automática"), os
 * Relatórios de Embarque (também "automática", 1 por embarque), e os
 * documentos gerais manuais (Isométricos/P&ID/Plantas/Outros).
 *
 * A parte automática é pura agregação do que já existe (`rdos` e
 * `anexos_embarque`, ambos ligados por `embarque_id` -> `embarques.obra_id`)
 * - não duplica nenhum dado, só organiza pra exibição. */
export async function buscarDocumentosPlataforma(obraId: string): Promise<DocumentosPlataforma> {
  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select("id::text, obra_nome, efetivo_nome, data_inicio, data_fim, ativo")
    .eq("obra_id", obraId)
    .order("data_inicio", { ascending: false });
  if (erroEmb) throw new Error(`Não consegui buscar os embarques da plataforma: ${erroEmb.message}`);

  const embarques = (embarquesRaw as unknown as {
    id: string; obra_nome: string | null; efetivo_nome: string | null;
    data_inicio: string | null; data_fim: string | null; ativo: boolean;
  }[]) || [];
  const nomeObra = embarques[0]?.obra_nome || "(sem nome)";
  const idsEmbarques = embarques.map((e) => e.id);

  const [{ data: rdosRaw }, { data: anexosRaw }, { data: geraisRaw }] = await Promise.all([
    idsEmbarques.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("rdos")
          .select("id::text, embarque_id::text, numero_rdo, data, arquivo_pdf_url")
          .in("embarque_id", idsEmbarques)
          .order("numero_rdo", { ascending: true }),
    idsEmbarques.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("anexos_embarque")
          .select("id::text, embarque_id::text, nome_arquivo, url_nuvem, enviado_por, enviado_em")
          .in("embarque_id", idsEmbarques)
          .eq("tipo", "relatorio_embarque")
          .order("enviado_em", { ascending: false }),
    supabase
      .from("documentos_plataforma")
      .select("id::text, categoria, nome_arquivo, caminho_storage, tamanho_bytes, enviado_por, enviado_em")
      .eq("obra_id", obraId)
      .order("enviado_em", { ascending: false }),
  ]);

  const rdosPorEmbarque = new Map<string, RdoResumoDoc[]>();
  for (const r of (rdosRaw as unknown as { id: string; embarque_id: string; numero_rdo: number; data: string | null; arquivo_pdf_url: string | null }[]) || []) {
    const lista = rdosPorEmbarque.get(r.embarque_id) || [];
    lista.push({ id: r.id, numeroRdo: r.numero_rdo, data: r.data, url: r.arquivo_pdf_url });
    rdosPorEmbarque.set(r.embarque_id, lista);
  }

  const gruposRdo: GrupoRdoEmbarque[] = embarques
    .map((emb) => {
      const rdos = rdosPorEmbarque.get(emb.id) || [];
      if (rdos.length === 0) return null;
      const colaborador = emb.efetivo_nome || "(sem nome)";
      return {
        embarqueId: emb.id,
        colaborador,
        periodo: periodoDoEmbarque(emb.data_inicio, emb.data_fim, emb.ativo),
        // não existe um "enviado por" próprio na tabela `rdos` (o PDF sobe
        // sozinho, gerado pelo mesmo colaborador do embarque) - usa o nome
        // do colaborador também aqui, deixando claro de quem é o embarque
        enviadoPor: colaborador,
        totalRdos: rdos.length,
        rdos,
      };
    })
    .filter((g): g is GrupoRdoEmbarque => g !== null);

  const colaboradorPorEmbarque = new Map(embarques.map((e) => [e.id, e.efetivo_nome || "(sem nome)"]));
  const relatoriosEmbarque: RelatorioEmbarqueDoc[] = ((anexosRaw as unknown as {
    id: string; embarque_id: string; nome_arquivo: string; url_nuvem: string | null;
    enviado_por: string | null; enviado_em: string | null;
  }[]) || []).map((a) => ({
    id: a.id,
    embarqueId: a.embarque_id,
    colaborador: colaboradorPorEmbarque.get(a.embarque_id) || "(sem nome)",
    nomeArquivo: a.nome_arquivo,
    enviadoPor: a.enviado_por,
    enviadoEm: a.enviado_em,
    url: a.url_nuvem,
  }));

  const documentosGerais: Record<CategoriaDocumento, DocumentoGeral[]> = {
    isometricos: [], pid: [], plantas: [], outros: [],
  };
  const geraisLista = (geraisRaw as unknown as {
    id: string; categoria: string; nome_arquivo: string; caminho_storage: string;
    tamanho_bytes: number | null; enviado_por: string | null; enviado_em: string | null;
  }[]) || [];
  if (geraisLista.length > 0) {
    const admin = criarClienteAdmin();
    // signed URLs em paralelo (Promise.all) - sequencial ficaria lento
    // conforme a biblioteca crescer, um round-trip por arquivo
    const comUrl = await Promise.all(
      geraisLista.map(async (doc) => {
        const categoria = (CATEGORIAS_DOCUMENTO as readonly string[]).includes(doc.categoria)
          ? (doc.categoria as CategoriaDocumento)
          : "outros";
        const { data: assinada } = await admin.storage
          .from(NOME_BUCKET_DOCUMENTOS)
          .createSignedUrl(doc.caminho_storage, VALIDADE_URL_SEGUNDOS);
        const item: DocumentoGeral = {
          id: doc.id,
          categoria,
          nomeArquivo: doc.nome_arquivo,
          tamanhoBytes: doc.tamanho_bytes,
          enviadoPor: doc.enviado_por,
          enviadoEm: doc.enviado_em,
          url: assinada?.signedUrl ?? null,
        };
        return item;
      })
    );
    for (const item of comUrl) {
      documentosGerais[item.categoria].push(item);
    }
  }

  return { obraId, nomeObra, gruposRdo, relatoriosEmbarque, documentosGerais };
}
