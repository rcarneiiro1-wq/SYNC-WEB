import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buscarEmbarquesAtivos } from "@/lib/embarques";
import { CartaoEmbarque } from "@/components/CartaoEmbarque";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import type { LinhaEmbarque } from "@/lib/embarques";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";

export const dynamic = "force-dynamic"; // sempre busca dado fresco, nunca cacheia

export default async function PaginaEmbarques() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);
  if (!sessao) redirect("/login");
  // 03/09: só quem tem "gerenciamento_embarques" (ou admin) - antes
  // qualquer pessoa com acesso ao site via essa URL direto
  if (!sessao.ehAdmin && !sessao.permissoes?.includes("gerenciamento_embarques")) {
    redirect("/");
  }

  let linhas: LinhaEmbarque[] = [];
  let erro: string | null = null;

  try {
    linhas = await buscarEmbarquesAtivos();
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  // contagem de PROJETOS (obras) distintos com gente embarcada agora, além
  // da contagem de PESSOAS - o desktop mostra os dois números lado a lado
  // ("1 pessoa embarcada · 1 projeto ativo")
  const projetosAtivos = new Set(linhas.map((l) => l.embarque.obra_id).filter(Boolean)).size;
  const agora = new Date();
  const ultimaAtualizacao = `${agora.toLocaleDateString("pt-BR")} ${agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  })}`;

  return (
    <div className="min-h-screen">

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-xl font-bold text-navy">Embarques ativos agora</h1>
          <p className="text-xs text-gray-400">Última atualização: {ultimaAtualizacao}</p>
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {linhas.length} pessoa{linhas.length === 1 ? "" : "s"} embarcada{linhas.length === 1 ? "" : "s"}
            {" · "}
            {projetosAtivos} projeto{projetosAtivos === 1 ? "" : "s"} ativo{projetosAtivos === 1 ? "" : "s"}
          </p>
          <BotaoAtualizar />
        </div>

        {erro && (
          <div className="bg-vermelho/10 border border-vermelho/30 text-vermelho rounded-md px-4 py-3 text-sm mb-6">
            Não consegui buscar os dados agora. Detalhe: {erro}
          </div>
        )}

        {!erro && linhas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center text-gray-500">
            Nenhum embarque ativo no momento.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {linhas.map((linha) => (
            <CartaoEmbarque key={linha.embarque.id} linha={linha} />
          ))}
        </div>
      </main>
    </div>
  );
}
