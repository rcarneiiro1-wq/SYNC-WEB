import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IdCard } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { DocumentosColaboradorPrototype } from "@/components/radar/DocumentosColaboradorPrototype";

/** "Documentação de Funcionários" (29/09, a pedido do Rafael) - quarta
 * peça do Radar, mesmo esquema de acesso das outras três: admin OU quem
 * tem a permissão `radar` (ver SISTEMAS_PERMISSAO em lib/usuarios.ts).
 *
 * Mockup estático aprovado pelo Rafael antes desta versão - biblioteca de
 * documentos por colaborador (RG/CPF, comprovante de residência,
 * contrato, ASO, certificado anexado) dentro do modal de Colaboradores
 * que já existe em Certificados, mais um campo opcional de anexo direto
 * em Lançar Certificado.
 *
 * Puro protótipo: nenhum botão aqui lê ou grava nada no banco. Quando
 * esse projeto sair do papel de verdade, essa página vira o rascunho de
 * onde partir - ou é substituída pelas telas reais. */
export default async function PaginaDocumentosColaborador() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  if (!sessao || (!sessao.ehAdmin && !sessao.permissoes?.includes("radar"))) {
    redirect("/");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <IdCard size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Documentação de Funcionários</h1>
          <p className="text-sm text-gray-500">
            Ideia de projeto futuro, ainda em estudo. Visível só pra você.
          </p>
        </div>
      </div>

      <DocumentosColaboradorPrototype />
    </main>
  );
}
