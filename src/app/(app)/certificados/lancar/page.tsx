import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarCertificadoPorId, buscarColaboradores, buscarTiposCertificado } from "@/lib/certificados";
import { FormularioCertificado } from "@/components/certificados/FormularioCertificado";
import { BotaoAjuda } from "@/components/BotaoAjuda";

export default async function PaginaLancarCertificado({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("certificados")) redirect("/");

  const { id } = await searchParams;

  const [colaboradores, tipos, certificadoExistente] = await Promise.all([
    buscarColaboradores(true),
    buscarTiposCertificado(),
    id ? buscarCertificadoPorId(id) : Promise.resolve(null),
  ]);

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-azul/10 text-azul flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">{certificadoExistente ? "Editar certificado" : "Lançar certificado"}</h1>
            <p className="text-sm text-gray-500">
              {certificadoExistente
                ? `${certificadoExistente.colaboradorNome} — ${certificadoExistente.tipoNome}`
                : "Registre um certificado de um colaborador."}
            </p>
          </div>
        </div>
        <BotaoAjuda
          titulo="Lançar certificado"
          texto="A data de vencimento é sugerida automaticamente a partir da validade do tipo escolhido, mas pode ser ajustada manualmente a qualquer momento."
        />
      </div>

      <FormularioCertificado colaboradores={colaboradores} tipos={tipos} certificadoExistente={certificadoExistente} />
    </main>
  );
}
