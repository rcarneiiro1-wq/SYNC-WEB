import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Ship, Building2, Users, Award, UserPlus, Clock, Eye } from "lucide-react";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import {
  buscarEmbarquesAdmin, buscarObrasAdmin, buscarUsuariosAdmin, buscarHistoricoLoginAdmin,
  buscarNavegacaoAdmin,
} from "@/lib/admin";
import { PainelEmbarquesAdmin } from "@/components/admin/PainelEmbarquesAdmin";
import { PainelObrasAdmin } from "@/components/admin/PainelObrasAdmin";
import { PainelUsuariosAdmin } from "@/components/admin/PainelUsuariosAdmin";
import { PainelCertificadosAdmin } from "@/components/admin/PainelCertificadosAdmin";
import { PainelHistoricoLoginAdmin } from "@/components/admin/PainelHistoricoLoginAdmin";
import { PainelNavegacaoAdmin } from "@/components/admin/PainelNavegacaoAdmin";

/** Painel do administrador - só o "admin" (ou quem tiver eh_admin=true)
 * enxerga essa página. Dá autonomia pra excluir DE VERDADE embarques de
 * teste, usuários e certificados errados direto pelo site, sem precisar
 * pedir isso por fora do sistema. Toda exclusão aqui é DEFINITIVA. */
export default async function PaginaAdmin() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  // o layout (app)/layout.tsx já garante que existe sessão - aqui confere
  // a permissão específica de admin, redirecionando quem não tem de volta
  // pro Início (não faz sentido essa página aparecer pra mais ninguém)
  if (!sessao || !sessao.ehAdmin) {
    redirect("/");
  }

  // 11/09: rastro de navegação (quem foi em qual tela) é só pro Rafael
  // ver - mesmo outro admin (ex: o usuário genérico "admin") não enxerga
  // essa seção. Por isso nem busca esse dado se não for ele: evita gasto
  // à toa e mantém a real restrição também na leitura, não só na tela.
  const ehRafael = sessao.usuario === "Rafael";

  const [embarques, obras, usuarios, historicoLogin, navegacao] = await Promise.all([
    buscarEmbarquesAdmin(),
    buscarObrasAdmin(),
    buscarUsuariosAdmin(),
    buscarHistoricoLoginAdmin(),
    ehRafael ? buscarNavegacaoAdmin() : Promise.resolve([]),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-vermelho/10 text-vermelho flex items-center justify-center shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Painel do administrador</h1>
          <p className="text-sm text-gray-500">
            Visível só pra você. Toda exclusão aqui é definitiva - não passa por lixeira, não tem &quot;desfazer&quot;.
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide mb-3">
          <Ship size={16} /> Embarques
        </h2>
        <PainelEmbarquesAdmin embarques={embarques} />
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide mb-3">
          <Building2 size={16} /> Obras
        </h2>
        <PainelObrasAdmin obras={obras} />
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
            <Users size={16} /> Usuários
          </h2>
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-azul hover:text-azul-escuro transition-colors"
          >
            <UserPlus size={13} /> Cadastro completo de usuários
          </Link>
        </div>
        <p className="text-xs text-gray-400 -mt-2 mb-3">
          Essa lista aqui embaixo é só uma visão rápida (excluir direto). Pra criar, editar dados/acessos ou anexar
          assinatura, usa o &quot;Cadastro completo&quot; acima.
        </p>
        <PainelUsuariosAdmin usuarios={usuarios} usuarioLogado={sessao.usuario} />
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide mb-3">
          <Award size={16} /> Certificados
        </h2>
        <PainelCertificadosAdmin />
      </section>

      <section className={`mt-10 ${ehRafael ? "" : "mb-10"}`}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide mb-3">
          <Clock size={16} /> Histórico de login
        </h2>
        <PainelHistoricoLoginAdmin historico={historicoLogin} />
      </section>

      {ehRafael && (
        <section className="mt-10 mb-10">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide mb-3">
            <Eye size={16} /> Navegação (só você vê)
          </h2>
          <PainelNavegacaoAdmin navegacao={navegacao} />
        </section>
      )}
    </main>
  );
}
