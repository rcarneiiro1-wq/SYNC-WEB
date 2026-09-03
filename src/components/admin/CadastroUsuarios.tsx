"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ShieldCheck,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  FilePlus,
  Power,
  Paperclip,
  FileSignature,
} from "lucide-react";
import { excluirUsuario } from "@/lib/adminActions";
import { salvarUsuario, definirAtivoUsuario, salvarAssinaturaUsuario } from "@/lib/usuariosActions";
import { SISTEMAS_PERMISSAO, type UsuarioCompleto } from "@/lib/usuarios";

const ITENS_POR_PAGINA = 5;
const EMPRESA_PADRAO = "MF Máquinas";

type FormularioUsuario = {
  usuarioOriginal: string | null;
  nome: string;
  funcao: string;
  usuario: string;
  senha: string;
  confirmaSenha: string;
  email: string;
  telefone: string;
  empresa: string;
  permissoes: Record<string, boolean>;
  ehAdmin: boolean;
  ativo: boolean;
  assinaturaUrl: string | null;
};

function formularioVazio(): FormularioUsuario {
  return {
    usuarioOriginal: null,
    nome: "",
    funcao: "",
    usuario: "",
    senha: "",
    confirmaSenha: "",
    email: "",
    telefone: "",
    empresa: EMPRESA_PADRAO,
    permissoes: {},
    ehAdmin: false,
    ativo: true,
    assinaturaUrl: null,
  };
}

function formularioDoUsuario(u: UsuarioCompleto): FormularioUsuario {
  return {
    usuarioOriginal: u.usuario,
    nome: u.nome,
    funcao: u.funcao || "",
    usuario: u.usuario,
    senha: "",
    confirmaSenha: "",
    email: u.email || "",
    telefone: u.telefone || "",
    empresa: u.empresa || "",
    permissoes: Object.fromEntries(SISTEMAS_PERMISSAO.map((s) => [s.chave, u.permissoes.includes(s.chave)])),
    ehAdmin: u.ehAdmin,
    ativo: u.ativo,
    assinaturaUrl: u.assinaturaUrl,
  };
}

function rotuloAcessos(u: UsuarioCompleto): string {
  // tipado como string[] explicitamente - sem isso o TS infere a união
  // literal dos rótulos de SISTEMAS_PERMISSAO (por causa do "as const"),
  // e "Administrador" (que não é uma das 5 permissões) não entra no unshift
  const nomes: string[] = SISTEMAS_PERMISSAO.filter((s) => u.permissoes.includes(s.chave)).map((s) => s.rotulo);
  if (u.ehAdmin) nomes.unshift("Administrador");
  return nomes.length ? nomes.join(", ") : "—";
}

/** Tela de "Cadastro de Usuários" (`/admin/usuarios`) - evolução visual da
 * mesma tela que já existia no desktop (dados + acessos + assinatura,
 * numa coluna cada, com a lista de usuários embaixo). Reaproveita as
 * mesmas 5 permissões e a mesma regra de senha/login do desktop - só o
 * layout é novo, pra ficar no padrão do resto do site. */
export function CadastroUsuarios({ usuarios }: { usuarios: UsuarioCompleto[] }) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const inputAssinaturaRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormularioUsuario>(formularioVazio());
  const [salvando, setSalvando] = useState(false);
  const [enviandoAssinatura, setEnviandoAssinatura] = useState(false);
  const [alternandoAtivo, setAlternandoAtivo] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [statusSync, setStatusSync] = useState<string>("");

  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);

  const editando = Boolean(form.usuarioOriginal);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.usuario.toLowerCase().includes(termo) ||
        (u.funcao || "").toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * ITENS_POR_PAGINA;
  const usuariosNaPagina = usuariosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  function limparFormulario() {
    setForm(formularioVazio());
    setErro(null);
    setMensagem(null);
  }

  function carregarUsuario(u: UsuarioCompleto) {
    setForm(formularioDoUsuario(u));
    setErro(null);
    setMensagem(null);
  }

  async function handleSalvar() {
    setErro(null);
    setMensagem(null);
    if (form.senha && form.senha !== form.confirmaSenha) {
      setErro("A senha e a confirmação precisam ser iguais.");
      return;
    }
    setSalvando(true);
    const resultado = await salvarUsuario({
      usuarioOriginal: form.usuarioOriginal,
      nome: form.nome,
      funcao: form.funcao,
      usuario: form.usuario,
      senha: form.senha,
      email: form.email,
      telefone: form.telefone,
      empresa: form.empresa,
      permissoes: Object.entries(form.permissoes)
        .filter(([, marcado]) => marcado)
        .map(([chave]) => chave),
      ehAdmin: form.ehAdmin,
    });
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    setMensagem("Usuário salvo. Já pode anexar a assinatura aqui do lado, se quiser.");
    // mantém selecionado (em vez de limpar) pra assinatura ficar liberada
    // na hora, sem precisar clicar de novo na lista - mesmo cuidado que o
    // desktop já toma aqui
    setForm((f) => ({ ...f, usuarioOriginal: resultado.usuario, usuario: resultado.usuario, senha: "", confirmaSenha: "" }));
    router.refresh();
  }

  async function handleExcluir(u: UsuarioCompleto) {
    const confirmado = window.confirm(
      `Excluir o usuário "${u.nome}" (login: ${u.usuario})?\n\nA pessoa perde o acesso ao sistema (desktop e web) imediatamente. Não tem como desfazer. Confirma?`
    );
    if (!confirmado) return;
    setErro(null);
    setExcluindo(u.usuario);
    const resultado = await excluirUsuario(u.usuario);
    setExcluindo(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    if (form.usuarioOriginal === u.usuario) limparFormulario();
    router.refresh();
  }

  async function handleAlternarAtivo() {
    if (!form.usuarioOriginal) return;
    const acao = form.ativo ? "desativar" : "reativar";
    const confirmado = window.confirm(`Quer mesmo ${acao} o usuário "${form.nome}"?`);
    if (!confirmado) return;
    setAlternandoAtivo(true);
    const resultado = await definirAtivoUsuario(form.usuarioOriginal, !form.ativo);
    setAlternandoAtivo(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    setForm((f) => ({ ...f, ativo: !f.ativo }));
    router.refresh();
  }

  function handleAtualizarLista() {
    // não existe "sincronizar" de verdade no site (diferente do desktop,
    // que troca dados entre o SQLite local e a nuvem) - aqui já é tudo
    // lido direto da nuvem, então isso só busca a lista de novo
    setStatusSync("Atualizando...");
    iniciarTransicao(() => {
      router.refresh();
      setTimeout(() => setStatusSync("✅ Lista atualizada"), 300);
    });
  }

  async function handleEscolherAssinatura(arquivo: File | undefined) {
    if (!arquivo || !form.usuarioOriginal) return;
    setErro(null);
    setEnviandoAssinatura(true);
    const dados = new FormData();
    dados.set("usuario", form.usuarioOriginal);
    dados.set("arquivo", arquivo);
    const resultado = await salvarAssinaturaUsuario(dados);
    setEnviandoAssinatura(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro);
      return;
    }
    // pré-visualização instantânea (sem esperar o round-trip pro Storage
    // aparecer na URL pública) - o router.refresh() sincroniza a URL de
    // verdade em seguida
    setForm((f) => ({ ...f, assinaturaUrl: URL.createObjectURL(arquivo) }));
    setMensagem("Assinatura salva - já vai sair sozinha nos RDOs dessa pessoa.");
    router.refresh();
  }

  return (
    <div>
      {/* ---------- cabeçalho ---------- */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-azul/10 text-azul flex items-center justify-center shrink-0">
            <UserPlus size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Cadastro de Usuários</h1>
            <p className="text-sm text-gray-500">Gerencie os usuários e acessos do sistema Sync ERP.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={limparFormulario}
          className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors cursor-pointer shrink-0"
        >
          <UserPlus size={15} /> Novo usuário
        </button>
      </div>

      {erro && <p className="text-sm text-vermelho bg-vermelho/5 border border-vermelho/20 rounded-md px-3 py-2 mb-4">{erro}</p>}
      {mensagem && (
        <p className="text-sm text-verde bg-verde/5 border border-verde/20 rounded-md px-3 py-2 mb-4">{mensagem}</p>
      )}

      {/* ---------- card principal: Dados | Acessos | Assinatura ---------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr_2fr] gap-8">
          {/* Dados do usuário */}
          <div>
            <h2 className="text-sm font-bold text-azul mb-4">1. Dados do usuário</h2>
            <div className="flex flex-col gap-3.5">
              <Campo label="Nome completo" required>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Digite o nome completo"
                  className={classesInput}
                />
              </Campo>
              <Campo label="Função">
                <input
                  value={form.funcao}
                  onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))}
                  placeholder="Ex.: Projetista, Coordenador, Piloto Drone"
                  className={classesInput}
                />
              </Campo>
              <Campo label="Usuário (login)" required>
                <input
                  value={form.usuario}
                  onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                  placeholder="Digite o usuário de acesso"
                  autoCapitalize="none"
                  className={classesInput}
                />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="E-mail">
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="opcional"
                    type="email"
                    className={classesInput}
                  />
                </Campo>
                <Campo label="Telefone">
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                    placeholder="opcional"
                    className={classesInput}
                  />
                </Campo>
              </div>
              <Campo label="Empresa">
                <input
                  value={form.empresa}
                  onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                  placeholder="opcional"
                  className={classesInput}
                />
              </Campo>
              <Campo label="Senha" required={!editando}>
                <input
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="Digite a senha"
                  type="password"
                  className={classesInput}
                />
              </Campo>
              {editando && <p className="text-[11px] text-gray-400 -mt-2">deixe em branco pra manter a senha atual</p>}
              <Campo label="Confirmar senha" required={!editando}>
                <input
                  value={form.confirmaSenha}
                  onChange={(e) => setForm((f) => ({ ...f, confirmaSenha: e.target.value }))}
                  placeholder="Confirme a senha"
                  type="password"
                  className={classesInput}
                />
              </Campo>
            </div>
          </div>

          {/* Acessos do usuário */}
          <div>
            <h2 className="text-sm font-bold text-azul mb-4">2. Acessos do usuário</h2>
            <div className="flex flex-col gap-3">
              {SISTEMAS_PERMISSAO.map((s) => (
                <label key={s.chave} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.permissoes[s.chave])}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, permissoes: { ...f.permissoes, [s.chave]: e.target.checked } }))
                    }
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-azul focus:ring-azul/40 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-navy">{s.rotulo}</span>
                    <span className="block text-xs text-gray-500">{s.descricao}</span>
                  </span>
                </label>
              ))}

              <div className="border-t border-gray-100 my-1" />

              <label
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  form.ehAdmin ? "bg-azul/5 border border-azul/30" : "border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.ehAdmin}
                  onChange={(e) => setForm((f) => ({ ...f, ehAdmin: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-azul focus:ring-azul/40 shrink-0"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-azul">
                    <ShieldCheck size={14} /> Administrador (acesso total)
                  </span>
                  <span className="block text-xs text-azul/70">Permite criar/editar usuários e todas as permissões.</span>
                </span>
              </label>
            </div>
          </div>

          {/* Assinatura */}
          <div>
            <h2 className="text-sm font-bold text-azul mb-1">3. Assinatura (opcional)</h2>
            <p className="text-xs text-gray-500 mb-3">A assinatura será exibida no RDO dessa pessoa.</p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 h-36 flex items-center justify-center overflow-hidden">
              {form.assinaturaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.assinaturaUrl} alt="Assinatura" className="max-h-28 max-w-[85%] object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 text-center px-4">
                  <FileSignature size={26} />
                  <span className="text-xs">
                    {editando ? "Sem assinatura ainda" : "Salve o usuário primeiro\npara poder anexar a assinatura"}
                  </span>
                </div>
              )}
            </div>

            <input
              ref={inputAssinaturaRef}
              type="file"
              accept=".jpg,.jpeg,.png,.heic"
              className="hidden"
              onChange={(e) => handleEscolherAssinatura(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={!editando || enviandoAssinatura}
              onClick={() => inputAssinaturaRef.current?.click()}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 py-2 text-xs font-semibold text-navy hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip size={13} /> {enviandoAssinatura ? "Enviando..." : "Anexar/trocar assinatura"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- ações ---------- */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="inline-flex items-center gap-1.5 rounded-md bg-azul px-5 py-2.5 text-sm font-bold text-white hover:bg-azul-escuro transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <Save size={15} /> {salvando ? "Salvando..." : "Salvar usuário"}
        </button>
        <button
          type="button"
          onClick={limparFormulario}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <FilePlus size={15} /> Novo usuário (limpar)
        </button>
        <button
          type="button"
          onClick={handleAtualizarLista}
          disabled={pendente}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={15} className={pendente ? "animate-spin" : ""} /> Sincronizar usuários
        </button>
        {editando && (
          <button
            type="button"
            onClick={handleAlternarAtivo}
            disabled={alternandoAtivo}
            className="inline-flex items-center gap-1.5 rounded-md border border-vermelho/30 bg-vermelho/5 px-4 py-2.5 text-sm font-semibold text-vermelho hover:bg-vermelho/10 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Power size={15} /> {alternandoAtivo ? "Aguarde..." : form.ativo ? "Desativar usuário" : "Reativar usuário"}
          </button>
        )}
      </div>
      {statusSync && <p className="text-xs text-gray-500 mb-6">{statusSync}</p>}

      {/* ---------- lista de usuários ---------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-navy">Usuários cadastrados</h2>
            <p className="text-xs text-gray-500">Clique em um usuário para editar</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(0);
              }}
              placeholder="Buscar usuário..."
              className="rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm w-56 outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Usuário (login)</th>
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Função</th>
                <th className="px-3 py-2 font-semibold">Acessos</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuariosNaPagina.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
              {usuariosNaPagina.map((u) => (
                <tr
                  key={u.usuario}
                  onClick={() => carregarUsuario(u)}
                  className={`cursor-pointer hover:bg-gray-50 ${!u.ativo ? "opacity-50" : ""}`}
                >
                  <td className="px-3 py-2 text-gray-600">{u.usuario}</td>
                  <td className="px-3 py-2 font-medium text-navy">{u.nome}</td>
                  <td className="px-3 py-2 text-gray-600">{u.funcao || "-"}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{rotuloAcessos(u)}</td>
                  <td className="px-3 py-2">
                    {u.ativo ? (
                      <span className="text-[11px] font-semibold text-verde bg-verde/10 rounded-full px-2 py-0.5">Ativo</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-vermelho bg-vermelho/10 rounded-full px-2 py-0.5">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          carregarUsuario(u);
                        }}
                        className="text-gray-400 hover:text-azul cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluir(u);
                        }}
                        disabled={excluindo === u.usuario}
                        className="text-gray-400 hover:text-vermelho cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            {usuariosFiltrados.length === 0
              ? "Nenhum usuário encontrado"
              : `Mostrando ${inicio + 1} a ${Math.min(inicio + ITENS_POR_PAGINA, usuariosFiltrados.length)} de ${usuariosFiltrados.length} usuários`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={paginaAtual === 0}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="w-7 h-7 flex items-center justify-center rounded-md border border-azul text-azul text-xs font-bold">
              {paginaAtual + 1}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={paginaAtual >= totalPaginas - 1}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const classesInput =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/20";

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {required && <span className="text-vermelho">*</span>}
      </label>
      {children}
    </div>
  );
}
