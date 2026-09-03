import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarColaboradores } from "@/lib/certificados";
import { PainelColaboradores } from "@/components/certificados/PainelColaboradores";

/** Equivalente à aba "Colaboradores" do desktop (`AbaColaboradores`):
 * cadastro de pessoas, lista com busca, mesclar cadastros duplicados e
 * ver o histórico de certificados de cada uma. */
export default async function PaginaColaboradores() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("certificados")) redirect("/");

  const colaboradores = await buscarColaboradores(true);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-azul/10 text-azul flex items-center justify-center shrink-0">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Colaboradores</h1>
          <p className="text-sm text-gray-500">Cadastro de pessoas usado pra lançar certificados.</p>
        </div>
      </div>

      <PainelColaboradores colaboradoresIniciais={colaboradores} />
    </main>
  );
}
