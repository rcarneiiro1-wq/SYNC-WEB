import { RelatorioEmpresasConteudo } from "@/components/RelatorioEmpresasConteudo";
import { buscarEmpresasCadastradas } from "@/lib/embarques";

export default async function PaginaRelatorioEmpresas() {
  const empresasCadastradas = await buscarEmpresasCadastradas();

  return (
    <div className="min-h-screen">

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Relatório por empresa</h1>
        <RelatorioEmpresasConteudo empresasCadastradas={empresasCadastradas} />
      </main>
    </div>
  );
}
