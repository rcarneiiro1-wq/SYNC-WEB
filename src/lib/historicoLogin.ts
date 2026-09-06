import "server-only";
import { criarClienteAdmin } from "@/lib/supabase-admin";

/** Tem que bater com o DIAS_RETENCAO_HISTORICO de core/presenca.py (desktop)
 * e o DIAS_HISTORICO_LOGIN de lib/admin.ts (esse mesmo site) - os três
 * lados concordam em até quando o histórico de login guarda linha. */
const DIAS_RETENCAO = 5;

/**
 * Registra um login de verdade no histórico (tabela "historico_login",
 * compartilhada com o desktop - ver core/presenca.py) e aproveita esse
 * mesmo momento pra apagar (best-effort) o que já passou de
 * DIAS_RETENCAO dias, pra a lista nunca crescer sem controle.
 *
 * Chamado por app/login/actions.ts, depois que já confirmou senha certa
 * e permissão de acesso web - nunca deve travar nem impedir o login, por
 * isso os dois passos ficam num único try/catch silencioso.
 */
export async function registrarLoginHistorico(usuario: string, nome: string) {
  try {
    const admin = criarClienteAdmin();
    await admin.from("historico_login").insert({ usuario, nome, origem: "web" });
    const limite = new Date(Date.now() - DIAS_RETENCAO * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("historico_login").delete().lt("logado_em", limite);
  } catch {
    // de propósito silencioso - histórico de login nunca deve atrapalhar quem tá logando
  }
}
