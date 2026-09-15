import { Clock, FileText, Paperclip, User } from "lucide-react";
import type { ResumoPlataforma as ResumoPlataformaTipo } from "@/lib/documentosPlataformaTipos";

/** Coluna lateral de CONTEÚDO (não é a sidebar de navegação do app - pedido
 * explícito do Rafael no briefing de 15/09) com um retrato rápido da
 * plataforma selecionada. Todo número aqui é agregação do que a própria
 * tela já buscava (`buscarDocumentosPlataforma`), nenhuma consulta nova -
 * ver `montarResumoPlataforma` em documentosPlataforma.ts. */
export function ResumoPlataforma({ resumo }: { resumo: ResumoPlataformaTipo }) {
  const linhas = [
    { Icone: FileText, chip: "bg-azul/10 text-azul-escuro", label: "RDOs lançados hoje", valor: String(resumo.rdosHoje) },
    { Icone: Paperclip, chip: "bg-verde/10 text-verde", label: "Documentos enviados", valor: String(resumo.documentosEnviados) },
    { Icone: Clock, chip: "bg-amarelo/10 text-amarelo", label: "Última atividade", valor: resumo.ultimaAtividade ?? "-" },
    { Icone: User, chip: "bg-navy/10 text-navy", label: "Responsável", valor: resumo.responsavel ?? "-" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm font-bold text-navy mb-3">Resumo da Plataforma</p>
      <div className="flex flex-col">
        {linhas.map((linha, i) => (
          <div
            key={linha.label}
            className={`flex items-center gap-3 py-2 ${i > 0 ? "border-t border-gray-100" : ""}`}
          >
            <span className={`flex-none w-7 h-7 rounded-md flex items-center justify-center ${linha.chip}`}>
              <linha.Icone size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">{linha.label}</p>
              <p className="text-sm font-bold text-navy truncate">{linha.valor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
