import { supabase } from "@/lib/supabase";

// Mesmas chaves/rótulos/descrições do desktop (modulos/usuarios/telas.py,
// SISTEMAS_PERMISSAO) - têm que ser IGUAIS, porque a mesma lista de
// permissões (guardada em `usuarios.permissoes`, um JSON de chaves tipo
// "rdo"/"certificados") é lida pelos dois sistemas.
export const SISTEMAS_PERMISSAO = [
  { chave: "rdo", rotulo: "Gerar RDO", descricao: "Permite gerar e visualizar RDOs" },
  {
    chave: "relatorio_embarque",
    rotulo: "Gerar Relatório de Embarque",
    descricao: "Permite gerar relatórios de embarque",
  },
  {
    chave: "certificados",
    rotulo: "Certificados",
    descricao:
      "Permite visualizar e gerenciar certificados pelo site (módulo saiu do desktop em 03/09 - lembrar de marcar também \"Acesso ao site\" abaixo)",
  },
  {
    chave: "gerenciamento_embarques",
    rotulo: "Gerenciamento de Embarques (consulta)",
    descricao: "Permite consultar embarques do sistema",
  },
  {
    chave: "acesso_web",
    rotulo: "Acesso ao site (web) - painel de acompanhamento",
    descricao: "Libera acesso ao painel web de acompanhamento",
  },
] as const;

export type UsuarioCompleto = {
  usuario: string;
  nome: string;
  funcao: string | null;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  permissoes: string[];
  ehAdmin: boolean;
  ativo: boolean;
  assinaturaUrl: string | null;
};

type LinhaUsuario = {
  usuario: string;
  nome: string;
  funcao: string | null;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  permissoes: string | null;
  eh_admin: boolean | null;
  ativo: boolean | null;
  assinatura_url: string | null;
};

function analisarPermissoes(json: string | null): string[] {
  try {
    const valor = JSON.parse(json || "[]");
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

export type UsuarioParaVinculo = { usuario: string; nome: string; ativo: boolean };

/** Versão enxuta de `buscarUsuariosCompleto()` - só login/nome/ativo, sem
 * email/telefone/função/empresa. Usada no picker de "Vincular usuário" do
 * Cadastro de Colaboradores (`PainelColaboradores.tsx`), que roda no
 * NAVEGADOR de quem tem só a permissão `certificados` (não precisa ser
 * admin) - `buscarUsuariosCompleto()` não serve pra isso porque manda os
 * dados pessoais de todo mundo pro cliente só pra montar um dropdown de
 * nome+login (a tela de Cadastro de Usuários, essa sim admin-only, continua
 * usando a versão completa). Nada disso é proteção de verdade contra
 * acesso direto ao Supabase (RLS de `usuarios`/`colaboradores` está aberta
 * pra `public` - ver nota no estado-atual.md), é só não passar dado sem
 * necessidade pro JS do cliente numa tela que gente não-admin acessa. */
export async function buscarUsuariosParaVinculo(): Promise<UsuarioParaVinculo[]> {
  const { data, error } = await supabase.from("usuarios").select("usuario, nome, ativo").order("nome");
  if (error) throw new Error(`Não consegui buscar os usuários: ${error.message}`);
  return ((data || []) as unknown as UsuarioParaVinculo[]).map((u) => ({ ...u, ativo: u.ativo !== false }));
}

/** Lista completa de usuários (todos os campos, inclusive os novos
 * email/telefone/empresa e a assinatura) - usada pela tela de Cadastro
 * de Usuários (`/admin/usuarios`), que já é admin-only. Diferente de
 * `buscarUsuariosAdmin` (admin.ts), que só traz o básico pra listagem
 * rápida do Painel Admin. **Não usar em telas que não sejam admin-only**
 * (ver `buscarUsuariosParaVinculo` acima pro caso comum de só precisar
 * de login+nome). */
export async function buscarUsuariosCompleto(): Promise<UsuarioCompleto[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("usuario, nome, funcao, email, telefone, empresa, permissoes, eh_admin, ativo, assinatura_url")
    .order("nome");
  if (error) throw new Error(`Não consegui buscar os usuários: ${error.message}`);
  return ((data || []) as unknown as LinhaUsuario[]).map((u) => ({
    usuario: u.usuario,
    nome: u.nome,
    funcao: u.funcao,
    email: u.email,
    telefone: u.telefone,
    empresa: u.empresa,
    permissoes: analisarPermissoes(u.permissoes),
    ehAdmin: Boolean(u.eh_admin),
    ativo: u.ativo !== false,
    assinaturaUrl: u.assinatura_url,
  }));
}
