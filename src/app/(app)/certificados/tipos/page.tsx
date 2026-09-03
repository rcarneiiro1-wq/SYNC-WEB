import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarTiposCertificado } from "@/lib/certificados";
import { PainelTipos } from "@/components/certificados/PainelTipos";

/** Equivalente à aba "Tipos de Certificado" do desktop (`AbaTiposCertificado`):
 * o catálogo de tipos (nome, carga horária, validade, categoria - a
 * "planilha" de origem, ex: NR, CFT, ASO, PEAT). */
export default async function PaginaTiposCertificado() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("certificados")) redirect("/");

  const tipos = await buscarTiposCertificado();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-azul/10 text-azul flex items-center justify-center shrink-0">
          <ClipboardList size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Tipos de certificado</h1>
          <p className="text-sm text-gray-500">O catálogo usado pra lançar certificados - nome, carga horária, validade e categoria.</p>
        </div>
      </div>

      <PainelTipos tiposIniciais={tipos} />
    </main>
  );
}
