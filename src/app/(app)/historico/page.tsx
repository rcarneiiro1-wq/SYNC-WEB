import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  buscarEmbarquesFinalizados,
  buscarOpcoesFiltro,
  buscarEmpresasCadastradas,
  type LinhaHistorico,
  type FiltrosHistorico,
} from "@/lib/embarques";
import { TabelaHistorico } from "@/components/TabelaHistorico";
import { FiltroHistorico } from "@/components/FiltroHistorico";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

type ParametrosBusca = { [chave: string]: string | string[] | undefined };

function _texto(valor: string | string[] | undefined): string | undefined {
  // o Next.js tipa cada parâmetro da URL como string OU lista de strings
  // (caso o mesmo parâmetro apareça repetido na URL) - aqui a gente só
  // usa o primeiro valor, que é o caso normal (99,9% das vezes)
  if (Array.isArray(valor)) return valor[0];
  return valor;
}

export default async function PaginaHistorico({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusca>;
}) {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  // 03/09: só quem tem "gerenciamento_embarques" (ou admin)
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  const params = await searchParams;

  // "empresa" pode aparecer repetido na URL (um card selecionado = um
  // parâmetro) - diferente dos outros filtros, que são só um valor
  const empresasParam = params.empresa;
  const empresas = empresasParam ? (Array.isArray(empresasParam) ? empresasParam : [empresasParam]) : [];

  const filtros: FiltrosHistorico = {
    busca: _texto(params.busca),
    empresas,
    dataInicio: _texto(params.dataInicio),
    dataFim: _texto(params.dataFim),
  };

  let linhas: LinhaHistorico[] = [];
  let erro: string | null = null;
  let opcoes: { sugestoes: string[] } = { sugestoes: [] };
  let empresasCadastradas: string[] = [];

  try {
    const [linhasResultado, opcoesResultado, empresasResultado] = await Promise.all([
      buscarEmbarquesFinalizados(filtros),
      buscarOpcoesFiltro(),
      buscarEmpresasCadastradas(),
    ]);
    linhas = linhasResultado;
    opcoes = opcoesResultado;
    empresasCadastradas = empresasResultado;
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  const temFiltroAtivo = Boolean(
    filtros.busca || (filtros.empresas && filtros.empresas.length > 0) || filtros.dataInicio || filtros.dataFim
  );

  return (
    <div className="min-h-screen">

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-navy mb-6">Histórico de embarques finalizados</h1>

        <FiltroHistorico
          sugestoes={opcoes.sugestoes}
          empresasCadastradas={empresasCadastradas}
          valoresIniciais={{
            busca: filtros.busca ?? "",
            empresas: filtros.empresas ?? [],
            // 27/11: o filtro por período agora é por MÊS (ver
            // FiltroHistorico.tsx) - se a URL já trouxer uma data
            // completa (ex: um link antigo, ou o "Limpar" voltando),
            // recorta só o "AAAA-MM" pra pré-selecionar o mês certo no
            // dropdown.
            mesDe: filtros.dataInicio ? filtros.dataInicio.slice(0, 7) : "",
            mesAte: filtros.dataFim ? filtros.dataFim.slice(0, 7) : "",
          }}
        />

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            {temFiltroAtivo
              ? "Nenhum embarque encontrado com esses filtros."
              : "Nenhum embarque finalizado ainda."}
          </div>
        )}

        {!erro && linhas.length > 0 && <TabelaHistorico linhas={linhas} />}
      </main>
    </div>
  );
}
