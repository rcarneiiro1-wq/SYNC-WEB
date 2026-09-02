"use client";

import { useMemo, useState } from "react";
import { formatarDataBr, type LinhaHistorico, type ItensPorStatus } from "@/lib/embarques";
import { montarNomeArquivoRdo } from "@/lib/nomeArquivo";
import { urlDownloadArquivo, baixarTodosComoZip } from "@/lib/download";
import { SecaoAnexos } from "@/components/SecaoAnexos";

function corPercentualBadge(percentual: number | null): string {
  if (percentual === null) return "bg-gray-100 text-gray-400";
  if (percentual >= 70) return "bg-verde/15 text-verde";
  if (percentual >= 40) return "bg-amarelo/15 text-amarelo";
  return "bg-vermelho/15 text-vermelho";
}

function ResumoItens({ itensAvanco }: { itensAvanco: ItensPorStatus }) {
  const { concluido, em_andamento, a_iniciar } = itensAvanco;
  const total = concluido.length + em_andamento.length + a_iniciar.length;
  if (total === 0) return <span className="text-gray-300 text-xs">sem itens</span>;
  return (
    <div className="flex gap-1.5 text-xs">
      {concluido.length > 0 && <span className="text-verde font-medium">✓{concluido.length}</span>}
      {em_andamento.length > 0 && <span className="text-amarelo font-medium">●{em_andamento.length}</span>}
      {a_iniciar.length > 0 && <span className="text-gray-400 font-medium">○{a_iniciar.length}</span>}
    </div>
  );
}

type ColunaOrdenavel = "nome" | "periodo" | "dias" | "pendencias" | "percentual";

function IconeOrdenacao({ ativa, asc }: { ativa: boolean; asc: boolean }) {
  if (!ativa) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-azul ml-1">{asc ? "↑" : "↓"}</span>;
}

function LinhaExpandida({ linha }: { linha: LinhaHistorico }) {
  const { embarque, obra, itensAvanco, justificativa, rdos, referencias } = linha;
  const justificativaEncerramento = embarque.justificativa_encerramento;
  const nomeColaborador = embarque.efetivo_nome || "-";
  const rdosComPdf = rdos.filter((r) => r.pdfUrl);

  const [baixandoTodos, setBaixandoTodos] = useState(false);
  const [erroZip, setErroZip] = useState<string | null>(null);

  const aoClicarBaixarTodos = async () => {
    setBaixandoTodos(true);
    setErroZip(null);
    const erro = await baixarTodosComoZip(
      rdosComPdf.map((r) => ({
        url: r.pdfUrl as string,
        nome: montarNomeArquivoRdo(r.numeroRdo, obra?.empresa, obra?.local_codigo, r.data, nomeColaborador),
      })),
      `RDOs - ${nomeColaborador}.zip`
    );
    setErroZip(erro);
    setBaixandoTodos(false);
  };

  return (
    <tr>
      <td colSpan={6} className="bg-gray-50 px-6 py-4 border-b border-gray-100">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Itens do escopo</p>
            {itensAvanco.concluido.length + itensAvanco.em_andamento.length + itensAvanco.a_iniciar.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum item registrado.</p>
            ) : (
              <div className="flex flex-col gap-1 text-sm">
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
            )}
            {justificativaEncerramento ? (
              <div className="mt-3 bg-amarelo/5 border border-amarelo/20 rounded-md px-3 py-2">
                <p className="text-xs font-semibold text-amarelo mb-1">⚠ Encerrado com pendência - motivo</p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{justificativaEncerramento}</p>
              </div>
            ) : justificativa && (
              <div className="mt-3 bg-gray-100 border border-gray-200 rounded-md px-3 py-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">📝 Observação registrada num RDO</p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{justificativa}</p>
              </div>
            )}

            {referencias.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Referências da obra (GM / MD / SS / WO)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {referencias.map((r) => (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                        r.status === "ativa" ? "bg-azul/10 text-azul" : "bg-verde/10 text-verde"
                      }`}
                      title={
                        r.status === "ativa"
                          ? r.data_abertura ? `Aberta em ${formatarDataBr(r.data_abertura)}` : undefined
                          : r.data_encerramento ? `Finalizada em ${formatarDataBr(r.data_encerramento)}` : "Finalizada"
                      }
                    >
                      {r.status === "ativa" ? "●" : "✓"} {r.tipo} - {r.codigo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                RDOs lançados ({rdos.length})
              </p>
              {rdosComPdf.length > 1 && (
                <button
                  type="button"
                  onClick={aoClicarBaixarTodos}
                  disabled={baixandoTodos}
                  className="text-xs font-semibold text-azul hover:underline whitespace-nowrap disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                >
                  {baixandoTodos ? "Gerando .zip..." : `⬇ Baixar todos (${rdosComPdf.length}) em .zip`}
                </button>
              )}
            </div>
            {erroZip && <p className="text-xs text-vermelho mb-2">{erroZip}</p>}
            {rdos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum RDO lançado.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {rdos.map((rdo) => (
                  <div key={rdo.id} className="flex items-center justify-between text-sm bg-white rounded px-3 py-1.5 border border-gray-100">
                    <span className="text-gray-600">
                      RDO {String(rdo.numeroRdo).padStart(3, "0")} — {formatarDataBr(rdo.data)}
                    </span>
                    {rdo.pdfUrl ? (
                      <a
                        href={urlDownloadArquivo(
                          rdo.pdfUrl,
                          montarNomeArquivoRdo(rdo.numeroRdo, obra?.empresa, obra?.local_codigo, rdo.data, nomeColaborador)
                        )}
                        className="text-azul font-medium hover:underline whitespace-nowrap"
                      >
                        📥 Baixar PDF
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs whitespace-nowrap">sem PDF ainda</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <SecaoAnexos embarqueId={embarque.id} anexos={linha.anexos} />
        </div>
      </td>
    </tr>
  );
}

function LinhaTabela({
  linha, par, expandida, aoClicar,
}: {
  linha: LinhaHistorico; par: boolean; expandida: boolean; aoClicar: () => void;
}) {
  const { embarque, totalRdos, percentualFinal, dias, pendentes, itensAvanco, inicioReal, fimReal, justificativa } = linha;

  return (
    <tr
      className={`${par ? "bg-gray-50/60" : "bg-white"} hover:bg-azul/5 transition-colors cursor-pointer ${expandida ? "bg-azul/5" : ""}`}
      onClick={aoClicar}
    >
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className={`text-gray-300 text-xs transition-transform ${expandida ? "rotate-90" : ""}`}>▶</span>
          <div>
            <p className="text-sm font-semibold text-navy leading-tight">{embarque.efetivo_nome || "-"}</p>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">{embarque.obra_nome || "-"}</p>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4 text-sm text-gray-600 whitespace-nowrap">
        {formatarDataBr(inicioReal)}
        <span className="text-gray-300 mx-1.5">→</span>
        {formatarDataBr(fimReal)}
      </td>

      <td className="py-3.5 px-4 text-center">
        <p className="text-sm font-medium text-gray-700">
          {dias ?? "-"}
          {dias !== null && <span className="text-gray-400 font-normal text-xs"> d</span>}
        </p>
        <p className="text-xs text-gray-400">{totalRdos} RDO{totalRdos === 1 ? "" : "s"}</p>
      </td>

      <td className="py-3.5 px-4 text-center">
        {embarque.status_final === "com_pendencia" ? (
          <span className="inline-flex items-center gap-1 bg-amarelo/10 text-amarelo text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
            ⚠ Encerrado com pendência
          </span>
        ) : embarque.status_final === "completo" ? (
          <span className="inline-flex items-center gap-1 bg-verde/10 text-verde text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
            ✓ Completo
          </span>
        ) : pendentes > 0 ? (
          <span
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
            title="Embarque antigo, sem essa informação registrada - calculado só pela diferença entre dias e RDOs"
          >
            ⚠ {pendentes} dia{pendentes === 1 ? "" : "s"} sem RDO
          </span>
        ) : (
          <span className="text-gray-300 text-xs">em dia</span>
        )}
      </td>

      <td className="py-3.5 px-4 text-center">
        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${corPercentualBadge(percentualFinal)}`}>
          {percentualFinal !== null ? `${percentualFinal}%` : "-"}
        </span>
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <ResumoItens itensAvanco={itensAvanco} />
          {(embarque.justificativa_encerramento || justificativa) && (
            <span className="text-xs" title="Tem justificativa registrada">📝</span>
          )}
          {linha.anexos.length > 0 && (
            <span
              className="inline-flex items-center gap-1 bg-azul/10 text-azul text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              title={`${linha.anexos.length} relatório(s) assinado(s) anexado(s)`}
            >
              📎 {linha.anexos.length}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function CabecalhoOrdenavel({
  label, coluna, ordenarPor, ordemAsc, aoClicar, alinhamento = "left",
}: {
  label: string; coluna: ColunaOrdenavel; ordenarPor: ColunaOrdenavel | null; ordemAsc: boolean;
  aoClicar: (c: ColunaOrdenavel) => void; alinhamento?: "left" | "center";
}) {
  return (
    <th
      className={`py-3 px-4 text-${alinhamento} text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-navy`}
      onClick={() => aoClicar(coluna)}
    >
      {label}
      <IconeOrdenacao ativa={ordenarPor === coluna} asc={ordemAsc} />
    </th>
  );
}

export function TabelaHistorico({ linhas }: { linhas: LinhaHistorico[] }) {
  const [agruparPorPessoa, setAgruparPorPessoa] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenavel | null>(null);
  const [ordemAsc, setOrdemAsc] = useState(false);
  // string, não number: o id do embarque é maior do que o JS consegue
  // representar com precisão como número (ver comentário em embarques.ts)
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const aoClicarColuna = (coluna: ColunaOrdenavel) => {
    if (ordenarPor === coluna) {
      setOrdemAsc(!ordemAsc);
    } else {
      setOrdenarPor(coluna);
      setOrdemAsc(true);
    }
  };

  const linhasOrdenadas = useMemo(() => {
    if (!ordenarPor) return linhas;
    const copia = [...linhas];
    const sinal = ordemAsc ? 1 : -1;
    copia.sort((a, b) => {
      switch (ordenarPor) {
        case "nome":
          return sinal * (a.embarque.efetivo_nome || "").localeCompare(b.embarque.efetivo_nome || "");
        case "periodo":
          return sinal * (a.inicioReal || "").localeCompare(b.inicioReal || "");
        case "dias":
          return sinal * ((a.dias ?? -1) - (b.dias ?? -1));
        case "pendencias":
          return sinal * (a.pendentes - b.pendentes);
        case "percentual":
          return sinal * ((a.percentualFinal ?? -1) - (b.percentualFinal ?? -1));
        default:
          return 0;
      }
    });
    return copia;
  }, [linhas, ordenarPor, ordemAsc]);

  const grupos = useMemo(() => {
    if (!agruparPorPessoa) return null;
    const mapa = new Map<string, LinhaHistorico[]>();
    for (const linha of linhasOrdenadas) {
      const nome = linha.embarque.efetivo_nome || "Sem nome";
      const lista = mapa.get(nome) || [];
      lista.push(linha);
      mapa.set(nome, lista);
    }
    return Array.from(mapa.entries());
  }, [linhasOrdenadas, agruparPorPessoa]);

  const resumo = useMemo(() => {
    const total = linhas.length;
    const comPendencia = linhas.filter((l) => l.embarque.status_final === "com_pendencia" || l.pendentes > 0).length;
    const validos = linhas.filter((l) => l.percentualFinal !== null);
    const media = validos.length > 0
      ? Math.round(validos.reduce((soma, l) => soma + (l.percentualFinal || 0), 0) / validos.length)
      : null;
    // soma os "dias" (intervalo real coberto pelos RDOs) de cada embarque
    // filtrado - equivale ao total de diárias no período/filtro atual
    const totalDias = linhas.reduce((soma, l) => soma + (l.dias ?? 0), 0);
    return { total, comPendencia, media, totalDias };
  }, [linhas]);

  let contadorLinha = 0;
  const renderizarLinha = (linha: LinhaHistorico) => {
    const par = contadorLinha % 2 === 1;
    contadorLinha += 1;
    const expandida = expandidoId === linha.embarque.id;
    return (
      <>
        <LinhaTabela
          key={linha.embarque.id}
          linha={linha}
          par={par}
          expandida={expandida}
          aoClicar={() => setExpandidoId(expandida ? null : linha.embarque.id)}
        />
        {expandida && <LinhaExpandida key={`${linha.embarque.id}-exp`} linha={linha} />}
      </>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-bold text-navy">{resumo.total}</p>
          <p className="text-xs text-gray-400">embarque{resumo.total === 1 ? "" : "s"} encontrado{resumo.total === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className={`text-2xl font-bold ${resumo.comPendencia > 0 ? "text-amarelo" : "text-navy"}`}>{resumo.comPendencia}</p>
          <p className="text-xs text-gray-400">com pendência</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-bold text-navy">{resumo.totalDias}</p>
          <p className="text-xs text-gray-400">diária{resumo.totalDias === 1 ? "" : "s"} no período</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-2xl font-bold text-navy">{resumo.media !== null ? `${resumo.media}%` : "-"}</p>
          <p className="text-xs text-gray-400">% médio de conclusão</p>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={agruparPorPessoa} onChange={(e) => setAgruparPorPessoa(e.target.checked)} className="accent-azul" />
          Agrupar por pessoa
        </label>
      </div>

      {linhasOrdenadas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
          Nenhum embarque encontrado com esse filtro.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200">
                <CabecalhoOrdenavel label="Colaborador" coluna="nome" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} />
                <CabecalhoOrdenavel label="Período" coluna="periodo" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} />
                <CabecalhoOrdenavel label="Duração" coluna="dias" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <CabecalhoOrdenavel label="Pendências" coluna="pendencias" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <CabecalhoOrdenavel label="% Final" coluna="percentual" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">O que foi feito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grupos
                ? grupos.map(([nome, linhasDoGrupo]) => (
                    <>
                      <tr key={`grupo-${nome}`} className="bg-navy/5">
                        <td colSpan={6} className="px-4 py-2 text-xs font-bold text-navy uppercase tracking-wide">
                          {nome} <span className="font-normal text-gray-400 normal-case">— {linhasDoGrupo.length} embarque{linhasDoGrupo.length === 1 ? "" : "s"}</span>
                        </td>
                      </tr>
                      {linhasDoGrupo.map((linha) => renderizarLinha(linha))}
                    </>
                  ))
                : linhasOrdenadas.map((linha) => renderizarLinha(linha))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Clica numa linha pra ver os itens completos, a justificativa (se tiver) e baixar os PDFs dos RDOs. &quot;Período&quot;
        e &quot;Duração&quot; são calculados pelo intervalo real coberto pelos RDOs lançados.
      </p>
    </div>
  );
}
