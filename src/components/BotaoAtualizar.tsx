"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Botão "Atualizar" que os cards de Embarques ativos/Histórico/Relatórios
 * tinham no desktop - aqui só força o Next a buscar tudo de novo do
 * servidor (as páginas já são `dynamic = "force-dynamic"`, então não tem
 * cache velho pra limpar, só precisa re-rodar a busca). */
export function BotaoAtualizar() {
  const router = useRouter();
  const [emAndamento, iniciarTransicao] = useTransition();
  const [ultimoClique, setUltimoClique] = useState<number | null>(null);

  function atualizar() {
    setUltimoClique(Date.now());
    iniciarTransicao(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={atualizar}
      disabled={emAndamento}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-azul hover:text-azul-escuro disabled:opacity-50 disabled:cursor-wait cursor-pointer whitespace-nowrap"
    >
      <span className={emAndamento ? "animate-spin" : ""}>🔄</span>
      {emAndamento ? "Atualizando..." : "Atualizar"}
      {ultimoClique !== null && !emAndamento && <span className="sr-only">Atualizado</span>}
    </button>
  );
}
