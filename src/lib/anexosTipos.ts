// Tipos/constantes PURAS de anexo - sem nenhuma dependência de servidor
// (cookies, admin client, etc). Extraído de anexosActions.ts (03/11) pra
// resolver um bug real de produção: um arquivo "use server" só pode
// exportar funções async - TIPOS_ANEXO (um array, "object" em tempo de
// execução) morava lá dentro e quebrava isso, derrubando a rota
// /embarques/ativos com "A 'use server' file can only export async
// functions, found object". Mesmo padrão já usado em
// documentosPlataformaTipos.ts (14/09) pra separar tipo puro de módulo
// server-only/server-actions.
export const TIPOS_ANEXO = ["rdo", "relatorio_embarque"] as const;
export type TipoAnexo = (typeof TIPOS_ANEXO)[number];
