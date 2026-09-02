import Image from "next/image";
import { User, Lock } from "lucide-react";
import { entrar } from "./actions";

/** Tela de login - mesma identidade visual do Sync ERP desktop (painel
 * azul-marinho com a logo/identificação à esquerda, cartão de acesso à
 * direita), só que responsiva pro navegador. */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; proximo?: string }>;
}) {
  const params = await searchParams;
  const temErro = params.erro === "1";
  const semPermissao = params.erro === "sem_permissao";
  const proximo = params.proximo || "/";

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Painel de identidade - igual ao desktop */}
      <div className="relative md:w-[42%] md:min-h-screen bg-navy overflow-hidden flex flex-col items-center justify-center text-center px-10 py-14 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-28 w-[420px] h-[420px] rounded-full border border-azul/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-10 left-8 grid grid-cols-6 gap-2 opacity-40 hidden md:grid"
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-azul" />
          ))}
        </div>

        <Image
          src="/logo-syncerp.png"
          alt="Sync ERP"
          width={72}
          height={72}
          priority
          className="relative z-10"
        />
        <h1 className="relative z-10 mt-5 text-white text-3xl font-bold">Sync ERP</h1>
        <p className="relative z-10 text-azul text-xs font-semibold tracking-widest mt-1">
          SISTEMA DE GESTÃO OPERACIONAL
        </p>
        <span className="relative z-10 mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-azul bg-white/10 border border-azul/30 rounded-full px-3 py-1">
          <User size={12} /> CLIENTE: MF MÁQUINAS
        </span>

        <p className="relative z-10 mt-10 md:mt-16 text-white/30 text-xs">
          Developed by Rafael Carneiro
        </p>
      </div>

      {/* Cartão de acesso */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-14">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-azul/10 text-azul flex items-center justify-center mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-navy text-xl font-bold">Acessar o sistema</h2>
          <p className="text-gray-500 text-sm mt-1 mb-6 text-center">
            Informe suas credenciais para continuar
          </p>

          <form action={entrar} className="w-full flex flex-col gap-4">
            <input type="hidden" name="proximo" value={proximo} />

            <div>
              <label htmlFor="usuario" className="block text-sm text-gray-600 mb-1">
                Usuário
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  autoFocus
                  required
                  autoCapitalize="none"
                  placeholder="Digite seu usuário"
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm text-gray-600 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  required
                  placeholder="Digite sua senha"
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
                />
              </div>
            </div>

            {temErro && (
              <p className="text-sm text-vermelho -mt-1">Usuário ou senha incorretos. Tenta de novo.</p>
            )}
            {semPermissao && (
              <p className="text-sm text-vermelho -mt-1">
                Sua senha está certa, mas sua conta ainda não tem acesso liberado a esse site. Pede pra
                alguém com acesso de administrador liberar em &quot;Usuários&quot; no desktop.
              </p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors cursor-pointer"
            >
              → Entrar
            </button>

            <p className="text-center text-xs text-gray-400 mt-2">
              Mesmo usuário e senha que você já usa no Sync ERP desktop.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
