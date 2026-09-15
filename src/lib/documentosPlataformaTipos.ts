// Tipos e constantes puras de "Documentos da Plataforma" - separado de
// documentosPlataforma.ts DE PROPÓSITO: esse arquivo aqui não importa nada
// de servidor (nada de supabase-admin/"server-only"), então componentes
// client (CategoriaDocumentoGeral.tsx, GruposRdoLista.tsx) podem importar
// os tipos/rótulos sem puxar o cliente admin pro bundle do navegador - foi
// exatamente esse erro de build que apareceu ao testar antes de entregar
// (14/09): "server-only" não pode ser importado por um Client Component.

// 14/09: categoria nova "mdgmsswo" a pedido do Rafael - um lugar pra
// anexar os PDFs dos códigos de referência da plataforma (MD/GM/SS/WO -
// cada plataforma normalmente só usa um desses tipos, mas todos entram
// nessa mesma categoria de upload).
export const CATEGORIAS_DOCUMENTO = ["isometricos", "pid", "plantas", "mdgmsswo", "outros"] as const;
export type CategoriaDocumento = (typeof CATEGORIAS_DOCUMENTO)[number];

export const ROTULO_CATEGORIA: Record<CategoriaDocumento, string> = {
  isometricos: "Isométricos",
  pid: "P&ID",
  plantas: "Plantas",
  mdgmsswo: "MD/GM/SS/WO",
  outros: "Outros",
};

export type RdoResumoDoc = {
  id: string;
  numeroRdo: number;
  data: string | null;
  url: string | null;
};

export type GrupoRdoEmbarque = {
  embarqueId: string;
  colaborador: string;
  periodo: string; // "15/08/2026 - 22/08/2026" ou "15/08/2026 - em andamento"
  enviadoPor: string;
  totalRdos: number;
  rdos: RdoResumoDoc[];
  // 15/09: redesenho da tela em tabela (a pedido do Rafael) - mesma
  // condição já usada pra montar `periodo` (ver `periodoDoEmbarque` em
  // documentosPlataforma.ts), só exposta como booleano pra não precisar a
  // UI reinterpretar o texto do período pra saber o status.
  emAndamento: boolean;
};

export type RelatorioEmbarqueDoc = {
  id: string;
  embarqueId: string;
  colaborador: string;
  nomeArquivo: string;
  enviadoPor: string | null;
  enviadoEm: string | null;
  url: string | null;
};

export type DocumentoGeral = {
  id: string;
  categoria: CategoriaDocumento;
  nomeArquivo: string;
  tamanhoBytes: number | null;
  enviadoPor: string | null;
  enviadoEm: string | null;
  url: string | null;
};

// 15/09: painel "Resumo da Plataforma" (redesenho aprovado pelo Rafael a
// partir do mockup) - `responsavel` NÃO é um campo cadastrado (não existe
// "responsável" em `obras`, conferido no schema antes de implementar) -
// é o colaborador com a atividade mais recente nessa plataforma (RDO,
// Relatório de Embarque ou documento geral), como um retrato de "quem
// mexeu por último", não uma atribuição fixa.
export type ResumoPlataforma = {
  rdosHoje: number;
  documentosEnviados: number;
  ultimaAtividade: string | null; // já formatado "DD/MM/AAAA HH:MM", ou null se nunca houve atividade
  responsavel: string | null;
};

export type DocumentosPlataforma = {
  obraId: string;
  nomeObra: string;
  gruposRdo: GrupoRdoEmbarque[];
  relatoriosEmbarque: RelatorioEmbarqueDoc[];
  documentosGerais: Record<CategoriaDocumento, DocumentoGeral[]>;
  resumo: ResumoPlataforma;
};
