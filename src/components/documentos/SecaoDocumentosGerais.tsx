import { CATEGORIAS_DOCUMENTO, type CategoriaDocumento, type DocumentoGeral } from "@/lib/documentosPlataformaTipos";
import { CategoriaDocumentoGeral } from "./CategoriaDocumentoGeral";

/** Grid com os 4 cards de categoria MANUAL (Isométricos/P&ID/Plantas/
 * Outros) - reaproveitado tanto na tela "Documentos da Plataforma" (visão
 * geral) quanto em "Upload de Arquivos" (foco em subir), pra não duplicar o
 * markup dos cards em dois lugares. */
export function SecaoDocumentosGerais({
  obraId,
  documentosGerais,
}: {
  obraId: string;
  documentosGerais: Record<CategoriaDocumento, DocumentoGeral[]>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {CATEGORIAS_DOCUMENTO.map((categoria) => (
        <CategoriaDocumentoGeral
          key={categoria}
          obraId={obraId}
          categoria={categoria}
          documentos={documentosGerais[categoria]}
        />
      ))}
    </div>
  );
}
