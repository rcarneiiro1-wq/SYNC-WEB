import { entrar } from "./actions";

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
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-navy px-8 pt-10 pb-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full border-2 border-azul flex items-center justify-center text-azul text-2xl font-bold">
            S
          </div>
          <h1 className="mt-4 text-white text-xl font-bold">Sync ERP</h1>
          <p className="text-azul text-xs font-semibold tracking-wide mt-0.5">
            GERENCIAMENTO DE EMBARQUE
          </p>
        </div>

        <form action={entrar} className="px-8 py-8 flex flex-col gap-4">
          <input type="hidden" name="proximo" value={proximo} />
          <div>
            <label htmlFor="usuario" className="block text-sm text-gray-600 mb-1">
              Usuário
            </label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoFocus
              required
              autoCapitalize="none"
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm text-gray-600 mb-1">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>

          {temErro && (
            <p className="text-sm text-vermelho -mt-1">Usuário ou senha incorretos. Tenta de novo.</p>
          )}
          {semPermissao && (
            <p className="text-sm text-vermelho -mt-1">
              Sua senha está certa, mas sua conta ainda não tem acesso liberado a esse site. Pede pra alguém com
              acesso de administrador liberar em "Usuários" no desktop.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors cursor-pointer"
          >
            Entrar
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Mesmo usuário e senha que você já usa no Sync ERP desktop.
          </p>
        </form>
      </div>
    </div>
  );
}
