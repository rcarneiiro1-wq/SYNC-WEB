"use client";

import { useEffect, useState } from "react";
import { Route } from "lucide-react";
import { buscarMinhaLinhaDoTempo } from "@/lib/painelColaboradorActions";
import type { LinhaDoTempoColaborador as DadosLinhaDoTempo } from "@/lib/painelColaborador";

/**
 * "Linha do Tempo" do Meu Painel (17/09, a pedido do Rafael - ideia de
 * gamificação pra deixar o colaborador feliz vendo a trajetória dele:
 * "Linha do Tempo gostei * Só isso por enquanto... acho que fica bem
 * bonito destacável"). Mostra um resumo (embarques, dias trabalhados,
 * plataformas, desde quando) em destaque, seguido da lista cronológica
 * de todos os embarques - tudo desde sempre, sem filtro de período,
 * igual `MeusDocumentosPessoais`.
 *
 * A garantia de "só vê a minha trajetória" mora inteira dentro de
 * `buscarMinhaLinhaDoTempo()` (identidade pelo cookie de sessão) - esse
 * componente nunca recebe nem manda nenhum id de colaborador.
 */
export function LinhaDoTempoColaborador() {
  const [dados, setDados] = useState<DadosLinhaDoTempo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    buscarMinhaLinhaDoTempo()
      .then((r) => setDados(r.vinculado ? r.dados : null))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  // Sem vínculo de colaborador, ou sem nenhum embarque ainda - não faz
  // sentido mostrar uma "linha do tempo" vazia, então some silenciosamente
  // (o resto do painel já avisa quando não tem vínculo).
  if (!carregando && (erro || !dados || dados.totalEmbarques === 0)) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-4">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <Route size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-navy">Linha do Tempo</span>
      </div>

      {carregando && <p className="text-xs text-gray-400 py-6 text-center">Carregando...</p>}

      {!carregando && dados && (
        <>
          {/* Resumo em destaque - os 3 números que contam a trajetória */}
          <div className="bg-navy px-4 py-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-white tabular-nums">{dados.totalEmbarques}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">
                  {dados.totalEmbarques === 1 ? "Embarque" : "Embarques"}
                </p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-2xl font-bold text-white tabular-nums">{dados.totalDiasTrabalhados}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">
                  {dados.totalDiasTrabalhados === 1 ? "Dia trabalhado" : "Dias trabalhados"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white tabular-nums">{dados.totalPlataformas}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">
                  {dados.totalPlataformas === 1 ? "Plataforma" : "Plataformas"}
                </p>
              </div>
            </div>
            {dados.comAGenteDesde && (
              <p className="text-[11px] text-white/60 text-center mt-3">
                Com a gente desde <span className="text-white/90 font-semibold">{dados.comAGenteDesde}</span>
              </p>
            )}
          </div>

          {/* Lista cronológica dos embarques - mais recente primeiro */}
          <div className="px-4 py-4">
            {dados.eventos.map((evento, i) => (
              <div key={evento.embarqueId} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      evento.emAndamento ? "bg-azul" : "bg-gray-300"
                    }`}
                  />
                  {i < dados.eventos.length - 1 && <span className="w-px flex-1 bg-gray-200 my-1" />}
                </div>
                <div className={`min-w-0 ${i < dados.eventos.length - 1 ? "pb-4" : ""}`}>
                  <p className="text-sm font-medium text-navy truncate">{evento.obra}</p>
                  <p className={`text-xs ${evento.emAndamento ? "text-azul font-semibold" : "text-gray-400"}`}>
                    {evento.periodo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
