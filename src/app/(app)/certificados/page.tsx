import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarCertificados, buscarCategoriasTipos, buscarEmpresasCertificados, buscarLixeira } from "@/lib/certificados";
import { PainelVencimentos } from "@/components/certificados/PainelVencimentos";
import { BotaoAjuda } from "@/components/BotaoAjuda";

/** Painel principal do módulo de Certificados - equivalente à aba
 * "Painel de Vencimentos" do desktop (`AbaPainelVencimentos` em
 * modulos/certificados/telas.py): todos os certificados lançados, com
 * status calculado na hora (Válido/A vencer/Em atraso) e filtros. */
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

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-verde/10 text-verde flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
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

      <PainelVencimentos
        certificadosIniciais={certificados}
        lixeiraInicial={lixeira}
        categorias={categorias}
        empresas={empresas}
      />
    </main>
  );
}
