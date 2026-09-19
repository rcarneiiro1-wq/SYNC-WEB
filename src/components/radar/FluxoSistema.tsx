"use client";

import { useState, type ElementType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileArchive,
  FileCode2,
  FileText,
  MessageCircle,
  RotateCcw,
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

  return (
    <div className={estilos.wrap}>
      <div className={estilos.stepBar}>
        <div className={estilos.stepIndicator}>
          <div className={estilos.stepDots}>
            <div className={passo === 1 ? estilos.stepDotActive : estilos.stepDotDone}>1</div>
            <div className={passo === 2 ? estilos.stepDotActive : estilos.stepDot}>2</div>
          </div>
          <span className={estilos.stepLabel}>
            {passo === 1 ? "Novo atendimento" : "Atendimento com histórico"}
          </span>
        </div>
        <button type="button" className={estilos.restartBtn} onClick={() => setPasso(1)}>
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
              A GRAN sinalizou levantamento pendente de alguns spools. Veja como o atendimento passa de
              setor em setor até o cliente receber a resposta final.
            </p>

            <div className={estilos.novoTicket}>
              <span className={estilos.novoBadge}>NOVO</span>
              <div className={estilos.setor}>Levantamento · #ATD-1051</div>
              <div className={estilos.titulo}>Levantamento de spools — Cliente GRAN</div>
              <div className={estilos.meta}>
                <span>Aberto por Uilian</span>
                <span>Hoje, 08:12</span>
                <span>Prioridade alta</span>
              </div>
              <div className={estilos.paraQuem}>
                <MessageCircle size={15} />
                Caiu na fila do setor de Levantamento — qualquer um da equipe pode puxar
              </div>
            </div>

            <button type="button" className={estilos.abrirBtn} onClick={() => setPasso(2)}>
              Abrir atendimento
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <>
            <button type="button" className={estilos.backLink} onClick={() => setPasso(1)}>
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
