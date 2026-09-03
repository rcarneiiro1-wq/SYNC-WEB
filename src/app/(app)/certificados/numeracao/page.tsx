import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Hash } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarColaboradores, buscarNumeracao, buscarProximoNumero } from "@/lib/certificados";
import { PainelNumeracao } from "@/components/certificados/PainelNumeracao";

/** Equivalente à aba "Numeração NR/PE" do desktop (`AbaNumeracao`): o
 * número sequencial que a PRÓPRIA empresa emite (não é o número do
 * certificado de um curso externo - é o "Controle Nº de NRS/PE" que a
 * Angélica mantém). */
export default async function PaginaNumeracao() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("certificados")) redirect("/");

  const [itens, colaboradores, proximoNr, proximoPe] = await Promise.all([
    buscarNumeracao(),
    buscarColaboradores(true),
    buscarProximoNumero("NR"),
    buscarProximoNumero("PE"),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-azul/10 text-azul flex items-center justify-center shrink-0">
          <Hash size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Numeração NR/PE</h1>
          <p className="text-sm text-gray-500">Controle do número sequencial que a própria empresa emite.</p>
        </div>
      </div>

      <PainelNumeracao
        itensIniciais={itens}
        colaboradores={colaboradores}
        proximoNumeroNr={proximoNr}
        proximoNumeroPe={proximoPe}
      />
    </main>
  );
}
