import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Award, ShieldCheck, Bell, Clock } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarCertificados, buscarCategoriasTipos, buscarEmpresasCertificados, buscarLixeira } from "@/lib/certificados";
import { PainelVencimentos } from "@/components/certificados/PainelVencimentos";
import { BotaoAjuda } from "@/components/BotaoAjuda";

/** Painel principal do módulo de Certificados - equivalente à aba
 * "Painel de Vencimentos" do desktop (`AbaPainelVencimentos` em
 * modulos/certificados/telas.py): todos os certificados lançados, com
 * status calculado na hora (Válido/A vencer/Em atraso) e filtros. */

/** Calcula quantos certificados caem em cada status - só pra exibir os
 * 4 cartõezinhos de resumo no topo (03/09). Não recalcula status nenhum:
 * usa o `status` que `buscarCertificados()` já calculou via
 * `calcularStatus()` em lib/certificados.ts. Puramente leitura/exibição,
 * zero regra de negócio nova. */
function contarPorStatus(certificados: { status: string }[]) {
  const total = certificados.length;
  const emDia = certificados.filter((c) => c.status === "VÁLIDO").length;
  const emAtencao = certificados.filter((c) => c.status === "A VENCER").length;
  const vencidos = certificados.filter((c) => c.status === "EM ATRASO").length;
  return { total, emDia, emAtencao, vencidos };
}

function formatarPercentual(parte: number, total: number): string {
  if (total === 0) return "—";
  return `${((parte / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function CartaoIndicador({
  icone: Icone,
  classeIcone,
  valor,
  rotulo,
  percentual,
}: {
  icone: React.ElementType;
  classeIcone: string;
  valor: number;
  rotulo: string;
  percentual?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 sm:px-5 py-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${classeIcone}`}>
        <Icone size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-navy leading-tight tabular-nums">{valor}</p>
        <p className="text-xs text-gray-500 leading-tight truncate">{rotulo}</p>
        {percentual && <p className="text-[11px] text-gray-400 leading-tight tabular-nums mt-0.5">{percentual}</p>}
      </div>
    </div>
  );
}

export default async function PaginaCertificados() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("certificados")) {
    redirect("/");
  }

  const [certificados, categorias, empresas, lixeira] = await Promise.all([
    buscarCertificados(),
    buscarCategoriasTipos(),
    buscarEmpresasCertificados(),
    buscarLixeira(),
  ]);

  const { total, emDia, emAtencao, vencidos } = contarPorStatus(certificados);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-verde/10 text-verde flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-navy">Painel de vencimentos</h1>
            <p className="text-sm text-gray-500">
              Todos os certificados lançados, com o status calculado na hora - nunca fica desatualizado.
            </p>
          </div>
        </div>
        <BotaoAjuda
          titulo="Painel de vencimentos"
          texto="O status de cada certificado (Válido, A vencer, Em atraso) é calculado automaticamente com base na data de vencimento - você não precisa atualizar nada manualmente."
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <CartaoIndicador
          icone={Award}
          classeIcone="bg-azul/10 text-azul"
          valor={total}
          rotulo="Total de certificados"
        />
        <CartaoIndicador
          icone={ShieldCheck}
          classeIcone="bg-verde/10 text-verde"
          valor={emDia}
          rotulo="Em dia"
          percentual={formatarPercentual(emDia, total)}
        />
        <CartaoIndicador
          icone={Bell}
          classeIcone="bg-amarelo/10 text-amarelo"
          valor={emAtencao}
          rotulo="Em atenção"
          percentual={formatarPercentual(emAtencao, total)}
        />
        <CartaoIndicador
          icone={Clock}
          classeIcone="bg-vermelho/10 text-vermelho"
          valor={vencidos}
          rotulo="Vencidos"
          percentual={formatarPercentual(vencidos, total)}
        />
      </div>

      <PainelVencimentos
        certificadosIniciais={certificados}
        lixeiraInicial={lixeira}
        categorias={categorias}
        empresas={empresas}
      />
    </main>
  );
}
