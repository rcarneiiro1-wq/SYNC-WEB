"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { NavegacaoAdmin } from "@/lib/admin";
import { tempoRelativo } from "@/lib/tempo";

/** Nomes amigáveis pras telas do site - mesmos rótulos usados na
 * Sidebar. O que não estiver aqui simplesmente mostra o caminho cru (ex:
 * "/certificados/lancar/123"), então uma tela nova no futuro nunca quebra
 * isso, só aparece "crua" até alguém lembrar de adicionar aqui. */
const NOMES_PAGINA: Record<string, string> = {
  "/": "Início",
  "/embarques/ativos": "Embarques ativos",
  "/historico": "Histórico",
  "/relatorios": "Relatório por empresa",
  "/historico-colaborador": "Histórico colaborador",
  "/relatorio-embarcados": "Relatório de embarcados",
  "/certificados": "Painel de vencimentos (certificados)",
  "/certificados/colaboradores": "Colaboradores (certificados)",
  "/certificados/tipos": "Tipos de certificado",
  "/certificados/lancar": "Lançar certificado",
  "/certificados/numeracao": "Numeração NR/PE",
  "/admin": "Painel do administrador",
  "/admin/usuarios": "Cadastro de usuários",
};

function nomePagina(caminho: string): string {
  return NOMES_PAGINA[caminho] || caminho;
}

// uma "sessão" é um grupo de páginas vistas sem intervalo maior que isso
// entre uma e outra - só um jeito de agrupar visualmente, não existe
// esse conceito de fato no banco (não tem relação com o cookie de login)
const GAP_SESSAO_MS = 30 * 60 * 1000;

type Sessao = {
  inicio: string;
  fim: string;
  paginas: { pagina: string; quando: string }[];
};

type GrupoUsuario = {
  usuario: string;
  nome: string;
  sessoes: Sessao[];
};

function agruparPorUsuario(navegacao: NavegacaoAdmin[]): GrupoUsuario[] {
  const porUsuario = new Map<string, { nome: string; linhas: NavegacaoAdmin[] }>();
  for (const n of navegacao) {
    const existente = porUsuario.get(n.usuario);
    if (existente) existente.linhas.push(n);
    else porUsuario.set(n.usuario, { nome: n.nome || n.usuario, linhas: [n] });
  }

  const grupos: GrupoUsuario[] = [];
  for (const [usuario, { nome, linhas }] of porUsuario) {
    // ordena do mais antigo pro mais novo só pra montar as sessões certo
    const ordenadas = [...linhas].sort((a, b) => new Date(a.quando).getTime() - new Date(b.quando).getTime());
    const sessoes: Sessao[] = [];
    for (const l of ordenadas) {
      const atual = sessoes[sessoes.length - 1];
      const gap = atual ? new Date(l.quando).getTime() - new Date(atual.fim).getTime() : Infinity;
      if (atual && gap <= GAP_SESSAO_MS) {
        atual.fim = l.quando;
        atual.paginas.push({ pagina: l.pagina, quando: l.quando });
      } else {
        sessoes.push({ inicio: l.quando, fim: l.quando, paginas: [{ pagina: l.pagina, quando: l.quando }] });
      }
    }
    // agora sim, mais recente primeiro (sessão e páginas dentro dela)
    sessoes.reverse();
    for (const s of sessoes) s.paginas.reverse();
    grupos.push({ usuario, nome, sessoes });
  }

  return grupos.sort(
    (a, b) => new Date(b.sessoes[0].inicio).getTime() - new Date(a.sessoes[0].inicio).getTime()
  );
}

function ListaPaginas({ paginas }: { paginas: { pagina: string; quando: string }[] }) {
  return (
    <ol className="mt-1.5 space-y-1">
      {paginas.map((p, i) => (
        <li key={`${p.quando}-${i}`} className="flex items-baseline gap-2 text-xs text-gray-500">
          <span className="text-gray-300">↳</span>
          <span className="text-gray-700">{nomePagina(p.pagina)}</span>
          <span className="text-gray-400">{tempoRelativo(p.quando)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Painel de rastro de navegação, agrupado por usuário e depois por
 * "sessão" (páginas vistas sem intervalo maior que 30min entre elas) -
 * pra dar uma ideia de "essa pessoa entrou, foi em tal tela, depois
 * tal outra". Visível só pro Rafael (a página /admin já filtra isso
 * antes de nem buscar os dados - ver admin/page.tsx). */
export function PainelNavegacaoAdmin({ navegacao }: { navegacao: NavegacaoAdmin[] }) {
  const grupos = useMemo(() => agruparPorUsuario(navegacao), [navegacao]);
  const [sessaoAberta, setSessaoAberta] = useState<Set<string>>(new Set());
  const [historicoAberto, setHistoricoAberto] = useState<Set<string>>(new Set());

  function alternar(conjunto: Set<string>, definir: (n: Set<string>) => void, chave: string) {
    const novo = new Set(conjunto);
    if (novo.has(chave)) novo.delete(chave);
    else novo.add(chave);
    definir(novo);
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Só os últimos 15 dias, site apenas (desktop não tem essa tela por telas/abas, é sincronização direta) -
        agrupado por sessão (intervalo maior que 30min entre uma página e outra já conta como sessão nova).
      </p>

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 font-semibold">Usuário</th>
              <th className="px-3 py-2 font-semibold">Última sessão</th>
              <th className="px-3 py-2 font-semibold text-right">Páginas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                  Nenhuma navegação registrada nos últimos dias.
                </td>
              </tr>
            )}
            {grupos.map((g) => {
              const [ultima, ...anteriores] = g.sessoes;
              const chaveUltima = `${g.usuario}:0`;
              const abertaUltima = sessaoAberta.has(chaveUltima);
              const historicoVisivel = historicoAberto.has(g.usuario);
              return (
                <Fragment key={g.usuario}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-navy align-top">{g.nome}</td>
                    <td className="px-3 py-2 text-gray-600 align-top">
                      {tempoRelativo(ultima.inicio)}
                      {abertaUltima && <ListaPaginas paginas={ultima.paginas} />}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <button
                        type="button"
                        onClick={() => alternar(sessaoAberta, setSessaoAberta, chaveUltima)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-navy cursor-pointer"
                      >
                        {ultima.paginas.length} {abertaUltima ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>{abertaUltima ? "ver menos" : "ver páginas"}</span>
                      </button>
                    </td>
                  </tr>
                  {anteriores.length > 0 && (
                    <tr className="bg-gray-50/40">
                      <td colSpan={3} className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => alternar(historicoAberto, setHistoricoAberto, g.usuario)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy cursor-pointer"
                        >
                          <History size={12} />
                          {anteriores.length} sessão(ões) anterior(es)
                          {historicoVisivel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>
                    </tr>
                  )}
                  {historicoVisivel &&
                    anteriores.map((s, i) => {
                      const chave = `${g.usuario}:${i + 1}`;
                      const aberta = sessaoAberta.has(chave);
                      return (
                        <tr key={chave} className="bg-gray-50/60">
                          <td className="px-3 py-1.5 pl-8 text-xs text-gray-400">↳ sessão anterior</td>
                          <td className="px-3 py-1.5 text-xs text-gray-500 align-top">
                            {tempoRelativo(s.inicio)}
                            {aberta && <ListaPaginas paginas={s.paginas} />}
                          </td>
                          <td className="px-3 py-1.5 text-right align-top">
                            <button
                              type="button"
                              onClick={() => alternar(sessaoAberta, setSessaoAberta, chave)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-navy cursor-pointer"
                            >
                              {s.paginas.length} {aberta ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
