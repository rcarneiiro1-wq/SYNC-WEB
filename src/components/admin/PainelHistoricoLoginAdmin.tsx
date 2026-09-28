"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { LoginHistoricoAdmin } from "@/lib/admin";
import { tempoRelativo } from "@/lib/tempo";

type GrupoUsuario = {
  usuario: string;
  nome: string;
  /** já vem ordenado do mais recente pro mais antigo (mesma ordem da busca) */
  logins: LoginHistoricoAdmin[];
};

function agruparPorUsuario(historico: LoginHistoricoAdmin[]): GrupoUsuario[] {
  const porUsuario = new Map<string, GrupoUsuario>();
  for (const h of historico) {
    const existente = porUsuario.get(h.usuario);
    if (existente) {
      existente.logins.push(h);
    } else {
      porUsuario.set(h.usuario, { usuario: h.usuario, nome: h.nome || h.usuario, logins: [h] });
    }
  }
  // ordena os usuários pelo login mais recente de cada um (historico já chega ordenado desc)
  return Array.from(porUsuario.values()).sort(
    (a, b) => new Date(b.logins[0].logadoEm).getTime() - new Date(a.logins[0].logadoEm).getTime()
  );
}

function BadgeOrigem({ origem }: { origem: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        origem === "web" ? "bg-azul/10 text-azul" : "bg-gray-100 text-gray-600"
      }`}
    >
      {origem === "web" ? "Site" : "Desktop"}
    </span>
  );
}

/** Painel de histórico de login, agrupado por usuário - mostra o login mais
 * recente de cada pessoa numa linha só, com "ver mais" pra expandir e ver
 * todos os logins daquela pessoa nos últimos dias (evita uma lista enorme
 * e repetitiva quando alguém loga várias vezes por dia). */
export function PainelHistoricoLoginAdmin({ historico }: { historico: LoginHistoricoAdmin[] }) {
  const grupos = useMemo(() => agruparPorUsuario(historico), [historico]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  function alternarExpandido(usuario: string) {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(usuario)) novo.delete(usuario);
      else novo.add(usuario);
      return novo;
    });
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Só os últimos 5 dias, desktop e site juntos - depois disso o próprio sistema apaga sozinho, sem precisar
        fazer nada aqui. Um usuário por linha, com o login mais recente - clique em &quot;ver mais&quot; pra ver
        todos os logins dele no período.
      </p>

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Usuário</th>
              <th className="px-3 py-2 font-semibold">Último login</th>
              <th className="px-3 py-2 font-semibold text-center">Onde</th>
              <th className="px-3 py-2 font-semibold text-right">Logins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                  Nenhum login registrado nos últimos dias.
                </td>
              </tr>
            )}
            {grupos.map((g) => {
              const ultimo = g.logins[0];
              const restante = g.logins.slice(1);
              const aberto = expandidos.has(g.usuario);
              return (
                <Fragment key={g.usuario}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-navy">{g.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{tempoRelativo(ultimo.logadoEm)}</td>
                    <td className="px-3 py-2 text-center">
                      <BadgeOrigem origem={ultimo.origem} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {restante.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => alternarExpandido(g.usuario)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-navy cursor-pointer"
                        >
                          {g.logins.length} {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{aberto ? "ver menos" : "ver mais"}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">1</span>
                      )}
                    </td>
                  </tr>
                  {aberto &&
                    restante.map((h, i) => (
                      <tr key={`${g.usuario}-${h.logadoEm}-${i}`} className="bg-gray-50/60">
                        <td className="px-3 py-1.5 pl-8 text-xs text-gray-400">↳ login anterior</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{tempoRelativo(h.logadoEm)}</td>
                        <td className="px-3 py-1.5 text-center">
                          <BadgeOrigem origem={h.origem} />
                        </td>
                        <td />
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
