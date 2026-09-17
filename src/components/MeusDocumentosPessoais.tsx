"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Folder, Receipt, ClipboardList, FileText } from "lucide-react";
import { buscarMeusDocumentos } from "@/lib/painelColaboradorActions";
import type { MeusDocumentos } from "@/lib/painelColaborador";
import { formatarDataBr } from "@/lib/embarques";
import { urlDownloadArquivo } from "@/lib/download";

type SecaoAberta = "rdos" | "relatorios" | null;

/**
 * Seção "Documentos Pessoais" do Meu Painel (17/09, a pedido do Rafael,
 * de olho numa apresentação melhor pro Fabiano) - RDOs e Relatórios de
 * Embarque de TODOS os embarques do colaborador logado, sem filtro de
 * período (ao contrário da diária, que é por mês/fechamento) - a ideia é
 * a pessoa ver tudo que já lançou, desde sempre.
 *
 * "Contracheques" continua só visual/"Em breve" de propósito - fica pra
 * quando a automação de distribuição por CPF for desenhada de verdade
 * (ver estado-atual.md, projeto ainda não iniciado).
 *
 * Busca uma vez só (não depende do período escolhido no resto da tela) -
 * por isso é um componente e um fetch separados de
 * `PainelColaboradorConteudo`. A garantia de "só vê o meu" mora inteira
 * dentro de `buscarMeusDocumentos()` (resolve a identidade pelo cookie de
 * sessão) - esse componente nunca recebe nem manda nenhum id de
 * colaborador.
 */
export function MeusDocumentosPessoais() {
  const [dados, setDados] = useState<MeusDocumentos | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState<SecaoAberta>(null);
  const [embarquesAbertos, setEmbarquesAbertos] = useState<Set<string>>(new Set());

  useEffect(() => {
    buscarMeusDocumentos()
      .then((r) => setDados(r.vinculado ? r.dados : { gruposRdo: [], relatoriosEmbarque: [] }))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  const alternarEmbarque = (embarqueId: string) => {
    setEmbarquesAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(embarqueId)) novo.delete(embarqueId);
      else novo.add(embarqueId);
      return novo;
    });
  };

  const totalRdos = dados?.gruposRdo.reduce((soma, g) => soma + g.totalRdos, 0) ?? 0;
  const totalRelatorios = dados?.relatoriosEmbarque.length ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-4">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <Folder size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-navy">Documentos Pessoais</span>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Contracheques - só visual por enquanto, de propósito */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-gray-300">
            <Receipt size={16} />
            <span className="text-sm">Contracheques</span>
          </div>
          <span className="text-[10px] bg-amarelo/10 text-amarelo font-semibold px-2 py-1 rounded-full whitespace-nowrap">
            Em breve
          </span>
        </div>

        {/* RDOs - agrupados por embarque, igual a tela de gerência */}
        <div>
          <button
            type="button"
            onClick={() => setSecaoAberta((atual) => (atual === "rdos" ? null : "rdos"))}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 text-navy">
              <ClipboardList size={16} className="text-gray-400" />
              <span className="text-sm font-medium">RDOs</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              {!carregando && !erro && <span className="text-xs tabular-nums">{totalRdos}</span>}
              {secaoAberta === "rdos" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </button>

          {secaoAberta === "rdos" && (
            <div className="bg-gray-50 px-4 py-2">
              {carregando && <p className="text-xs text-gray-400 py-2">Carregando...</p>}
              {!carregando && erro && (
                <p className="text-xs text-vermelho py-2">Não consegui buscar seus RDOs agora.</p>
              )}
              {!carregando && !erro && (dados?.gruposRdo.length ?? 0) === 0 && (
                <p className="text-xs text-gray-400 py-2">Nenhum RDO ainda.</p>
              )}
              {!carregando && !erro && dados?.gruposRdo.map((grupo) => {
                const aberto = embarquesAbertos.has(grupo.embarqueId);
                return (
                  <div
                    key={grupo.embarqueId}
                    className="border border-gray-100 rounded-md bg-white overflow-hidden mb-2 last:mb-0"
                  >
                    <button
                      type="button"
                      onClick={() => alternarEmbarque(grupo.embarqueId)}
                      className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy truncate">{grupo.periodo}</p>
                        <p className="text-[11px] text-gray-400">
                          {grupo.totalRdos} RDO{grupo.totalRdos === 1 ? "" : "s"}
                          {grupo.emAndamento && <span className="ml-1.5 text-azul font-semibold">● em andamento</span>}
                        </p>
                      </div>
                      {aberto ? (
                        <ChevronDown size={14} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400 shrink-0" />
                      )}
                    </button>
                    {aberto && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {grupo.rdos.map((rdo) => (
                          <div key={rdo.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                            <span className="flex-1 text-gray-600">
                              RDO #{String(rdo.numeroRdo).padStart(3, "0")}
                            </span>
                            <span className="text-gray-400 whitespace-nowrap">{formatarDataBr(rdo.data)}</span>
                            {rdo.url ? (
                              <a
                                href={urlDownloadArquivo(rdo.url, `RDO_${String(rdo.numeroRdo).padStart(3, "0")}.pdf`)}
                                className="text-azul font-semibold hover:underline"
                                title="Baixar"
                              >
                                ⬇
                              </a>
                            ) : (
                              <span
                                className="text-gray-300"
                                title="Esse RDO não teve o PDF gerado ainda - fala com o Rafael se precisar dele"
                              >
                                indisponível
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Relatórios de Embarque - lista simples: nome, data, baixar */}
        <div>
          <button
            type="button"
            onClick={() => setSecaoAberta((atual) => (atual === "relatorios" ? null : "relatorios"))}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 text-navy">
              <FileText size={16} className="text-gray-400" />
              <span className="text-sm font-medium">Relatórios</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              {!carregando && !erro && <span className="text-xs tabular-nums">{totalRelatorios}</span>}
              {secaoAberta === "relatorios" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </button>

          {secaoAberta === "relatorios" && (
            <div className="bg-gray-50 px-4 py-2">
              {carregando && <p className="text-xs text-gray-400 py-2">Carregando...</p>}
              {!carregando && erro && (
                <p className="text-xs text-vermelho py-2">Não consegui buscar seus relatórios agora.</p>
              )}
              {!carregando && !erro && totalRelatorios === 0 && (
                <p className="text-xs text-gray-400 py-2">Nenhum relatório ainda.</p>
              )}
              {!carregando && !erro && totalRelatorios > 0 && (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-md bg-white overflow-hidden">
                  {dados!.relatoriosEmbarque.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                      <span className="flex-1 text-gray-600 truncate" title={r.nomeArquivo}>
                        {r.nomeArquivo}
                      </span>
                      <span className="text-gray-400 whitespace-nowrap">
                        {r.enviadoEm ? formatarDataBr(r.enviadoEm) : "-"}
                      </span>
                      {r.url ? (
                        <a
                          href={urlDownloadArquivo(r.url, r.nomeArquivo)}
                          className="text-azul font-semibold hover:underline"
                          title="Baixar"
                        >
                          ⬇
                        </a>
                      ) : (
                        <span className="text-gray-300">indisponível</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
