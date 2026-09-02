"use client";

import { useState } from "react";
import Link from "next/link";
import { formatarDataBr, recadoDeHoje, type LinhaEmbarque, type Obra, type ReferenciaObra, type RdoResumo } from "@/lib/embarques";
import { montarNomeArquivoRdo } from "@/lib/nomeArquivo";
import { urlDownloadArquivo, baixarTodosComoZip } from "@/lib/download";

function corPercentual(percentual: number | null): string {
  if (percentual === null) return "bg-gray-200 text-gray-500";
  if (percentual >= 70) return "bg-verde/15 text-verde";
  if (percentual >= 40) return "bg-amarelo/15 text-amarelo";
  return "bg-vermelho/15 text-vermelho";
}

/** Chip de uma referência (GM/MD/SS/WO) - azul enquanto ativa, verde com ✓
 * quando já foi encerrada (é o "foi finalizada" que a coordenação quer ver). */
function ChipReferencia({ referencia }: { referencia: ReferenciaObra }) {
  const ativa = referencia.status === "ativa";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
        ativa ? "bg-azul/10 text-azul" : "bg-verde/10 text-verde"
      }`}
      title={
        ativa
          ? referencia.data_abertura
            ? `Aberta em ${formatarDataBr(referencia.data_abertura)}`
            : undefined
          : referencia.data_encerramento
            ? `Finalizada em ${formatarDataBr(referencia.data_encerramento)}`
            : "Finalizada"
      }
    >
      {ativa ? "●" : "✓"} {referencia.tipo} - {referencia.codigo}
    </span>
  );
}

/** Modal do botão "Ver RDOs" - mesmos 3 cartõezinhos de estatística que o
 * desktop mostra (Total de RDOs / Progresso atual / última data lançada),
 * seguidos da lista de RDOs com link de PDF quando tiver. */
function ModalRdos({ nome, rdos, percentual, obra, aoFechar }: {
  nome: string; rdos: RdoResumo[]; percentual: number | null; obra: Obra | null; aoFechar: () => void;
}) {
  const [baixandoTodos, setBaixandoTodos] = useState(false);
  const [erroZip, setErroZip] = useState<string | null>(null);

  const ultimaData = rdos.reduce<string | null>((maior, r) => {
    if (!r.data) return maior;
    if (!maior || r.data > maior) return r.data;
    return maior;
  }, null);

  const rdosComPdf = rdos.filter((r) => r.pdfUrl);

  const aoClicarBaixarTodos = async () => {
    setBaixandoTodos(true);
    setErroZip(null);
    const erro = await baixarTodosComoZip(
      rdosComPdf.map((r) => ({
        url: r.pdfUrl as string,
        nome: montarNomeArquivoRdo(r.numeroRdo, obra?.empresa, obra?.local_codigo, r.data, nome),
      })),
      `RDOs - ${nome}.zip`
    );
    setErroZip(erro);
    setBaixandoTodos(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={aoFechar}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-navy text-white px-5 py-4 flex items-start justify-between rounded-t-lg">
          <div>
            <p className="font-bold">{nome}</p>
            <p className="text-xs text-azul">RDOs lançados neste embarque</p>
          </div>
          <button type="button" onClick={aoFechar} className="text-white/70 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 pt-4">
          <div className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-center">
            <p className="text-lg font-bold text-navy">{rdos.length}</p>
            <p className="text-[10px] text-gray-500">Total de RDOs</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-center">
            <p className="text-lg font-bold text-navy">{percentual !== null ? `${percentual}%` : "-"}</p>
            <p className="text-[10px] text-gray-500">Progresso atual</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-center">
            <p className="text-sm font-bold text-navy pt-1">{formatarDataBr(ultimaData)}</p>
            <p className="text-[10px] text-gray-500">Último RDO</p>
          </div>
        </div>

        <div className="px-5 pt-4">
          {rdosComPdf.length > 1 && (
            <button
              type="button"
              onClick={aoClicarBaixarTodos}
              disabled={baixandoTodos}
              className="w-full text-center text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md py-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {baixandoTodos ? "Gerando .zip..." : `⬇ Baixar todos os RDOs (${rdosComPdf.length}) em .zip`}
            </button>
          )}
          {erroZip && <p className="text-xs text-vermelho mt-2">{erroZip}</p>}
        </div>

        <div className="px-5 py-4">
          {rdos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum RDO lançado ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {rdos.map((rdo) => (
                <div key={rdo.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      RDO {String(rdo.numeroRdo).padStart(3, "0")}
                    </p>
                    <p className="text-xs text-gray-400">{formatarDataBr(rdo.data)}</p>
                  </div>
                  {rdo.pdfUrl ? (
                    <a
                      href={urlDownloadArquivo(
                        rdo.pdfUrl,
                        montarNomeArquivoRdo(rdo.numeroRdo, obra?.empresa, obra?.local_codigo, rdo.data, nome)
                      )}
                      className="text-xs font-semibold text-azul hover:underline whitespace-nowrap"
                    >
                      ⬇ Baixar PDF
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300 whitespace-nowrap">Sem PDF</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CartaoEmbarque({ linha }: { linha: LinhaEmbarque }) {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [rdosAbertos, setRdosAbertos] = useState(false);
  const {
    embarque, obra, totalRdos, percentual, diasEmbarcado, dataInicioReal, itensAvanco, rdosPendentes,
    percentualDescasado, percentualPelosItens, referencias, referenciasHoje, rdos,
  } = linha;
  const temItens = itensAvanco.concluido.length + itensAvanco.em_andamento.length + itensAvanco.a_iniciar.length > 0;
  const temPendencia = rdosPendentes > 0;

  const referenciasAtivas = referencias.filter((r) => r.status === "ativa");
  const referenciasEncerradas = referencias.filter((r) => r.status !== "ativa");

  // O que aparece em destaque (onde antes só tinha o campo fixo "GM") é o
  // que foi MARCADO no RDO de hoje - com o nome certo (GM, SS, WO...)
  // conforme o tipo que a pessoa cadastrou, não um rótulo fixo. Só cai no
  // Código GM fixo da obra se não tiver NENHUMA referência marcada hoje
  // (obras antigas que ainda não usam o cadastro novo).
  const textoReferenciasHoje =
    referenciasHoje.length > 0
      ? referenciasHoje.map((r) => `${r.tipo} - ${r.codigo}`).join("   |   ")
      : null;

  // O rótulo mostra o tipo de verdade (GM, SS, WO...) que foi cadastrado,
  // não um texto genérico - só quando dá pra ter certeza de qual é (as
  // referências marcadas hoje são todas do mesmo tipo, que é o normal:
  // cada obra/cliente usa um tipo só). Se por algum motivo raro misturar
  // tipos diferentes no mesmo dia, aí sim usa um rótulo genérico.
  const tiposMarcadosHoje = Array.from(new Set(referenciasHoje.map((r) => r.tipo)));
  const rotuloReferenciasHoje = tiposMarcadosHoje.length === 1 ? tiposMarcadosHoje[0] : "Referências";

  const recado = recadoDeHoje(embarque);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
      {recado && (
        <div className="bg-azul/10 border border-azul/25 text-azul text-sm rounded-md px-3 py-2 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide">
            📢 Recado do dia — {recado.data} {recado.hora}Hrs
          </span>
          <span>{recado.texto}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy leading-tight">{embarque.efetivo_nome || "-"}</p>
          <p className="text-sm text-gray-500">{embarque.efetivo_funcao || "Função não informada"}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${corPercentual(percentual)}`}>
            {percentual !== null ? `${percentual}%` : "sem dados"}
          </span>
          {temPendencia && (
            <span className="text-[10px] text-amarelo font-medium whitespace-nowrap">
              defasado {rdosPendentes}d
            </span>
          )}
          {percentualDescasado && (
            <span className="text-[10px] text-vermelho font-medium whitespace-nowrap">% não bate</span>
          )}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-gray-400">Obra / Plataforma</dt>
        <dd className="text-right text-gray-700 font-medium">{embarque.obra_nome || "-"}</dd>

        <dt className="text-gray-400">Empresa</dt>
        <dd className="text-right text-gray-700">{obra?.empresa || "-"}</dd>

        <dt className="text-gray-400">Embarcado desde</dt>
        <dd className="text-right text-gray-700">{formatarDataBr(dataInicioReal)}</dd>

        <dt className="text-gray-400">Dias a bordo</dt>
        <dd className="text-right text-gray-700">{diasEmbarcado !== null ? `${diasEmbarcado} dia(s)` : "-"}</dd>

        <dt className="text-gray-400">Previsão de desembarque</dt>
        <dd className="text-right text-gray-700">{formatarDataBr(obra?.data_desembarque_prevista ?? null)}</dd>

        <dt className="text-gray-400">RDOs lançados</dt>
        <dd className="text-right text-gray-700">{totalRdos}</dd>

        {temPendencia && (
          <>
            <dt className="text-amarelo font-medium">RDOs pendentes</dt>
            <dd className="text-right text-amarelo font-medium">
              {rdosPendentes} dia{rdosPendentes === 1 ? "" : "s"} sem RDO
            </dd>
          </>
        )}
      </dl>

      {/* Destaque: o que foi marcado no RDO de HOJE (nome dinâmico - GM,
          SS ou WO, conforme o que foi cadastrado). Em pílulas em vez de
          texto dentro da tabela, pra não quebrar linha de forma torta
          quando o código é comprido ou tem mais de uma referência - cada
          uma quebra sozinha, do jeito certo. Só cai no campo fixo antigo
          (Código GM da obra) se não tiver nada marcado hoje ainda - obras
          que não usam o cadastro novo de referências. */}
      {(textoReferenciasHoje || obra?.gm_codigo) && (
        <div className="flex flex-col gap-1.5 -mt-1">
          <p className="text-xs text-gray-400">
            {referenciasHoje.length > 0 ? rotuloReferenciasHoje : "GM"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {referenciasHoje.length > 0 ? (
              referenciasHoje.map((r, i) => (
                <span
                  key={`${r.tipo}-${r.codigo}-${i}`}
                  className="text-xs font-semibold px-2 py-1 rounded-full bg-azul/10 text-azul whitespace-nowrap"
                >
                  {r.tipo} - {r.codigo}
                </span>
              ))
            ) : (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-azul/10 text-azul">
                GM - {obra?.gm_codigo}
              </span>
            )}
          </div>
        </div>
      )}

      {temPendencia && (
        <div className="bg-amarelo/10 border border-amarelo/25 text-amarelo text-xs rounded-md px-3 py-2">
          ⚠ O % de avanço acima é do último RDO sincronizado - com {rdosPendentes} dia
          {rdosPendentes === 1 ? "" : "s"} sem lançamento (comum com internet instável a bordo), pode não
          refletir a situação mais recente.
        </div>
      )}

      {percentualDescasado && (
        <div className="bg-vermelho/10 border border-vermelho/25 text-vermelho text-xs rounded-md px-3 py-2">
          ⚠ O % digitado no último RDO ({percentual}%) não bate com os itens marcados no checklist
          ({percentualPelosItens}% pelos itens). Provavelmente esqueceram de atualizar um item, ou digitaram o
          % geral errado.
        </div>
      )}

      {referencias.length > 0 && (
        <>
          <div className="h-px bg-gray-100" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Todas as referências cadastradas nesta obra
              </p>
              {referenciasEncerradas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoricoAberto((a) => !a)}
                  className="text-xs font-medium text-azul hover:underline cursor-pointer whitespace-nowrap"
                >
                  {historicoAberto ? "Fechar ▲" : `${referenciasEncerradas.length} finalizada${referenciasEncerradas.length === 1 ? "" : "s"} ▼`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {referenciasAtivas.length === 0 ? (
                <span className="text-xs text-gray-300">nenhuma ativa no momento</span>
              ) : (
                referenciasAtivas.map((r) => <ChipReferencia key={r.id} referencia={r} />)
              )}
            </div>
            {historicoAberto && referenciasEncerradas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                {referenciasEncerradas.map((r) => (
                  <ChipReferencia key={r.id} referencia={r} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {temItens && (
        <>
          <div className="h-px bg-gray-100" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1 bg-verde/10 text-verde font-semibold px-2 py-1 rounded-full">
                ✓ {itensAvanco.concluido.length} concluído{itensAvanco.concluido.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1 bg-amarelo/10 text-amarelo font-semibold px-2 py-1 rounded-full">
                ● {itensAvanco.em_andamento.length} em andamento
              </span>
              <span className="flex items-center gap-1 bg-gray-100 text-gray-500 font-semibold px-2 py-1 rounded-full">
                ○ {itensAvanco.a_iniciar.length} a iniciar
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {itensAvanco.concluido.map((item) => (
                <span key={item} className="text-verde">✓ {item}</span>
              ))}
              {itensAvanco.em_andamento.map((item) => (
                <span key={item} className="text-amarelo">● {item}</span>
              ))}
              {itensAvanco.a_iniciar.map((item) => (
                <span key={item} className="text-gray-400">○ {item}</span>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-gray-100" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRdosAbertos(true)}
          className="flex-1 text-center text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md py-2 cursor-pointer"
        >
          📂 Ver RDOs
        </button>
        <Link
          href={`/relatorios/avanco?ids=${embarque.id}`}
          target="_blank"
          className="flex-1 text-center text-xs font-bold text-white bg-azul-escuro hover:bg-navy transition-colors rounded-md py-2"
        >
          🖨️ Gerar relatório PDF
        </Link>
      </div>

      {rdosAbertos && (
        <ModalRdos
          nome={embarque.efetivo_nome || "-"}
          rdos={rdos}
          percentual={percentual}
          obra={obra}
          aoFechar={() => setRdosAbertos(false)}
        />
      )}
    </div>
  );
}
