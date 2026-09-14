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
  // 14/09: NÃO é mais o `obra_id` cru - é o CÓDIGO normalizado da
  // plataforma (ver `normalizarCodigo` abaixo). Mantido o nome do campo
  // `obraId` só por compatibilidade com quem já lê `p.obraId`/`?obra=`,
  // mas o valor agora é a "chave de grupo": pode representar 1 ou mais
  // `obras.id` reais que são fisicamente a mesma plataforma (ex: cadastro
  // duplicado "Almirante Tamandaré"/"Almirante Tamandare") - ver a
  // explicação completa em `resolverGrupoPlataforma`.
  obraId: string;
  nome: string;
  empresa: string | null;
  totalEmbarques: number;
};

/** Normaliza o CÓDIGO da plataforma (`obras.local_codigo`) pra virar a
 * chave de agrupamento: maiúsculo, sem acento, sem traço/espaço. 14/09,
 * combinado com o Rafael depois de ele reportar "Almirante Barroso"
 * duplicado e "Almirante Tamandaré"/"ATD" aparecendo como plataformas
 * diferentes - MV-32/mv32/MV32 (ou ATD/Atd) têm que virar a MESMA chave.
 * Conferido em produção (14/09) que isso não junta nenhum par que não
 * devesse: hoje só existem 2 pares de código duplicado no cadastro
 * (Barroso "MV-32"/"MV-32" e Tamandaré "ATD"/"Atd") e os dois pares são,
 * de fato, a mesma plataforma física (mesma empresa também, conferido). */
function normalizarCodigo(codigo: string | null | undefined): string {
  if (!codigo) return "";
  return codigo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acento
    .toUpperCase()
    .replace(/[\s-]/g, ""); // remove espaço e traço
}

/** Mesma ideia pro NOME, só pra exibição - maiúsculo e sem acento, igual
 * combinado com o Rafael pra também valer no cadastro novo daqui pra
 * frente (ver `AbaObras` no desktop). Isso também resolve, de graça, o
 * caso de duas obras duplicadas com nome escrito diferente (ex:
 * "ALMIRANTE BARROSO" vs "Almirante Barroso") sem precisar escolher qual
 * dos dois "vence". */
function normalizarNomeExibicao(nome: string | null | undefined): string {
  if (!nome) return "(sem nome)";
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/** Chave de agrupamento de uma obra: o código normalizado, ou, se a obra
 * não tiver código cadastrado, `ID:<obra_id>` (agrupada sozinha) - nunca
 * agrupa duas obras SEM código juntas só por estarem as duas vazias, seria
 * bem mais fácil juntar coisa errada nesse caso do que quando bate um
 * código de verdade. */
function chaveDeGrupo(obraId: string, codigo: string | null | undefined): string {
  return normalizarCodigo(codigo) || `ID:${obraId}`;
}

/** Acha todos os `obras.id` reais que pertencem ao mesmo grupo/plataforma
 * de `grupoKey` (o código normalizado), junto com o nome de exibição e a
 * empresa. Usado tanto pra listar/buscar documentos (várias obras juntas)
 * quanto pra escrever um upload novo (resolve pra 1 id real - ver
 * `obraIdCanonicoDoGrupo`). A tabela `obras` é pequena (poucas dezenas de
 * linhas hoje), então busca todo mundo e filtra em JS em vez de tentar
 * normalizar direto no SQL. */
export async function resolverGrupoPlataforma(
  grupoKey: string
): Promise<{ obraIds: string[]; nome: string; empresa: string | null } | null> {
  const { data } = await supabase.from("obras").select("id::text, nome, local_codigo, empresa");
  const obras = (data as unknown as { id: string; nome: string | null; local_codigo: string | null; empresa: string | null }[]) || [];
  const doGrupo = obras.filter((o) => chaveDeGrupo(o.id, o.local_codigo) === grupoKey);
  if (doGrupo.length === 0) return null;
  return {
    obraIds: doGrupo.map((o) => o.id),
    nome: normalizarNomeExibicao(doGrupo[0].nome),
    empresa: doGrupo.find((o) => o.empresa)?.empresa ?? null,
  };
}

/** Dado um grupo de `obras.id` reais (mesma plataforma física), escolhe 1
 * id "canônico" pra gravar upload NOVO de documento geral - não importa
 * muito qual, já que a LEITURA sempre agrega o grupo inteiro (ver
 * `buscarDocumentosPlataforma`); só precisa ser sempre o mesmo, então usa
 * sempre o menor id (comparado como número de verdade via BigInt, nunca
 * como texto - ids antigos tipo "1"/"30" e novos tipo timestamp de 19
 * dígitos não comparam certo como string). */
function obraIdCanonicoDoGrupo(obraIds: string[]): string {
  return obraIds.reduce((menor, atual) => (BigInt(atual) < BigInt(menor) ? atual : menor));
}

/** Só plataformas que já tiveram pelo menos 1 embarque de verdade - evita
 * obra de teste/cadastro vazio poluindo as abas (ver "Plataforma Teste
 * Vazio" etc., achadas ao investigar o schema em 14/09). Já vem AGRUPADA
 * por código normalizado (ver `chaveDeGrupo`) - cadastro duplicado da
 * mesma plataforma física aparece como 1 aba só. Ordenada por nome. */
export async function buscarPlataformas(): Promise<Plataforma[]> {
  const { data, error } = await supabase.from("embarques").select("obra_id::text");
  if (error || !data) return [];

  const contagemPorObraId = new Map<string, number>();
  for (const linha of data as unknown as { obra_id: string }[]) {
    if (!linha.obra_id) continue;
    contagemPorObraId.set(linha.obra_id, (contagemPorObraId.get(linha.obra_id) || 0) + 1);
  }
  const idsComEmbarque = Array.from(contagemPorObraId.keys());
  if (idsComEmbarque.length === 0) return [];

  const { data: obrasRaw } = await supabase
    .from("obras")
    .select("id::text, nome, local_codigo, empresa")
    .in("id", idsComEmbarque);
  const obras = (obrasRaw as unknown as { id: string; nome: string | null; local_codigo: string | null; empresa: string | null }[]) || [];

  const porGrupo = new Map<string, Plataforma>();
  for (const obra of obras) {
    const chave = chaveDeGrupo(obra.id, obra.local_codigo);
    const totalDaObra = contagemPorObraId.get(obra.id) || 0;
    const atual = porGrupo.get(chave);
    if (atual) {
      atual.totalEmbarques += totalDaObra;
      if (!atual.empresa && obra.empresa) atual.empresa = obra.empresa;
    } else {
      porGrupo.set(chave, {
        obraId: chave,
        nome: normalizarNomeExibicao(obra.nome),
        empresa: obra.empresa,
        totalEmbarques: totalDaObra,
      });
    }
  }

  return Array.from(porGrupo.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
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
export async function buscarDocumentosPlataforma(grupoKey: string): Promise<DocumentosPlataforma> {
  // 14/09: `grupoKey` é o código normalizado da plataforma (ver
  // `chaveDeGrupo`), não mais 1 `obra_id` cru - pode representar VÁRIOS
  // `obras.id` reais (cadastro duplicado da mesma plataforma física).
  // Tudo abaixo busca e junta o grupo inteiro, sem nunca reescrever
  // `embarques.obra_id`/nenhum dado existente - é só agregação na leitura.
  const grupo = await resolverGrupoPlataforma(grupoKey);
  const obraIds = grupo?.obraIds ?? [grupoKey];
  const nomeObra = grupo?.nome ?? "(sem nome)";

  const { data: embarquesRaw, error: erroEmb } = await supabase
    .from("embarques")
    .select("id::text, obra_nome, efetivo_nome, data_inicio, data_fim, ativo")
    .in("obra_id", obraIds)
    .order("data_inicio", { ascending: false });
  if (erroEmb) throw new Error(`Não consegui buscar os embarques da plataforma: ${erroEmb.message}`);

  const embarques = (embarquesRaw as unknown as {
    id: string; obra_nome: string | null; efetivo_nome: string | null;
    data_inicio: string | null; data_fim: string | null; ativo: boolean;
  }[]) || [];
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
          // 14/09 (bug achado pelo Rafael em produção): antes da coluna
          // `tipo` existir (feature de 13/09), TODO anexo_embarque era um
          // Relatório de Embarque - então os registros antigos ficaram com
          // `tipo = NULL`, nunca `"relatorio_embarque"`. Filtrar só por
          // `.eq("tipo", "relatorio_embarque")` escondia esses relatórios
          // antigos (ex: os dois relatórios de agosto da Almirante Barroso,
          // que o Rafael confirmou estarem anexados mas sumidos da tela) -
          // NULL também conta como Relatório de Embarque legado.
          .or("tipo.eq.relatorio_embarque,tipo.is.null")
          .order("enviado_em", { ascending: false }),
    supabase
      .from("documentos_plataforma")
      .select("id::text, categoria, nome_arquivo, caminho_storage, tamanho_bytes, enviado_por, enviado_em")
      .in("obra_id", obraIds)
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
    isometricos: [], pid: [], plantas: [], mdgmsswo: [], outros: [],
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

  return { obraId: grupoKey, nomeObra, gruposRdo, relatoriosEmbarque, documentosGerais };
}

// exporta também pra `documentosPlataformaActions.ts` resolver, na hora do
// upload, qual `obras.id` real gravar (ver `obraIdCanonicoDoGrupo` acima -
// não pode gravar o `grupoKey` direto, `documentos_plataforma.obra_id` é
// bigint de verdade, referenciando 1 obra real).
export { obraIdCanonicoDoGrupo };
