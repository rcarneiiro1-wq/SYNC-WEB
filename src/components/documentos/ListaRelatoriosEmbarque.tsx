"use client";

import type { RelatorioEmbarqueDoc } from "@/lib/documentosPlataformaTipos";
import { urlDownloadArquivo } from "@/lib/download";
import { tempoRelativo } from "@/lib/tempo";

/** Lista de "Relatórios de Embarque" (categoria automática, 1 por embarque)
 * na tela principal "Documentos da Plataforma". Precisa ser Client Component
 * SÓ por causa do `urlDownloadArquivo` - achado em produção (14/09): o
 * módulo `@/lib/download.ts` inteiro é `"use client"` (por causa de
 * `baixarTodosComoZip`, que usa APIs de navegador), então o Next 16
 * (Turbopack) recusa chamar `urlDownloadArquivo` de dentro de um Server
 * Component, mesmo sendo uma função pura sem nada de navegador -
 * `page.tsx` (Server Component) chamava direto e quebrava a página inteira
 * com "Attempted to call urlDownloadArquivo() from the server but
 * urlDownloadArquivo is on the client". Mesma categoria de erro do
 * boundary servidor/cliente já documentado com `documentosPlataformaTipos.ts`
 * (ver 14/09, nona entrega) - aqui o fix é isolar em Client Component em
 * vez de separar tipo/lógica, já que a função em si é só client-side por
 * causa do MÓDULO que mora, não por ela mesma. */
export function ListaRelatoriosEmbarque({ relatorios }: { relatorios: RelatorioEmbarqueDoc[] }) {
  if (relatorios.length === 0) {
    return <p className="text-xs text-gray-400 px-4 py-4">Nenhum Relatório de Embarque ainda.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {relatorios.map((rel) => (
        <div key={rel.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          {/* origem/nome em destaque, a pedido do Rafael (14/09) - facilita
              achar o relatório certo numa lista maior */}
          <span className="flex-1 min-w-0 text-gray-700 truncate" title={rel.colaborador}>
            {rel.colaborador}
          </span>
          <span className="text-xs text-gray-400 truncate hidden sm:inline" title={rel.nomeArquivo}>
            {rel.nomeArquivo}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{rel.enviadoPor || "-"}</span>
          <span className="text-xs text-gray-300 whitespace-nowrap hidden md:inline">
            {tempoRelativo(rel.enviadoEm)}
          </span>
          {rel.url && (
            <a
              href={urlDownloadArquivo(rel.url, rel.nomeArquivo)}
              className="text-azul font-semibold hover:underline"
              title="Baixar"
            >
              ⬇
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
