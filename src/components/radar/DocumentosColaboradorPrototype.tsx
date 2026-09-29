"use client";

import { useState } from "react";
import {
  IdCard,
  Home,
  FileSignature,
  Stethoscope,
  Paperclip,
  Folder,
  Download,
  MoreVertical,
  Plus,
  Link2,
} from "lucide-react";

/**
 * Protótipo visual "Documentação de Funcionários" (29/09, a pedido do
 * Rafael) - quarta peça do Radar, mesmo esquema de acesso das outras três
 * (admin OU permissão `radar`, ver Sidebar.tsx/lib/usuarios.ts).
 *
 * Motivado pela Angélica precisando confirmar documentos de colaboradores
 * com o Rafael - na auditoria pra montar o mockup, achamos que hoje o
 * módulo de Certificados só guarda DADO (número/datas), nunca o próprio
 * arquivo escaneado. A ideia: uma biblioteca de documentos por
 * colaborador (RG/CPF, comprovante de residência, contrato, ASO,
 * certificado anexado, outros), reaproveitando o modal "Histórico" que já
 * existe em Certificados → Colaboradores como uma segunda aba - mais um
 * campo opcional de anexo direto na tela de Lançar Certificado, vinculado
 * automaticamente ao certificado.
 *
 * Igual ao resto do Radar: PURO PROTÓTIPO. Dados fixos de exemplo, nenhum
 * botão aqui lê ou grava nada no banco - troca de aba é o único estado de
 * verdade. Mockup estático (HTML avulso) já aprovado pelo Rafael antes
 * desta versão; quando o projeto sair do papel de verdade, essa página
 * vira o rascunho de onde partir.
 */

type Aba = "historico" | "documentos";

type CertificadoExemplo = {
  tipo: string;
  emissao: string;
  vencimento: string;
  status: "VÁLIDO" | "A VENCER";
};

const CERTIFICADOS_EXEMPLO: CertificadoExemplo[] = [
  { tipo: "NR-35 — Trabalho em Altura", emissao: "12/02/2026", vencimento: "12/02/2027", status: "VÁLIDO" },
  { tipo: "NR-10 — Segurança em Eletricidade", emissao: "03/08/2025", vencimento: "03/08/2026", status: "A VENCER" },
];

type DocumentoExemplo = {
  nome: string;
  extensao: string;
  tamanho: string;
  enviadoPor: string;
  quando: string;
  vinculoCertificado?: string;
};

type CategoriaExemplo = {
  chave: string;
  rotulo: string;
  Icone: typeof IdCard;
  corChip: string;
  documentos: DocumentoExemplo[];
};

const CATEGORIAS_EXEMPLO: CategoriaExemplo[] = [
  {
    chave: "rg_cpf",
    rotulo: "RG / CPF",
    Icone: IdCard,
    corChip: "bg-azul/10 text-azul-escuro",
    documentos: [
      { nome: "RG_Eduardo_Ramos.pdf", extensao: "PDF", tamanho: "420 KB", enviadoPor: "Angélica", quando: "há 2 dias" },
    ],
  },
  {
    chave: "comprovante_residencia",
    rotulo: "Comprovante de Residência",
    Icone: Home,
    corChip: "bg-verde/10 text-verde",
    documentos: [
      { nome: "Comprovante_Residencia_2026.jpg", extensao: "JPG", tamanho: "1.2 MB", enviadoPor: "Angélica", quando: "há 2 dias" },
    ],
  },
  {
    chave: "contrato",
    rotulo: "Contrato",
    Icone: FileSignature,
    corChip: "bg-navy/10 text-navy",
    documentos: [
      { nome: "Contrato_Trabalho_assinado.pdf", extensao: "PDF", tamanho: "680 KB", enviadoPor: "Angélica", quando: "há 3 meses" },
    ],
  },
  {
    chave: "aso",
    rotulo: "ASO",
    Icone: Stethoscope,
    corChip: "bg-amarelo/10 text-amarelo",
    documentos: [
      { nome: "ASO_Admissional_2026.pdf", extensao: "PDF", tamanho: "350 KB", enviadoPor: "Angélica", quando: "há 3 meses" },
    ],
  },
  {
    chave: "certificado",
    rotulo: "Certificados (anexos)",
    Icone: Paperclip,
    corChip: "bg-vermelho/10 text-vermelho",
    documentos: [
      {
        nome: "NR35_TrabalhoAltura_scan.pdf",
        extensao: "PDF",
        tamanho: "290 KB",
        enviadoPor: "Angélica",
        quando: "há 1 mês",
        vinculoCertificado: "NR-35 — Trabalho em Altura",
      },
    ],
  },
  {
    chave: "outros",
    rotulo: "Outros",
    Icone: Folder,
    corChip: "bg-gray-100 text-gray-500",
    documentos: [],
  },
];

export function DocumentosColaboradorPrototype() {
  const [aba, setAba] = useState<Aba>("documentos");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs text-violet-700">
        <span className="font-bold">Protótipo</span> — dados de exemplo, nada aqui lê ou grava no banco real. Mostra
        como ficaria uma biblioteca de documentos por colaborador, dentro do modal de Colaboradores que já existe
        hoje em Certificados.
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-sm font-bold text-navy">Eduardo Ramos</p>
            <p className="text-xs text-gray-500">MF Máquinas — Plataforma P-74 — Sangue: O+</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
            colaborador de exemplo
          </span>
        </div>

        <div className="px-4 pt-3">
          <div className="flex items-center gap-1 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setAba("historico")}
              className={`px-1 pb-2.5 mr-5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                aba === "historico" ? "text-azul border-azul" : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              Histórico de Certificados
            </button>
            <button
              type="button"
              onClick={() => setAba("documentos")}
              className={`px-1 pb-2.5 mr-5 text-sm font-bold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                aba === "documentos" ? "text-azul border-azul" : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              Documentos
              <span className="text-[9px] font-extrabold text-vermelho bg-vermelho/10 px-1.5 py-0.5 rounded-full">
                NOVO
              </span>
            </button>
          </div>
        </div>

        <div className="p-4">
          {aba === "historico" ? (
            <div className="space-y-2">
              {CERTIFICADOS_EXEMPLO.map((c) => (
                <div key={c.tipo} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-navy">{c.tipo}</p>
                    <p className="text-xs text-gray-500">
                      Emissão: {c.emissao} · Vencimento: {c.vencimento}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                      c.status === "VÁLIDO" ? "bg-verde/10 text-verde" : "bg-amarelo/10 text-amarelo"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CATEGORIAS_EXEMPLO.map((cat) => (
                <div key={cat.chave} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`flex-none w-6 h-6 rounded-md flex items-center justify-center ${cat.corChip}`}>
                        <cat.Icone size={13} />
                      </span>
                      <span className="font-semibold text-navy text-sm truncate">{cat.rotulo}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">({cat.documentos.length})</span>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-white bg-azul-escuro rounded-md px-3 py-1.5 whitespace-nowrap cursor-default inline-flex items-center gap-1"
                    >
                      <Plus size={11} /> Enviar
                    </button>
                  </div>
                  {cat.documentos.length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-4">Nenhum documento ainda.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {cat.documentos.map((doc) => (
                        <div key={doc.nome} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                          <span className="flex-none w-7 h-7 mt-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center">
                            {doc.extensao}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <span className="flex-1 min-w-0 text-gray-700 font-semibold break-words">{doc.nome}</span>
                              <div className="flex-none flex items-center gap-2 mt-0.5 text-gray-400">
                                <Download size={14} className="text-azul" />
                                <MoreVertical size={15} />
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {doc.tamanho} · {doc.enviadoPor} · {doc.quando}
                            </p>
                            {doc.vinculoCertificado && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-vermelho bg-vermelho/10 px-2 py-0.5 rounded-full">
                                <Link2 size={10} /> Vinculado: {doc.vinculoCertificado}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-bold text-navy">Bônus — anexar na hora de Lançar Certificado</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Tipo de certificado</label>
            <div className="mt-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 bg-gray-50">
              NR-35 — Trabalho em Altura
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Vencimento sugerido</label>
            <div className="mt-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 bg-gray-50">
              12/02/2027
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide inline-flex items-center gap-1.5">
              Anexar comprovante (opcional)
              <span className="text-[9px] font-extrabold text-vermelho bg-vermelho/10 px-1.5 py-0.5 rounded-full">
                NOVO
              </span>
            </label>
            <div className="mt-1 border border-dashed border-gray-300 rounded-md px-4 py-3 flex items-center justify-between gap-3 bg-gray-50">
              <span className="text-xs text-gray-500">Nenhum arquivo selecionado — PDF, JPG, PNG ou HEIC</span>
              <button
                type="button"
                className="text-xs font-bold text-white bg-azul-escuro rounded-md px-3 py-1.5 whitespace-nowrap cursor-default inline-flex items-center gap-1"
              >
                <Plus size={11} /> Enviar arquivo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
