"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { formatarDataBr, normalizarBusca, type LinhaHistorico, type Obra } from "@/lib/embarques";
import { montarNomeArquivoRdo } from "@/lib/nomeArquivo";
import { urlDownloadArquivo, baixarTodosComoZip } from "@/lib/download";
import { SecaoAnexos } from "@/components/SecaoAnexos";
import { corDaEmpresa } from "@/components/SeletorEmpresas";
import {
  Ship, FileText, Clock, CheckCircle2, Calendar, MapPin,
  ChevronRight, ChevronDown, ChevronLeft, Layers,
} from "lucide-react";

/** 28/11 (redesign visual pedido pelo Rafael, com mockup/spec de referência):
 * mesmo algoritmo de iniciais já usado em outras telas do sistema
 * (Sidebar.tsx, PainelVencimentos.tsx, GruposRdoLista.tsx) - duplicado aqui
 * de propósito, igual nos outros lugares (é só 3 linhas, não compensa
 * compartilhar e criar acoplamento entre arquivos de áreas diferentes). */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corPercentualBadge(percentual: number | null): string {
  if (percentual === null) return "bg-gray-100 text-gray-400";
  if (percentual >= 70) return "bg-verde/15 text-verde";
  if (percentual >= 40) return "bg-amarelo/15 text-amarelo";
  return "bg-vermelho/15 text-vermelho";
}

type ColunaOrdenavel = "nome" | "empresa" | "periodo" | "dias" | "rdos" | "pendencias" | "percentual";

/** Pequena bolinha colorida + texto - mesma linguagem visual dos cards de
 * empresa (SeletorEmpresas) e do Comparativo entre colaboradores, pra
 * "Empresa" aqui na tabela usar a MESMA cor que a empresa já usa em
 * qualquer outro lugar do sistema (ver `corDaEmpresa`). */
function EtiquetaEmpresa({ empresa }: { empresa: string | null | undefined }) {
  if (!empresa) return <span className="text-gray-300 text-xs">-</span>;
  const cor = corDaEmpresa(empresa);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize whitespace-nowrap" style={{ color: cor.fg }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor.fg }} />
      {empresa}
    </span>
  );
}

function IconeOrdenacao({ ativa, asc }: { ativa: boolean; asc: boolean }) {
  if (!ativa) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-azul ml-1">{asc ? "↑" : "↓"}</span>;
}

/** Card de indicador (seção 4 do pedido de redesign) - ícone num quadrado
 * colorido + número em destaque + rótulo embaixo, sem gráfico/decoração
 * nenhuma dentro, igual pedido. */
function CardKpi({
  icone, corIcone, valor, rotulo,
}: {
  icone: ReactNode; corIcone: string; valor: string | number; rotulo: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 shadow-sm flex items-center gap-3">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${corIcone}`}>{icone}</span>
      <div>
        <p className="text-xl font-bold text-navy leading-tight">{valor}</p>
        <p className="text-xs text-gray-400 leading-tight mt-0.5">{rotulo}</p>
      </div>
    </div>
  );
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
      <td colSpan={8} className="bg-azul/[0.04] px-6 py-5 border-b border-gray-100">
        {/* 28/11: resumo (nome / plataforma / período / RDOs) pedido no
         * redesign - a plataforma saiu da linha fechada (lá agora mostra a
         * FUNÇÃO do colaborador, não a obra) e voltou a aparecer bem aqui
         * em cima, junto do resto do contexto do embarque. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
          <span className="text-sm font-semibold text-navy">{nomeColaborador}</span>
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-gray-400" /> {obra?.nome || embarque.obra_nome || "-"}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-gray-400" /> {formatarDataBr(linha.inicioReal)} → {formatarDataBr(linha.fimReal)}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText size={12} className="text-gray-400" /> {rdos.length} RDO{rdos.length === 1 ? "" : "s"} lançados
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <Layers size={13} className="text-azul" /> Itens do escopo
            </p>
            {itensAvanco.concluido.length + itensAvanco.em_andamento.length + itensAvanco.a_iniciar.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum item registrado.</p>
            ) : (
              <div className="flex flex-col gap-1.5 text-sm">
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

            {referencias.length > 0 ? (
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
            ) : (
              (obra?.gm_codigo || obra?.md_codigo) && (
                // fallback pro cadastro antigo (campo fixo de GM/MD na obra),
                // pra quando a obra não usa o cadastro novo de "referências"
                // (obra_referencias) - assim o painel sempre mostra alguma
                // coisa, mesmo em obra cadastrada do jeito antigo
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Referências da obra
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {obra?.gm_codigo && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-azul/10 text-azul whitespace-nowrap">
                        GM - {obra.gm_codigo}
                      </span>
                    )}
                    {obra?.md_codigo && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-azul/10 text-azul whitespace-nowrap">
                        MD - {obra.md_codigo}
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <FileText size={13} className="text-azul" /> RDOs lançados ({rdos.length})
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
                  <div key={rdo.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5 border border-gray-100">
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
  const { embarque, obra, totalRdos, percentualFinal, dias, pendentes, inicioReal, fimReal } = linha;

  return (
    <tr
      className={`${par ? "bg-azul/[0.035]" : "bg-white"} hover:bg-azul/10 transition-colors cursor-pointer ${expandida ? "bg-azul/10" : ""}`}
      onClick={aoClicar}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
            {iniciaisDoNome(embarque.efetivo_nome || "-")}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy leading-tight whitespace-nowrap">{embarque.efetivo_nome || "-"}</p>
            <p className="text-xs text-gray-400 leading-tight mt-0.5 whitespace-nowrap">{embarque.efetivo_funcao || "-"}</p>
          </div>
        </div>
      </td>

      <td className="py-3 px-4">
        <EtiquetaEmpresa empresa={obra?.empresa} />
      </td>

      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={12} className="text-gray-300" />
          {formatarDataBr(inicioReal)}
          <span className="text-gray-300">→</span>
          {formatarDataBr(fimReal)}
        </span>
      </td>

      <td className="py-3 px-4 text-center">
        <span className="text-sm font-bold text-navy">
          {dias ?? "-"}
          {dias !== null && <span className="font-normal text-gray-400 text-xs"> d</span>}
        </span>
      </td>

      <td className="py-3 px-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
          <FileText size={13} className="text-gray-300" /> {totalRdos}
        </span>
      </td>

      <td className="py-3 px-4 text-center">
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

      <td className="py-3 px-4 text-center">
        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${corPercentualBadge(percentualFinal)}`}>
          {percentualFinal !== null ? `${percentualFinal}%` : "-"}
        </span>
      </td>

      <td className="py-3 px-4 text-center">
        {expandida ? <ChevronDown size={16} className="text-azul inline" /> : <ChevronRight size={16} className="text-gray-300 inline" />}
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

/** Modo de agrupamento da tabela - no máximo um por vez (agrupar por
 * pessoa E por plataforma ao mesmo tempo não faz sentido estrutural,
 * então é uma escolha única, não duas caixinhas independentes). */
type ModoAgrupamento = "nenhum" | "pessoa" | "plataforma";

/** Paginação (seção 9 do pedido de redesign) - só faz sentido na visão
 * "Sem agrupamento" (lista plana); nos modos agrupados continua mostrando
 * tudo, senão um grupo ficaria cortado no meio entre 2 páginas. */
const TAM_PAGINA = 10;

export function TabelaHistorico({ linhas }: { linhas: LinhaHistorico[] }) {
  const [modoAgrupamento, setModoAgrupamento] = useState<ModoAgrupamento>("nenhum");
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenavel | null>(null);
  const [ordemAsc, setOrdemAsc] = useState(false);
  // string, não number: o id do embarque é maior do que o JS consegue
  // representar com precisão como número (ver comentário em embarques.ts)
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

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
        case "empresa":
          return sinal * (a.obra?.empresa || "").localeCompare(b.obra?.empresa || "");
        case "periodo":
          return sinal * (a.inicioReal || "").localeCompare(b.inicioReal || "");
        case "dias":
          return sinal * ((a.dias ?? -1) - (b.dias ?? -1));
        case "rdos":
          return sinal * (a.totalRdos - b.totalRdos);
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

  const gruposPorPessoa = useMemo(() => {
    if (modoAgrupamento !== "pessoa") return null;
    // 27/11: agrupa pelo colaborador_id (identidade estável), não pelo
    // texto de efetivo_nome - esse é só um retrato de como a pessoa se
    // chamava NA ÉPOCA de cada embarque, nunca muda depois de gravado.
    // Agrupando pelo nome, renomear alguém (ex: corrigir "Gustavo" pra
    // "Gustavo Ricardo") fazia o sistema achar que eram duas pessoas
    // diferentes - bug relatado pelo Rafael. Só cai pro nome como chave
    // em embarque muito antigo, de antes de colaborador_id existir (não
    // deveria ter nenhum hoje, mas por segurança nunca quebra se aparecer).
    const mapa = new Map<string, { nomeAtual: string; inicioMaisRecente: string; linhas: LinhaHistorico[] }>();
    for (const linha of linhasOrdenadas) {
      const chave = linha.embarque.colaborador_id || `nome:${linha.embarque.efetivo_nome || "Sem nome"}`;
      const nomeDessaLinha = linha.embarque.efetivo_nome || "Sem nome";
      const inicioDessaLinha = linha.inicioReal || "";
      const grupo = mapa.get(chave);
      if (!grupo) {
        mapa.set(chave, { nomeAtual: nomeDessaLinha, inicioMaisRecente: inicioDessaLinha, linhas: [linha] });
        continue;
      }
      grupo.linhas.push(linha);
      // o nome mostrado no cabeçalho do grupo é sempre o do embarque mais
      // RECENTE - assim aparece "Gustavo Ricardo" (nome atual), nunca
      // "Gustavo" (nome antigo), não importa a ordem em que os embarques
      // foram processados aqui
      if (inicioDessaLinha > grupo.inicioMaisRecente) {
        grupo.nomeAtual = nomeDessaLinha;
        grupo.inicioMaisRecente = inicioDessaLinha;
      }
    }
    return Array.from(mapa.entries());
  }, [linhasOrdenadas, modoAgrupamento]);

  const gruposPorPlataforma = useMemo(() => {
    if (modoAgrupamento !== "plataforma") return null;
    // 27/11 (achado testando com dado real, pedido do Rafael pra corrigir
    // "pra ontem"): o `obra_id` sozinho NÃO identifica a mesma plataforma
    // física de forma confiável - confirmado no banco que cada ciclo de
    // embarque costuma criar um cadastro de obra NOVO pra mesma plataforma
    // (ex: "P-75" e "PLATAFORMA P-75" são 2 obras diferentes; "Almirante
    // Barroso" e "ALMIRANTE BARROSO" idem). O `local_codigo` se mantém
    // estável entre esses cadastros duplicados ("P75" nos dois, "MV-32" nos
    // dois) - por isso agrupa por ELE (normalizado, tolerante a
    // maiúsculo/acento/traço), não pelo obra_id. Só cai pro nome da obra
    // quando ela nem tem local_codigo cadastrado (embarque bem antigo).
    //
    // Igual no agrupamento por pessoa: guarda a obra do embarque mais
    // RECENTE do grupo pra decidir o nome/empresa mostrados no cabeçalho -
    // mesma lógica de "mostra a versão mais atual do cadastro", não a
    // primeira que apareceu.
    const mapa = new Map<string, { obraMaisRecente: Obra | null; inicioMaisRecente: string; linhas: LinhaHistorico[] }>();
    for (const linha of linhasOrdenadas) {
      const codigoOuNome = linha.obra?.local_codigo || linha.obra?.nome || linha.embarque.obra_nome || "Sem plataforma";
      const chave = normalizarBusca(codigoOuNome);
      const inicioDessaLinha = linha.inicioReal || "";
      const grupo = mapa.get(chave);
      if (!grupo) {
        mapa.set(chave, { obraMaisRecente: linha.obra, inicioMaisRecente: inicioDessaLinha, linhas: [linha] });
        continue;
      }
      grupo.linhas.push(linha);
      if (inicioDessaLinha > grupo.inicioMaisRecente) {
        grupo.obraMaisRecente = linha.obra;
        grupo.inicioMaisRecente = inicioDessaLinha;
      }
    }
    return Array.from(mapa.entries());
  }, [linhasOrdenadas, modoAgrupamento]);

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
    const totalRdosLancados = linhas.reduce((soma, l) => soma + l.totalRdos, 0);
    return { total, comPendencia, media, totalDias, totalRdosLancados };
  }, [linhas]);

  // só vale pro modo "sem agrupamento" - ver comentário em cima de TAM_PAGINA
  const totalPaginas = Math.max(1, Math.ceil(linhasOrdenadas.length / TAM_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasDaPagina = useMemo(
    () => linhasOrdenadas.slice((paginaAtual - 1) * TAM_PAGINA, paginaAtual * TAM_PAGINA),
    [linhasOrdenadas, paginaAtual]
  );
  const inicioIntervalo = linhasOrdenadas.length === 0 ? 0 : (paginaAtual - 1) * TAM_PAGINA + 1;
  const fimIntervalo = Math.min(paginaAtual * TAM_PAGINA, linhasOrdenadas.length);

  let contadorLinha = 0;
  const renderizarLinha = (linha: LinhaHistorico) => {
    const par = contadorLinha % 2 === 1;
    contadorLinha += 1;
    const expandida = expandidoId === linha.embarque.id;
    return (
      <Fragment key={linha.embarque.id}>
        <LinhaTabela
          linha={linha}
          par={par}
          expandida={expandida}
          aoClicar={() => setExpandidoId(expandida ? null : linha.embarque.id)}
        />
        {expandida && <LinhaExpandida linha={linha} />}
      </Fragment>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <CardKpi
          icone={<Ship size={16} />}
          corIcone="bg-azul/10 text-azul"
          valor={resumo.total}
          rotulo={`Embarque${resumo.total === 1 ? "" : "s"} finalizado${resumo.total === 1 ? "" : "s"}`}
        />
        <CardKpi
          icone={<FileText size={16} />}
          corIcone="bg-azul/10 text-azul"
          valor={resumo.totalRdosLancados}
          rotulo="RDOs lançados"
        />
        <CardKpi
          icone={<Clock size={16} />}
          corIcone="bg-azul/10 text-azul"
          valor={resumo.totalDias}
          rotulo={`Diária${resumo.totalDias === 1 ? "" : "s"} registrada${resumo.totalDias === 1 ? "" : "s"}`}
        />
        <CardKpi
          icone={<CheckCircle2 size={16} />}
          corIcone="bg-verde/10 text-verde"
          valor={resumo.media !== null ? `${resumo.media}%` : "-"}
          rotulo="Taxa de conclusão"
        />
      </div>

      {resumo.total > 0 && (
        <div
          className={`flex items-start gap-2 rounded-lg px-4 py-3 mb-5 text-sm border ${
            resumo.comPendencia === 0 ? "bg-verde/10 text-verde border-verde/20" : "bg-amarelo/10 text-amarelo border-amarelo/20"
          }`}
        >
          <span className="mt-px">{resumo.comPendencia === 0 ? "✓" : "⚠"}</span>
          <p>
            {resumo.comPendencia === 0
              ? `Nenhuma pendência em aberto nesse recorte — os ${resumo.total} embarque${resumo.total === 1 ? "" : "s"} encontrado${resumo.total === 1 ? "" : "s"} foram todos concluídos${resumo.media !== null ? ` (${resumo.media}%)` : ""}.`
              : `${resumo.comPendencia} de ${resumo.total} embarque${resumo.total === 1 ? "" : "s"} nesse recorte ${resumo.comPendencia === 1 ? "está" : "estão"} com pendência — clica na linha pra ver o motivo.`}
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4 overflow-x-auto">
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm shrink-0">
          <button
            type="button"
            onClick={() => setModoAgrupamento("nenhum")}
            className={`px-3 py-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              modoAgrupamento === "nenhum" ? "bg-navy text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Sem agrupamento
          </button>
          <button
            type="button"
            onClick={() => setModoAgrupamento("pessoa")}
            className={`px-3 py-1.5 border-l border-gray-200 cursor-pointer transition-colors whitespace-nowrap ${
              modoAgrupamento === "pessoa" ? "bg-navy text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Agrupar por pessoa
          </button>
          <button
            type="button"
            onClick={() => setModoAgrupamento("plataforma")}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-200 cursor-pointer transition-colors whitespace-nowrap ${
              modoAgrupamento === "plataforma" ? "bg-navy text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Agrupar por plataforma
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                modoAgrupamento === "plataforma" ? "bg-white/20 text-white" : "bg-azul/10 text-azul"
              }`}
            >
              NOVO
            </span>
          </button>
        </div>
      </div>

      {linhasOrdenadas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
          Nenhum embarque encontrado com esse filtro.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full min-w-[1020px]">
            <thead>
              <tr className="bg-azul/[0.04] border-b border-gray-200">
                <CabecalhoOrdenavel label="Colaborador" coluna="nome" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} />
                <CabecalhoOrdenavel label="Empresa" coluna="empresa" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} />
                <CabecalhoOrdenavel label="Período" coluna="periodo" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} />
                <CabecalhoOrdenavel label="Duração" coluna="dias" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <CabecalhoOrdenavel label="RDOs" coluna="rdos" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <CabecalhoOrdenavel label="Status" coluna="pendencias" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <CabecalhoOrdenavel label="Conclusão" coluna="percentual" ordenarPor={ordenarPor} ordemAsc={ordemAsc} aoClicar={aoClicarColuna} alinhamento="center" />
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gruposPorPessoa
                ? gruposPorPessoa.map(([chave, grupo]) => (
                    <Fragment key={`grupo-${chave}`}>
                      <tr className="bg-navy/5">
                        <td colSpan={8} className="px-4 py-2 text-xs font-bold text-navy uppercase tracking-wide">
                          {grupo.nomeAtual} <span className="font-normal text-gray-400 normal-case">— {grupo.linhas.length} embarque{grupo.linhas.length === 1 ? "" : "s"}</span>
                        </td>
                      </tr>
                      {grupo.linhas.map((linha) => renderizarLinha(linha))}
                    </Fragment>
                  ))
                : gruposPorPlataforma
                ? gruposPorPlataforma.map(([chave, grupo]) => {
                    const obra = grupo.obraMaisRecente;
                    const cor = obra?.empresa ? corDaEmpresa(obra.empresa).fg : undefined;
                    return (
                      <Fragment key={`grupo-${chave}`}>
                        <tr className="bg-navy/5">
                          <td colSpan={8} className="px-4 py-2 text-xs font-bold text-navy uppercase tracking-wide">
                            <span className="inline-flex items-center gap-1.5">
                              {cor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />}
                              {obra?.nome || obra?.local_codigo || "Sem plataforma"}
                            </span>
                            {obra?.empresa && (
                              <span className="font-normal text-gray-400 normal-case ml-1">({obra.empresa})</span>
                            )}
                            <span className="font-normal text-gray-400 normal-case"> — {grupo.linhas.length} embarque{grupo.linhas.length === 1 ? "" : "s"}</span>
                          </td>
                        </tr>
                        {grupo.linhas.map((linha) => renderizarLinha(linha))}
                      </Fragment>
                    );
                  })
                : linhasDaPagina.map((linha) => renderizarLinha(linha))}
            </tbody>
          </table>
        </div>
      )}

      {modoAgrupamento === "nenhum" && linhasOrdenadas.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <p>
            Exibindo {inicioIntervalo}–{fimIntervalo} de {linhasOrdenadas.length} registro{linhasOrdenadas.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={paginaAtual === 1}
              onClick={() => setPagina(paginaAtual - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="w-7 h-7 flex items-center justify-center rounded-md bg-navy text-white text-xs font-bold">
              {paginaAtual}
            </span>
            <button
              type="button"
              disabled={paginaAtual === totalPaginas}
              onClick={() => setPagina(paginaAtual + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Clica numa linha pra ver os itens completos, a justificativa (se tiver) e baixar os PDFs dos RDOs. &quot;Período&quot;
        e &quot;Duração&quot; são calculados pelo intervalo real coberto pelos RDOs lançados.
      </p>
    </div>
  );
}
