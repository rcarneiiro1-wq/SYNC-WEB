import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { buscarUsuariosCompleto } from "@/lib/usuarios";
import { CadastroUsuarios } from "@/components/admin/CadastroUsuarios";

/** Tela completa de "Cadastro de Usuários" - cadastro/edição (dados,
 * acessos, assinatura) + a lista com busca e paginação, tudo numa
 * página só (igual o desktop). Só admin acessa, por enquanto (ver nota
 * em usuariosActions.ts sobre criar uma permissão própria pra isso mais
 * pra frente). Não muda a Sidebar - é só mais uma página dentro do
 * grupo (app), chegada por um botão no Painel Admin. */
export default async function PaginaCadastroUsuarios() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  if (!sessao || !sessao.ehAdmin) {
    redirect("/");
  }

  const usuarios = await buscarUsuariosCompleto();

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy mb-4 transition-colors"
      >
        <ArrowLeft size={13} /> Voltar para usuários
      </Link>
      <CadastroUsuarios usuarios={usuarios} />
    </main>
  );
}
