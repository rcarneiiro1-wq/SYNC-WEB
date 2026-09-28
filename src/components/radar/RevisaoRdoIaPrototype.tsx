"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  BellRing,
  ChevronDown,
} from "lucide-react";

/**
 * Protótipo visual "Revisão de RDOs (IA)" (28/09, a pedido do Rafael) -
 * segunda peça do Radar, mesmo esquema de acesso da página (só admin).
 * Ideia: uma IA lê o texto livre da `descricao` de cada RDO (não as
 * caixinhas de SIM/N/A, pouco confiáveis) e sinaliza se existe uma
 * atividade real descrita - útil pros casos em que dá algum impedimento
 * (ex: gangway desconectada) mas ainda precisa constar alguma atividade
 * de verdade pra Petrobras liberar a medição. A Raquel é quem revisaria
 * essa fila antes de tudo seguir.
 *
 * Igual ao resto do Radar: PURO PROTÓTIPO. Nenhum clique aqui lê ou
 * grava nada no banco - os dados são de exemplo (fixos) e os botões só
 * mudam estado local, pra dar a sensação de algo funcionando de verdade
 * numa demonstração. "Pedir correção ao colaborador" abre um aviso
 * dizendo o que SERIA disparado (notificação no sistema + WhatsApp) -
 * nenhuma mensagem é enviada de verdade ainda, porque a integração de
 * WhatsApp nem existe hoje. Quando o Fabiano aprovar a ideia de verdade,
 * essa tela vira o rascunho de onde partir pra implementação real.
 */

type StatusIa = "ok" | "revisar" | "pendente";

type RdoExemplo = {
  id: string;
  embarque: string;
  colaborador: string;
  funcao: string;
  iniciais: string;
  numero: string;
  data: string;
  resumo: string;
  descricao: { texto: string; destaque?: string; destaqueBom?: boolean }[];
  status: StatusIa;
  alerta?: string;
};

const RDOS_EXEMPLO: RdoExemplo[] = [
  {
    id: "tam-004-rc",
    embarque: "Almirante Tamandaré",
    colaborador: "Rafael Carneiro",
    funcao: "Projetista I / Piloto Drone",
    iniciais: "RC",
    numero: "RDO 004",
    data: "12/09/2026",
    resumo: "“Gangway desconectada, chuva forte o dia todo. Aguardando liberação.”",
    status: "revisar",
    alerta:
      "Nenhuma atividade real foi descrita neste RDO — o texto só justifica por que o trabalho não aconteceu (gangway/chuva). Não há menção a processamento de dados, registro/alinhamento de nuvens, organização de fotos ou qualquer outra tarefa executada no período.",
    descricao: [
      { texto: "07:00hrs – Início das Atividades." },
      {
        texto:
          "Gangway do flotel desconectada durante toda a manhã, sem previsão de religação. Chuva forte por praticamente todo o período.",
        destaque: "amarelo",
      },
      {
        texto:
          "Não foi possível realizar o embarque para dar continuidade ao escaneamento. Equipe aguardando liberação da gangway e melhora das condições climáticas.",
      },
      { texto: "19:00hrs – Fim das atividades do dia." },
    ],
  },
  {
    id: "tam-005-gr",
    embarque: "Almirante Tamandaré",
    colaborador: "Gustavo Ricardo",
    funcao: "Tec Scanner / Observador",
    iniciais: "GR",
    numero: "RDO 005",
    data: "13/09/2026",
    resumo: "Sincronizado às 19:42 — ainda não analisado.",
    status: "pendente",
    descricao: [
      {
        texto:
          "O RDO chegou agora do sincronismo. A análise da IA roda em segundo plano e o status atualiza sozinho em poucos minutos.",
      },
    ],
  },
  {
    id: "bar-006-rc",
    embarque: "Almirante Barroso",
    colaborador: "Rafael Carneiro",
    funcao: "Projetista I / Piloto Drone",
    iniciais: "RC",
    numero: "RDO 006",
    data: "22/08/2026",
    resumo: "“...continuidade ao processo de registro e alinhamento de nuvens de pontos...”",
    status: "ok",
    descricao: [
      {
        texto:
          "Entretanto, devido ao posicionamento do navio de offloading, a operação de voo não foi autorizada pela Marinha.",
      },
      {
        texto:
          "Paralelamente, foi dada continuidade ao processo de registro e alinhamento de nuvens de pontos, além do tratamento das fotos 360°, adicionando latitude, longitude e altitude.",
        destaque: "verde",
        destaqueBom: true,
      },
      { texto: "19:00hrs – Encerramento das atividades e elaboração do RDO." },
    ],
  },
  {
    id: "bar-006-gr",
    embarque: "Almirante Barroso",
    colaborador: "Gustavo Ricardo",
    funcao: "Tec Scanner / Observador",
    iniciais: "GR",
    numero: "RDO 006",
    data: "22/08/2026",
    resumo: "“...continuidade ao processo de registro e alinhamento de nuvens de pontos...”",
    status: "ok",
    descricao: [
      {
        texto:
          "Mesma justificativa de impedimento do colega, mas com a mesma atividade de bastidor descrita: registro e alinhamento de nuvens de pontos e tratamento das fotos 360°, conforme alinhado com a equipe INFOTEC.",
        destaque: "verde",
        destaqueBom: true,
      },
    ],
  },
  {
    id: "bar-002-rc",
    embarque: "Almirante Barroso",
    colaborador: "Rafael Carneiro",
    funcao: "Projetista I / Piloto Drone",
    iniciais: "RC",
    numero: "RDO 002",
    data: "18/08/2026",
    resumo: "“...visita técnica em área, percorrendo todos os pontos de decolagem...”",
    status: "ok",
    descricao: [
      { texto: "Vento acima do limite operacional impediu o voo com drone." },
      {
        texto:
          "Aproveitando o período, foi realizada uma visita técnica em área, percorrendo todos os pontos de decolagem previstos, incluindo helideck e proa, verificando condições físicas e alinhamento com a equipe de segurança da plataforma.",
        destaque: "verde",
        destaqueBom: true,
      },
    ],
  },
  {
    id: "bar-002-gr",
    embarque: "Almirante Barroso",
    colaborador: "Gustavo Ricardo",
    funcao: "Tec Scanner / Observador",
    iniciais: "GR",
    numero: "RDO 002",
    data: "18/08/2026",
    resumo: "“...visita técnica em área, percorrendo todos os pontos de decolagem...”",
    status: "ok",
    descricao: [
      {
        texto: "Mesmo impedimento (vento) e mesma atividade registrada: visita técnica aos pontos de decolagem, incluindo helideck e proa.",
        destaque: "verde",
        destaqueBom: true,
      },
    ],
  },
];

const STATUS_LABEL: Record<StatusIa, string> = { ok: "OK", revisar: "Revisar", pendente: "Pendente" };

function badgeClasse(status: StatusIa) {
  if (status === "ok") return "text-verde bg-verde/10";
  if (status === "revisar") return "text-amarelo bg-amarelo/15";
  return "text-gray-500 bg-gray-100";
}

function pontoClasse(status: StatusIa) {
  if (status === "ok") return "bg-verde";
  if (status === "revisar") return "bg-amarelo";
  return "bg-gray-400";
}

function iniciaisCor(iniciais: string) {
  return iniciais === "RC" ? "bg-azul/10 text-azul-escuro" : "bg-navy/10 text-navy";
}

/** Estado local de um RDO que a Raquel já mexeu nesta demonstração -
 * sobrepõe o status/alerta de exemplo, só na sessão do navegador. */
type Acao = { status: StatusIa; corrigidoEm?: string };

export function RevisaoRdoIaPrototype() {
  const [acoes, setAcoes] = useState<Record<string, Acao>>({});
  const [abertos, setAbertos] = useState<Set<string>>(new Set(["tam-004-rc"]));
  const [filtro, setFiltro] = useState<StatusIa | "todos">("todos");
  const [avisoAtivo, setAvisoAtivo] = useState<string | null>(null);

  const rdos = useMemo(
    () => RDOS_EXEMPLO.map((r) => ({ ...r, status: acoes[r.id]?.status ?? r.status })),
    [acoes]
  );

  const contagem = useMemo(
    () => ({
      total: rdos.length,
      revisar: rdos.filter((r) => r.status === "revisar").length,
      ok: rdos.filter((r) => r.status === "ok").length,
      pendente: rdos.filter((r) => r.status === "pendente").length,
    }),
    [rdos]
  );

  const visiveis = filtro === "todos" ? rdos : rdos.filter((r) => r.status === filtro);
  const grupos = useMemo(() => {
    const porEmbarque = new Map<string, typeof visiveis>();
    for (const r of visiveis) {
      const lista = porEmbarque.get(r.embarque) ?? [];
      lista.push(r);
      porEmbarque.set(r.embarque, lista);
    }
    return Array.from(porEmbarque.entries());
  }, [visiveis]);

  const alternar = (id: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const pedirCorrecao = (rdo: RdoExemplo) => {
    setAcoes((atual) => ({ ...atual, [rdo.id]: { status: "revisar", corrigidoEm: undefined } }));
    setAvisoAtivo(rdo.id);
  };

  const marcarRevisado = (id: string) => {
    setAcoes((atual) => ({ ...atual, [id]: { status: "ok" } }));
    setAvisoAtivo(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs text-violet-700">
        <span className="font-bold">Protótipo</span> — dados de exemplo, nada aqui lê ou grava no banco real. &quot;Pedir
        correção&quot; só mostra o que SERIA disparado (notificação + WhatsApp) — ainda não manda nada de verdade.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="text-xl font-extrabold text-navy tabular-nums">{contagem.total}</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">RDOs analisados</div>
        </div>
        <div className="rounded-lg border border-amarelo/30 bg-amarelo/10 px-4 py-3">
          <div className="text-xl font-extrabold text-amarelo tabular-nums">{contagem.revisar}</div>
          <div className="text-[11px] font-semibold text-amarelo/80 uppercase tracking-wide">Precisam revisão</div>
        </div>
        <div className="rounded-lg border border-verde/30 bg-verde/10 px-4 py-3">
          <div className="text-xl font-extrabold text-verde tabular-nums">{contagem.ok}</div>
          <div className="text-[11px] font-semibold text-verde/80 uppercase tracking-wide">OK</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="text-xl font-extrabold text-gray-500 tabular-nums">{contagem.pendente}</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Pendentes</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {(["todos", "revisar", "ok", "pendente"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
              filtro === f ? "bg-navy text-white border-navy" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {f === "todos" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {grupos.map(([embarque, lista]) => (
        <div key={embarque} className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{embarque}</span>
            <span className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {lista.map((rdo) => {
              const aberto = abertos.has(rdo.id);
              return (
                <div key={rdo.id}>
                  <button
                    type="button"
                    onClick={() => alternar(rdo.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
                  >
                    <span className={`flex-none w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center ${iniciaisCor(rdo.iniciais)}`}>
                      {rdo.iniciais}
                    </span>
                    <span className="w-40 flex-none min-w-0">
                      <span className="block text-sm font-bold text-navy truncate">{rdo.colaborador}</span>
                      <span className="block text-[11px] text-gray-400 truncate">{rdo.funcao}</span>
                    </span>
                    <span className="w-32 flex-none">
                      <span className="block text-sm font-bold text-gray-700">{rdo.numero}</span>
                      <span className="block text-[11px] text-gray-400">{rdo.data}</span>
                    </span>
                    <span className="flex-1 min-w-0 text-xs text-gray-500 truncate hidden md:block">{rdo.resumo}</span>
                    <span className={`flex-none inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClasse(rdo.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pontoClasse(rdo.status)}`} />
                      {STATUS_LABEL[rdo.status]}
                    </span>
                    <ChevronDown size={16} className={`flex-none text-gray-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
                  </button>

                  {aberto && (
                    <div className="px-4 pb-4 pl-[3.75rem]">
                      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
                        <div className="rounded-md border border-gray-100 bg-gray-50 px-3.5 py-3 text-[13px] leading-relaxed text-gray-700 space-y-2.5">
                          {rdo.descricao.map((p, i) => (
                            <p
                              key={i}
                              className={
                                p.destaque === "amarelo"
                                  ? "bg-amarelo/20 text-amarelo px-1 rounded font-semibold"
                                  : p.destaque === "verde"
                                    ? "bg-verde/15 text-[#33500f] px-1 rounded font-semibold"
                                    : ""
                              }
                            >
                              {p.texto}
                            </p>
                          ))}
                        </div>

                        <div>
                          {rdo.status === "revisar" && rdo.alerta && (
                            <div className="rounded-md border border-amarelo/30 bg-amarelo/10 px-3.5 py-3 text-[13px] leading-relaxed text-[#6b4b00]">
                              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide mb-1.5">
                                <AlertTriangle size={13} /> Alerta da IA
                              </div>
                              {rdo.alerta}
                              <div className="flex flex-wrap gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => pedirCorrecao(rdo)}
                                  className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-bold px-3 py-2 rounded-md cursor-pointer hover:bg-navy-light"
                                >
                                  <MessageCircleMore size={14} /> Pedir correção ao colaborador
                                </button>
                                <button
                                  type="button"
                                  onClick={() => marcarRevisado(rdo.id)}
                                  className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold px-3 py-2 rounded-md cursor-pointer hover:border-gray-300"
                                >
                                  <CheckCircle2 size={14} /> Marcar como revisado
                                </button>
                              </div>

                              {avisoAtivo === rdo.id && (
                                <div className="mt-3 rounded-md border border-navy/15 bg-white px-3 py-2.5 text-[12.5px] text-gray-600">
                                  <p className="font-bold text-navy mb-1 flex items-center gap-1.5">
                                    <BellRing size={13} className="text-azul" /> Solicitação registrada (demonstração)
                                  </p>
                                  Nesta tela de verdade, dois avisos seriam disparados agora: uma{" "}
                                  <strong>notificação no sistema</strong>, que apareceria pro {rdo.colaborador.split(" ")[0]} ao
                                  abrir o desktop, e uma <strong>mensagem no WhatsApp</strong> dele avisando que o RDO {rdo.numero}{" "}
                                  precisa de ajuste. Nenhuma das duas foi enviada de verdade — essa parte só liga quando a
                                  integração de WhatsApp existir.
                                </div>
                              )}
                            </div>
                          )}

                          {rdo.status === "ok" && (
                            <div className="rounded-md border border-verde/30 bg-verde/10 px-3.5 py-3 text-[13px] leading-relaxed text-[#33500f]">
                              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide mb-1.5">
                                <CheckCircle2 size={13} /> Atividade real identificada
                              </div>
                              O texto descreve uma tarefa concreta e verificável, mesmo com o impedimento relatado. Nenhuma
                              ação necessária.
                            </div>
                          )}

                          {rdo.status === "pendente" && (
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3.5 py-3 text-[13px] leading-relaxed text-gray-500">
                              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide mb-1.5">
                                <Clock3 size={13} /> Aguardando análise
                              </div>
                              Assim que a IA processar este RDO, o status muda pra OK ou Revisar sozinho.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
