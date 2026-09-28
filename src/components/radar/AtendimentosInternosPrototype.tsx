"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  UserPlus,
  Check,
  Building2,
  FileBox,
  CalendarDays,
  Bell,
} from "lucide-react";
import styles from "./AtendimentosInternosPrototype.module.css";

/**
 * Protótipo visual do "Sistema de Atendimentos Internos" (19/09, a pedido
 * do Rafael) - reaproveita EXATAMENTE a paleta e o organograma que já
 * tinham sido apresentados fora do sistema (ver Claude Project), agora
 * "portados" pra dentro do Sync ERP, numa aba só dele/admin (ver
 * `/radar/page.tsx`). É só protótipo: nenhum clique aqui grava nada no
 * banco - "Puxar atendimento" e as abas só mudam estado local, pra dar
 * a sensação de like de verdade numa apresentação. Sem nenhuma chamada
 * de rede.
 */

type Prioridade = "alta" | "normal" | "baixa";

type Ticket = {
  id: string;
  codigo: string;
  projeto: string;
  cliente: string;
  item: string;
  abertoEm: string;
  diasAberto: number;
  prioridade: Prioridade;
};

const ABERTOS: Ticket[] = [
  { id: "t1", codigo: "#ATD-1042", projeto: "Modelagem Gran", cliente: "GRAN", item: "Spool GRAN — 4 pçs", abertoEm: "15/09/2026", diasAberto: 2, prioridade: "alta" },
  { id: "t2", codigo: "#ATD-1038", projeto: "Suporte P76", cliente: "PETROBRAS", item: "Suporte estrutural", abertoEm: "14/09/2026", diasAberto: 3, prioridade: "normal" },
  { id: "t3", codigo: "#ATD-1035", projeto: "Spool Ocyan", cliente: "Ocyan", item: "Spool — 2 pçs", abertoEm: "14/09/2026", diasAberto: 3, prioridade: "baixa" },
];

const ANDAMENTO: { id: string; codigo: string; projeto: string; com: string; diasAberto: number }[] = [
  { id: "a1", codigo: "#ATD-1031", projeto: "SBM", com: "Raphael", diasAberto: 3 },
  { id: "a2", codigo: "#ATD-1028", projeto: "Ocyan", com: "Lázaro", diasAberto: 6 },
];

const CONCLUIDOS: { id: string; codigo: string; projeto: string; com: string; quando: string }[] = [
  { id: "c1", codigo: "#ATD-1019", projeto: "MOTA", com: "Gabriel", quando: "12/09/2026" },
  { id: "c2", codigo: "#ATD-1014", projeto: "MODEC", com: "Julia", quando: "10/09/2026" },
  { id: "c3", codigo: "#ATD-1009", projeto: "SBM", com: "Erick", quando: "08/09/2026" },
];

const PRIORIDADE_LABEL: Record<Prioridade, string> = { alta: "Alta prioridade", normal: "Normal", baixa: "Baixa" };
const PRIORIDADE_PILL: Record<Prioridade, string> = { alta: "Prioritária", normal: "Normal", baixa: "Baixa" };

function ArrowRight() {
  return (
    <svg viewBox="0 0 30 12" fill="none">
      <path d="M0 6 H24 M18 1 L24 6 L18 11" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ArrowSmall() {
  return (
    <svg viewBox="0 0 20 11" fill="none">
      <path d="M0 5.5 H14 M10 1 L14 5.5 L10 10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Tela "Fila do setor" - a peça central do protótipo, reproduzindo o
 * mockup que o Rafael desenhou/aprovou. Aba "Abertos" deixa puxar de
 * verdade (estado local); "Em andamento" e "Concluídos" são só listagem. */
function FilaDoSetor() {
  const [aba, setAba] = useState<"abertos" | "andamento" | "concluidos">("abertos");
  const [assumidos, setAssumidos] = useState<Set<string>>(new Set());
  const [ordemAsc, setOrdemAsc] = useState(true);

  const abertosOrdenados = useMemo(() => {
    const copia = [...ABERTOS];
    copia.sort((a, b) => (ordemAsc ? b.diasAberto - a.diasAberto : a.diasAberto - b.diasAberto));
    return copia;
  }, [ordemAsc]);

  return (
    <div className={styles.filaCard}>
      <div className={styles.filaTop}>
        <div className={styles.filaTitleRow}>
          <div className={styles.filaIcon}>
            <Boxes size={20} />
          </div>
          <div>
            <div className={styles.filaTitle}>Fila do setor · Modelagem</div>
            <p className={styles.filaDesc}>
              Atendimentos disponíveis para o setor de Modelagem. Qualquer membro do setor pode puxar um atendimento.
            </p>
          </div>
        </div>
        <div className={styles.membrosCard}>
          <div className={styles.membrosLabel}>3 membros no setor</div>
          <div className={styles.membrosAvatares}>
            <span className={styles.avatar}>AN</span>
            <span className={styles.avatar}>GB</span>
            <span className={styles.avatar}>RP</span>
            <span className={styles.avatarMore}>···</span>
          </div>
        </div>
      </div>

      <div className={styles.tabRow}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${aba === "abertos" ? styles.tabBtnActive : ""}`}
            onClick={() => setAba("abertos")}
          >
            Abertos <span className={styles.tabCount}>{ABERTOS.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${aba === "andamento" ? styles.tabBtnActive : ""}`}
            onClick={() => setAba("andamento")}
          >
            Em andamento <span className={styles.tabCount}>{ANDAMENTO.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${aba === "concluidos" ? styles.tabBtnActive : ""}`}
            onClick={() => setAba("concluidos")}
          >
            Concluídos <span className={styles.tabCount}>12</span>
          </button>
        </div>
        {aba === "abertos" && (
          <button type="button" className={styles.sortBtn} onClick={() => setOrdemAsc((v) => !v)}>
            <ArrowUpDown size={13} /> {ordemAsc ? "Mais antigos" : "Mais recentes"}
          </button>
        )}
      </div>

      {aba === "abertos" && (
        <div className={styles.ticketList}>
          {abertosOrdenados.map((t) => {
            const assumido = assumidos.has(t.id);
            return (
              <div
                key={t.id}
                className={`${styles.ticket} ${styles[`ticket${t.prioridade === "alta" ? "Alta" : t.prioridade === "normal" ? "Normal" : "Baixa"}`]} ${assumido ? styles.ticketAssumido : ""}`}
              >
                <div className={styles.ticketMain}>
                  <div className={`${styles.ticketPriority} ${styles[`priority${t.prioridade === "alta" ? "Alta" : t.prioridade === "normal" ? "Normal" : "Baixa"}`]}`}>
                    <span className={`${styles.priorityDot} ${styles[`dot${t.prioridade === "alta" ? "Alta" : t.prioridade === "normal" ? "Normal" : "Baixa"}`]}`} />
                    {PRIORIDADE_LABEL[t.prioridade]}
                  </div>
                  <div className={styles.ticketNome}>
                    <span>{t.projeto}</span>
                    <span className={styles.ticketId}>{t.codigo}</span>
                  </div>
                  <div className={styles.ticketMeta}>
                    <span><Building2 size={12} /> {t.cliente}</span>
                    <span><FileBox size={12} /> {t.item}</span>
                    <span><CalendarDays size={12} /> Aberto em {t.abertoEm} ({t.diasAberto} dias)</span>
                  </div>
                </div>
                <div className={styles.ticketRight}>
                  <span className={`${styles.priorityPill} ${styles[`pill${t.prioridade === "alta" ? "Alta" : t.prioridade === "normal" ? "Normal" : "Baixa"}`]}`}>
                    {PRIORIDADE_PILL[t.prioridade]}
                  </span>
                  {assumido ? (
                    <span className={styles.assumidoTag}>
                      <Check size={14} /> Você assumiu
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.puxarBtn}
                      onClick={() => setAssumidos((atual) => new Set(atual).add(t.id))}
                    >
                      <UserPlus size={14} /> Puxar atendimento
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aba === "andamento" && (
        <div className={styles.ticketList}>
          {ANDAMENTO.map((t) => (
            <div key={t.id} className={`${styles.ticket} ${styles.ticketNormal}`}>
              <div className={styles.ticketMain}>
                <div className={styles.ticketNome}>
                  <span>{t.projeto}</span>
                  <span className={styles.ticketId}>{t.codigo}</span>
                </div>
                <div className={styles.ticketMeta}>
                  <span>com {t.com}</span>
                  <span><CalendarDays size={12} /> há {t.diasAberto} dias</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === "concluidos" && (
        <div className={styles.ticketList}>
          {CONCLUIDOS.map((t) => (
            <div key={t.id} className={`${styles.ticket} ${styles.ticketAssumido}`}>
              <div className={styles.ticketMain}>
                <div className={styles.ticketNome}>
                  <span>{t.projeto}</span>
                  <span className={styles.ticketId}>{t.codigo}</span>
                </div>
                <div className={styles.ticketMeta}>
                  <span>por {t.com}</span>
                  <span><CalendarDays size={12} /> concluído em {t.quando}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.filaFooter}>
        <span>
          Mostrando {aba === "abertos" ? ABERTOS.length : aba === "andamento" ? ANDAMENTO.length : CONCLUIDOS.length} de{" "}
          {aba === "abertos" ? ABERTOS.length : aba === "andamento" ? ANDAMENTO.length : 12} atendimentos
        </span>
        <div className={styles.pageBtns}>
          <button type="button" className={styles.pageBtn} aria-label="Página anterior"><ChevronLeft size={14} /></button>
          <span className={styles.pageNum}>1</span>
          <button type="button" className={styles.pageBtn} aria-label="Próxima página"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className={styles.hint}>
        <Bell size={13} /> Clique em &quot;Puxar atendimento&quot; pra ver a fila reagir — é só visual, nada é salvo.
      </div>
    </div>
  );
}

export function AtendimentosInternosPrototype() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>LS3D · Escritório · Protótipo visual</span>
          <h1 className={styles.h1}>Sistema de Atendimentos</h1>
          <p className={styles.subtitle}>
            Um ERP web pra controlar, de ponta a ponta, todo projeto de engenharia que passa pelo escritório — do
            levantamento em campo até a entrega ao cliente. Inspirado no modelo da Alterdata, onde tudo tramita em
            &quot;atendimentos&quot; que andam de setor em setor.
          </p>
          <div className={styles.metaRow}>
            <span className={`${styles.pill} ${styles.pillStatus}`}><span className={styles.dot} />Protótipo — nenhum botão grava nada ainda</span>
            <span className={styles.pill}>Separado do CRM LS3D (offline)</span>
            <span className={styles.pill}>Gerente: Uilian</span>
            <span className={styles.pill}>Uso: só escritório</span>
          </div>
        </header>

        <FilaDoSetor />

        {/* 01 - Pipeline */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>01</span>
            <h2 className={styles.h2}>Os setores por onde um atendimento passa</h2>
          </div>
          <p className={styles.sectionDesc}>
            As etapas são fixas, mas a ordem não é rígida — um atendimento pode pular setores dependendo do tipo de
            trabalho. Cada atendimento é sempre de um SETOR, nunca de uma pessoa — ver seção 02.
          </p>
          <div className={styles.pipeline}>
            {[
              { idx: "01 — CAMPO", nome: "Levantamento / Escaneamento", quem: "técnico em campo", tempo: "gera nuvem de pontos + RDO com TAG por peça" },
              { idx: "02 — CYCLONE", nome: "Tratamento de Nuvem de Pontos", quem: "Geraldo · Jailson · João", tempo: "alinhamento cena a cena — 1 a 15 dias" },
              { idx: "03 — SETOR", nome: "Produção", quem: "reconstrói o modelo", tempo: "monta o projeto com todas as medidas" },
              { idx: "04 — SETOR", nome: "Modelagem", quem: "modela spools / elementos", tempo: "também recebe direto do levantamento" },
              { idx: "05 — 3 REVISORES", nome: "Revisão", quem: "ex.: Erick · Julia · Anthony", tempo: "achou erro → volta pra quem fez" },
              { idx: "06 — ENTREGA", nome: "RDV & Entrega", quem: "ex.: Zé", tempo: "gera RDV, fala com o cliente" },
            ].map((s, i, arr) => (
              <span key={s.idx} style={{ display: "flex" }}>
                <span className={styles.stage}>
                  <span className={styles.stageIdx}>{s.idx}</span>
                  <span className={styles.h3}>{s.nome}</span>
                  <span className={styles.stageWho}>{s.quem}</span>
                  <span className={styles.stageTime}>{s.tempo}</span>
                </span>
                {i < arr.length - 1 && <span className={styles.arrow}><ArrowRight /></span>}
              </span>
            ))}
          </div>
        </section>

        {/* 02 - Setor não pessoa */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>02</span>
            <h2 className={styles.h2}>Atendimento é do setor, não da pessoa</h2>
          </div>
          <div className={styles.callout}>
            <div>
              <p className={styles.calloutTitle}><strong>Ninguém escolhe quem vai pegar o próximo passo.</strong></p>
              <p>
                Quem passa o atendimento adiante só escolhe o setor — nunca uma pessoa específica. O atendimento fica
                visível pra todo mundo daquele setor, e qualquer um pode &quot;puxar&quot; pra si livremente.
              </p>
              <p>Exceção: em caso muito urgente, o Uilian (Gerente) pode designar diretamente uma pessoa específica.</p>
            </div>
            <div className={styles.membrosCard}>
              <div className={styles.membrosLabel}>Fila do setor · Modelagem</div>
              <div className={styles.membrosAvatares} style={{ marginBottom: 10 }}>
                <span className={styles.avatar}>AN</span>
                <span className={styles.avatar}>GB</span>
                <span className={styles.avatar}>RP</span>
              </div>
            </div>
          </div>

          <div className={styles.detailBlock}>
            <h4>Como isso funciona, passo a passo</h4>
            <div className={styles.stateFlow}>
              <span className={styles.stateNode}>Aberto no setor</span>
              <span className={styles.stateArrow}><ArrowSmall /></span>
              <span className={styles.stateNode}>Em andamento (assumido)</span>
              <span className={styles.stateArrow}><ArrowSmall /></span>
              <span className={styles.stateNode}>Repassado / Concluído</span>
              <span className={styles.stateArrow}><ArrowSmall /></span>
              <span className={`${styles.stateNode} ${styles.stateBranch}`}>Devolvido (revisão achou erro)</span>
            </div>

            <h4 style={{ marginTop: 22 }}>E se dois clicarem no mesmo instante?</h4>
            <div className={styles.racePanel}>
              <div className={`${styles.raceCard} ${styles.raceWin}`}>
                <span className={styles.raceClick}>AN clica às 14:02:03.184</span>
                <div className={styles.raceResult}>✓ Atendimento assumido</div>
              </div>
              <div className={`${styles.raceCard} ${styles.raceLose}`}>
                <span className={styles.raceClick}>RP clica às 14:02:03.191</span>
                <div className={styles.raceResult}>✕ Já foi assumido por AN</div>
              </div>
            </div>
            <div className={styles.codeNote}>
              Mesma garantia usada no lançamento de numeração dos certificados: uma trava atômica no banco decide
              quem chegou primeiro, na mesma operação que muda o status.
              <span className={styles.monoLine}>UPDATE atendimentos SET status=&apos;em_andamento&apos;, assumido_por=:usuario WHERE id=:id AND status=&apos;aberto&apos;</span>
            </div>
          </div>
        </section>

        {/* 03 - Exemplo real GRAN */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>03</span>
            <h2 className={styles.h2}>Exemplo real, do início ao fim: GRAN</h2>
          </div>
          <div className={styles.timeline}>
            {[
              { quem: "Uilian", texto: "Abre um atendimento de Levantamento (escaneamento) de spool na GRAN e manda para o Gustavo, técnico novo na empresa." },
              { quem: "Gustavo", texto: "Recebe o atendimento, pega os equipamentos e vai até a GRAN fazer o levantamento." },
              { quem: "Gustavo", texto: "De volta, processa a nuvem, separa os COE de cada spool e gera um RDO específico com a TAG de cada spool." },
              { quem: "Gustavo → Setor", texto: "Manda o atendimento pro setor Modelagem — fica aberto pra todo mundo do setor." },
              { quem: "Modelagem", texto: "Alguém do setor assume o atendimento e modela os spools." },
              { quem: "Zé", texto: "Recebe o atendimento, gera o RDV e fala direto com o cliente — podendo também acionar o Uilian." },
            ].map((s, i) => (
              <div key={i} className={styles.tlStep}>
                <span className={styles.whoTag}>{s.quem}</span>
                <p>{s.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 04 - Painel de prioridades */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>04</span>
            <h2 className={styles.h2}>Painel de atendimentos — o que o Uilian vê</h2>
          </div>
          <div className={styles.board}>
            <div className={styles.boardCol}>
              <h4>Prioritários</h4>
              <div className={`${styles.card} ${styles.cardUrgent}`}>
                <div className={styles.cardTop}><span className={styles.proj}>Projeto MOTA</span><span className={styles.rev}>REV 2</span></div>
                <div className={styles.cardMeta}><span>4 dias em atendimento</span><span className={styles.prazo}>prazo 10d</span></div>
                <div className={styles.resp}>Gabriel</div>
              </div>
              <div className={`${styles.card} ${styles.cardUrgent}`}>
                <div className={styles.cardTop}><span className={styles.proj}>Modelagem Gran</span></div>
                <div className={styles.cardMeta}><span>0 dias em atendimento</span><span className={styles.prazo}>prazo 1d</span></div>
                <div className={styles.resp}>André</div>
              </div>
            </div>
            <div className={styles.boardCol}>
              <h4>Nuvem de pontos</h4>
              <div className={styles.card}>
                <div className={styles.cardTop}><span className={styles.proj}>P76</span></div>
                <div className={styles.cardMeta}><span>recebida 10/08</span><span className={styles.prazo}>entrega 23/08</span></div>
                <div className={styles.resp}>Geraldo</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTop}><span className={styles.proj}>P77</span></div>
                <div className={styles.cardMeta}><span>recebida 10/08</span><span className={styles.prazo}>entrega 15/08</span></div>
                <div className={styles.resp}>Jailson</div>
              </div>
            </div>
            <div className={styles.boardCol}>
              <h4>Produção</h4>
              <div className={styles.card}>
                <div className={styles.cardTop}><span className={styles.proj}>SBM</span></div>
                <div className={styles.cardMeta}><span>3 dias em atendimento</span><span className={styles.prazo}>prazo 15d</span></div>
                <div className={styles.resp}>Raphael</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTop}><span className={styles.proj}>Ocyan</span></div>
                <div className={styles.cardMeta}><span>6 dias em atendimento</span><span className={styles.prazo}>prazo 20d</span></div>
                <div className={styles.resp}>Lázaro</div>
              </div>
            </div>
            <div className={styles.boardCol}>
              <h4>Revisão</h4>
              <div className={styles.card}>
                <div className={styles.cardTop}><span className={styles.proj}>SBM</span><span className={styles.rev}>REV 1</span></div>
                <div className={styles.resp}>Erick — revisando</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTop}><span className={styles.proj}>MODEC</span><span className={styles.rev}>REV 1</span></div>
                <div className={styles.resp}>Julia — revisando</div>
              </div>
            </div>
          </div>
        </section>

        {/* 05 - Outras peças */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>05</span>
            <h2 className={styles.h2}>Outras peças do sistema</h2>
          </div>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>CO</div>
              <h3>Cadastro de empresas</h3>
              <p>Empresas que solicitam atendimentos, com pessoas de contato vinculadas — nome, e-mail, telefone.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>◵</div>
              <h3>Histórico completo</h3>
              <p>Todo atendimento registrado do início ao fim — quem escaneou, quem revisou e o que apontou.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>⎘</div>
              <h3>Anexos</h3>
              <p>PDF, imagens, plantas, RDV, P&amp;ID. Nuvens de pontos ficam no servidor próprio da empresa.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💬</div>
              <h3>Chat interno</h3>
              <p>Só 1-a-1, sem grupos, sem emojis — recado rápido pra quem trabalha de fone o dia inteiro.</p>
            </div>
            <div className={`${styles.feature} ${styles.featureOpen}`}>
              <div className={styles.featureIcon}>?</div>
              <h3>Carga de trabalho</h3>
              <p>Peso de cada atendimento, não só a quantidade. Ainda sem definição de como medir.</p>
              <span className={styles.tagOpen}>em aberto</span>
            </div>
          </div>
        </section>

        {/* 06 - Painel do gerente */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>06</span>
            <h2 className={styles.h2}>Painel do Gerente</h2>
          </div>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Tempo médio / setor</div>
              <div className={styles.metricValue}>6<span className={styles.metricUnit}> dias</span></div>
            </div>
            <div className={`${styles.metric} ${styles.metricFlag}`}>
              <div className={styles.metricLabel}>Gargalo atual</div>
              <div className={styles.metricValue}>Nuvem de Pontos</div>
            </div>
            <div className={`${styles.metric} ${styles.metricFlag}`}>
              <div className={styles.metricLabel}>Atendimentos parados</div>
              <div className={styles.metricValue}>3</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Em revisão agora</div>
              <div className={styles.metricValue}>3</div>
            </div>
          </div>
        </section>

        {/* 07 - Ponte com CRM LS3D */}
        <section className={styles.section} style={{ marginBottom: 0 }}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionNum} ${styles.mono}`}>07</span>
            <h2 className={styles.h2}>Em aberto: ponte com o CRM LS3D</h2>
          </div>
          <div className={styles.callout} style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <p className={styles.calloutTitle}><strong>Dois sistemas, dois mundos.</strong></p>
              <p>
                O CRM LS3D já roda offline, pensado pra internet limitada em plataforma. O Sistema de Atendimentos é
                o oposto: web, rápido, online, só pra quem está no escritório. Ainda buscando ideias de como conectar
                os dois.
              </p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Rafael Carneiro — protótipo visual, sem funcionalidade real ainda</span>
          <span>Radar · Sistema de Atendimentos Internos</span>
        </footer>
      </div>
    </div>
  );
}
