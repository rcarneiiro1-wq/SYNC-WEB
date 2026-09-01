import { RelatorioEmpresasConteudo } from "@/components/RelatorioEmpresasConteudo";

export default function PaginaRelatorioEmpresas() {
  return (
    <div className="min-h-screen">

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Relatório por empresa</h1>
        <RelatorioEmpresasConteudo />
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Developed by Rafael Carneiro · Sync ERP
      </footer>
    </div>
  );
}
