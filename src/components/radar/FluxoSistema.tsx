"use client";

import { useState, type ElementType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cloud,
  Eye,
  FileArchive,
  FileCode2,
  FileText,
  Layers,
  MessageCircle,
  Package,
  RotateCcw,
  Send,
  UserPlus,
} from "lucide-react";
import estilos from "./FluxoSistema.module.css";

/** "Fluxo do Sistema" (19/09, a pedido do Rafael) - segunda peça do
 * protótipo do Radar: um passo-a-passo guiado de 2 telas que conta, do
 * início ao fim, o exemplo real que ele descreveu (Uilian abre o
 * atendimento pro Gustavo ir na GRAN -> Gustavo faz o levantamento e
 * repassa pra Modelagem -> André modela e repassa pra RDV & Entrega ->
 * Zé gera o RDV, fala com o cliente e finaliza). Puro protótipo: nada
 * aqui lê ou grava no banco, é só a narrativa em forma de conversa
 * estilo WhatsApp, exatamente como o Rafael pediu ("Trabalha a ideia
 * cmg" -> "aquele fluxo do atendimento do Gustavo ficou muuuuito bom é
 * exatamente aquilo"). */

type Passo = 1 | 2;

type Autor = "Uilian" | "Gustavo" | "André" | "Zé";

const CORES: Record<Autor, string> = {
  Uilian: "var(--violet)",
  Gustavo: "var(--blue)",
  André: "var(--accent)",
  Zé: "var(--accent-2)",
};

const CORES_SOFT: Record<Autor, string> = {
  Uilian: "var(--violet-soft)",
  Gustavo: "var(--blue-soft)",
  André: "var(--accent-soft)",
  Zé: "var(--accent-2-soft)",
};

function iniciais(autor: Autor): string {
  if (autor === "Zé") return "ZÉ";
  return autor.slice(0, 2).toUpperCase();
}

// Só contexto visual pro Passo 1 - o resto dos setores do pipeline (ver
// AtendimentosInternosPrototype, seção 01) também tem fila própria, não
// só o de Levantamento. Números fixos, sem clique - é pra contar a
// história na apresentação, não interagir. Virou card completo (20/09, a
// pedido do Rafael) porque o plano é deixar essa tela numa TV do
// escritório, ligada o dia todo, pra galera bater o olho e saber o que
// tá em aberto em cada setor sem precisar clicar em nada.
const OUTRAS_FILAS: { setor: string; count: number; icone: ElementType; cor: string; corSoft: string }[] = [
  { setor: "Nuvem de Pontos", count: 2, icone: Cloud, cor: "var(--blue)", corSoft: "var(--blue-soft)" },
  { setor: "Produção", count: 1, icone: Package, cor: "var(--amber)", corSoft: "var(--amber-soft)" },
  { setor: "Modelagem", count: 3, icone: Layers, cor: "var(--accent)", corSoft: "var(--accent-soft)" },
  { setor: "Revisão", count: 2, icone: Eye, cor: "var(--green)", corSoft: "var(--green-soft)" },
  { setor: "RDV & Entrega", count: 1, icone: Send, cor: "var(--accent-2)", corSoft: "var(--accent-2-soft)" },
];

type Anexo = { nome: string; tipo: string; meta: string; icone: ElementType };

type Mensagem = {
  autor: Autor;
  setor: string;
  hora: string;
  texto: string;
  anexo?: Anexo;
  repasse?: string;
  finalizado?: boolean;
};

const MENSAGENS: Mensagem[] = [
  {
    autor: "Uilian",
    setor: "Coordenação",
    hora: "08:12",
    texto:
      "Abrindo atendimento pra GRAN — a plataforma sinalizou levantamento pendente de alguns spools. Caiu na fila do setor de Levantamento, quem tiver livre já pode puxar.",
  },
  {
    autor: "Gustavo",
    setor: "Levantamento",
    hora: "08:19",
    texto: "Bora, tô livre! Puxei o atendimento aqui e já saio pra GRAN agora. Te aviso assim que chegar.",
  },
  {
    autor: "Gustavo",
    setor: "Levantamento",
    hora: "13:47",
    texto: "Voltei da GRAN, levantamento concluído sem imprevistos.",
  },
  {
    autor: "Gustavo",
    setor: "Levantamento",
    hora: "13:52",
    texto:
      "Nuvem de pontos processada, COEs já separados por spool e RDO gerado com TAG. Segue o relatório em anexo.",
    anexo: { nome: "RDO_GRAN_19-09.pdf", tipo: "RDO", meta: "PDF · 2,4 MB", icone: FileText },
    repasse: "Repassado para o setor de Modelagem",
  },
  {
    autor: "André",
    setor: "Modelagem",
    hora: "14:10",
    texto: "Peguei o atendimento na fila da Modelagem, começando a modelagem dos spools agora.",
  },
  {
    autor: "André",
    setor: "Modelagem",
    hora: "17:35",
    texto:
      "Modelagem concluída, sem divergência em relação ao levantamento do Gustavo. Segue o arquivo em anexo.",
    anexo: { nome: "Modelagem_GRAN_19-09.zip", tipo: "Modelagem", meta: "ZIP · 18,1 MB", icone: FileCode2 },
    repasse: "Repassado para RDV & Entrega",
  },
  {
    autor: "Zé",
    setor: "RDV & Entrega",
    hora: "17:48",
    texto: "Peguei o atendimento aqui em RDV & Entrega, gerando o RDV pra fechar com o cliente.",
  },
  {
    autor: "Zé",
    setor: "RDV & Entrega",
    hora: "18:22",
    texto:
      "RDV gerado e entrei em contato com o cliente pra dar o parecer dos spools — cotas bateram, sem pendência. Atendimento finalizado.",
    anexo: { nome: "RDV_GRAN_19-09.pdf", tipo: "RDV", meta: "PDF · 640 KB", icone: FileArchive },
    finalizado: true,
  },
];

function Avatar({ autor }: { autor: Autor }) {
  return (
    <div
      className={estilos.msgAvatar}
      style={{ color: CORES[autor], background: CORES_SOFT[autor], borderColor: CORES[autor] }}
    >
      {iniciais(autor)}
    </div>
  );
}

function Bolha({ mensagem }: { mensagem: Mensagem }) {
  const Icone = mensagem.anexo?.icone;
  return (
    <div className={estilos.msg}>
      <Avatar autor={mensagem.autor} />
      <div className={estilos.msgBody}>
        <div className={estilos.msgHead}>
          <span className={estilos.msgName} style={{ color: CORES[mensagem.autor] }}>
            {mensagem.autor}
          </span>
          <span className={estilos.msgTime}>{mensagem.hora}</span>
          <span className={estilos.msgSetor}>{mensagem.setor}</span>
        </div>
        <div className={estilos.bubble}>{mensagem.texto}</div>
        {mensagem.anexo && Icone && (
          <div className={estilos.fileBubble}>
            <div className={estilos.fileIcon}>
              <Icone size={15} />
            </div>
            <div>
              <div className={estilos.fileName}>{mensagem.anexo.nome}</div>
              <div className={estilos.fileMeta}>
                {mensagem.anexo.tipo} · {mensagem.anexo.meta}
              </div>
            </div>
          </div>
        )}
        {mensagem.repasse && (
          <div className={estilos.repasseTag}>
            <ArrowRight size={12} />
            {mensagem.repasse}
          </div>
        )}
        {mensagem.finalizado && (
          <div className={estilos.finalizadoTag}>
            <CheckCircle2 size={12} />
            Atendimento finalizado
          </div>
        )}
      </div>
    </div>
  );
}

export function FluxoSistema() {
  const [passo, setPasso] = useState<Passo>(1);
  const [puxando, setPuxando] = useState(false);

  function reiniciar() {
    setPasso(1);
    setPuxando(false);
  }

  function puxarAtendimento() {
    // mesmo "puxar" da Fila do Setor (ver AtendimentosInternosPrototype) -
    // um instante de "Você puxou" antes de abrir a conversa, só pra dar
    // o feedback de quem clicou virou o Gustavo pegando o atendimento
    setPuxando(true);
    setTimeout(() => setPasso(2), 550);
  }

  return (
    <div className={estilos.wrap}>
      <div className={estilos.stepBar}>
        <div className={estilos.stepIndicator}>
          <div className={estilos.stepDots}>
            <div className={passo === 1 ? estilos.stepDotActive : estilos.stepDotDone}>1</div>
            <div className={passo === 2 ? estilos.stepDotActive : estilos.stepDot}>2</div>
          </div>
          <span className={estilos.stepLabel}>
            {passo === 1 ? "Fila do setor" : "Atendimento com histórico"}
          </span>
        </div>
        <button type="button" className={estilos.restartBtn} onClick={reiniciar}>
          <RotateCcw size={13} />
          Reiniciar
        </button>
      </div>

      <div className={estilos.body}>
        {passo === 1 ? (
          <div className={estilos.step1}>
            <span className={estilos.step1Eyebrow}>Exemplo guiado · Levantamento GRAN</span>
            <h2 className={estilos.step1Title}>O Uilian acabou de abrir um atendimento</h2>
            <p className={estilos.step1Desc}>
              Caiu agora na fila do setor de Levantamento. Puxe como se fosse o Gustavo pra ver o
              atendimento tramitar até a resposta final pro cliente.
            </p>

            <div className={estilos.filaMini}>
              <div className={estilos.filaMiniTop}>
                <div className={estilos.filaMiniTitleRow}>
                  <div className={estilos.filaIcon}>
                    <Boxes size={18} />
                  </div>
                  <div>
                    <div className={estilos.filaMiniTitle}>Fila do setor · Levantamento</div>
                    <p className={estilos.filaMiniDesc}>Qualquer membro do setor pode puxar.</p>
                  </div>
                </div>
                <span className={estilos.filaCount}>1 atendimento</span>
              </div>

              <div className={estilos.ticketList}>
                <div className={`${estilos.ticket} ${estilos.ticketAlta} ${puxando ? estilos.ticketAssumido : ""}`}>
                  <div className={estilos.ticketMain}>
                    <div className={`${estilos.ticketPriority} ${estilos.priorityAlta}`}>
                      <span className={`${estilos.priorityDot} ${estilos.dotAlta}`} />
                      Alta prioridade
                    </div>
                    <div className={estilos.ticketNome}>
                      <span>Levantamento de spools — GRAN</span>
                      <span className={estilos.ticketId}>#ATD-1051</span>
                    </div>
                    <div className={estilos.ticketMeta}>
                      <span>Aberto por Uilian</span>
                      <span>Hoje, 08:12</span>
                    </div>
                  </div>
                  <div className={estilos.ticketRight}>
                    <span className={`${estilos.priorityPill} ${estilos.pillAlta}`}>Prioritária</span>
                    {puxando ? (
                      <span className={estilos.assumidoTag}>
                        <CheckCircle2 size={14} />
                        Você puxou
                      </span>
                    ) : (
                      <button type="button" className={estilos.puxarBtn} onClick={puxarAtendimento}>
                        <UserPlus size={14} />
                        Puxar atendimento
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={estilos.exemploOutroSetor}>
              <span className={estilos.outrasFilasLabel}>Exemplo de atendimento na fila — Modelagem</span>
              <div className={`${estilos.ticket} ${estilos.ticketMedia}`}>
                <div className={estilos.ticketMain}>
                  <div className={`${estilos.ticketPriority} ${estilos.priorityMedia}`}>
                    <span className={`${estilos.priorityDot} ${estilos.dotMedia}`} />
                    Média prioridade
                  </div>
                  <div className={estilos.ticketNome}>
                    <span>Modelagem de 4 spools</span>
                  </div>
                  <div className={estilos.ticketMeta}>
                    <span>Empresa OCYAN</span>
                    <span>Em aberto</span>
                  </div>
                </div>
                <div className={estilos.ticketRight}>
                  <span className={`${estilos.priorityPill} ${estilos.pillMedia}`}>Média</span>
                </div>
              </div>
            </div>

            <div className={estilos.outrasFilas}>
              <span className={estilos.outrasFilasLabel}>Outras filas do escritório agora</span>
              <div className={estilos.outrasFilasRow}>
                {OUTRAS_FILAS.map((f) => {
                  const Icone = f.icone;
                  return (
                    <div key={f.setor} className={estilos.filaOutroCard} style={{ borderTopColor: f.cor }}>
                      <div className={estilos.filaOutroTop}>
                        <div className={estilos.filaOutroIcon} style={{ color: f.cor, background: f.corSoft }}>
                          <Icone size={16} />
                        </div>
                        <span className={estilos.filaOutroNome}>{f.setor}</span>
                      </div>
                      <div className={estilos.filaOutroCountRow}>
                        <span className={estilos.filaOutroCount} style={{ color: f.cor }}>
                          {f.count}
                        </span>
                        <span className={estilos.filaOutroCountLabel}>
                          {f.count === 1 ? "atendimento" : "atendimentos"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={estilos.outrasFilasHint}>Cada setor tem a própria fila — essas aqui ainda não têm tela própria neste protótipo.</p>
            </div>
          </div>
        ) : (
          <>
            <button type="button" className={estilos.backLink} onClick={reiniciar}>
              <ArrowLeft size={13} />
              Voltar
            </button>

            <div className={estilos.chatHeader}>
              <div className={estilos.chatHeaderLeft}>
                <div className={estilos.chatIcon}>
                  <MessageCircle size={19} />
                </div>
                <div>
                  <div className={estilos.chatTitle}>#ATD-1051 · Levantamento de spools — GRAN</div>
                  <div className={estilos.chatSub}>Uilian · Gustavo · André · Zé</div>
                </div>
              </div>
              <span className={`${estilos.statusPill} ${estilos.statusConcluido}`}>Concluído</span>
            </div>

            <div className={estilos.thread}>
              {MENSAGENS.map((mensagem, indice) => (
                <Bolha key={indice} mensagem={mensagem} />
              ))}
            </div>

            <div className={estilos.composer}>Protótipo — envio de novas mensagens ainda não está ativo.</div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "0 24px 20px" }}>
        <Link
          href="/radar"
          style={{
            fontSize: 12,
            color: "var(--ink-faint)",
            textDecoration: "none",
          }}
        >
          ← Voltar para o Radar
        </Link>
      </div>
    </div>
  );
}
