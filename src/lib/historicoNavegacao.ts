/**
 * Registra em qual página cada pessoa navegou, pra dar pro Rafael um
 * rastro de "o que essa pessoa foi ver" durante o uso do site -
 * complementa o histórico de login (que só diz QUANDO alguém entrou,
 * não o que fez depois). Pedido em 11/09.
 *
 * Chamado do proxy.ts (middleware, roda no Edge Runtime) a cada
 * navegação autenticada - por isso usa só "fetch" cru na API REST do
 * Supabase, sem a biblioteca @supabase/supabase-js (mesmo motivo do
 * auth-usuario.ts: no Edge não dá pra confiar que tudo que funciona no
 * Node funciona igual aqui, então esse arquivo fica de propósito sem
 * nenhuma dependência pesada).
 *
 * A tabela "historico_navegacao" fica com RLS ligada e SEM policy
 * pública nenhuma (nem leitura, nem escrita) - só a service_role key
 * (usada aqui) consegue gravar, e só ela consegue ler de volta (ver
 * lib/admin.ts). Isso é diferente do resto do projeto de propósito:
 * essa informação é sobre o uso de outras pessoas, então não faz
 * sentido a chave anon (pública) conseguir ler ou escrever aqui.
 *
 * Sempre "melhor esforço": se der qualquer erro (sem internet, Supabase
 * fora do ar, variável de ambiente faltando), nunca trava nem atrasa a
 * navegação de quem está usando o site - por isso quem chama essa
 * função usa `event.waitUntil(...)` em vez de aguardar ela terminar.
 */

const DIAS_RETENCAO_NAVEGACAO = 15;

export async function registrarNavegacao(usuario: string, nome: string, pagina: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return; // sem chave configurada - só desiste, nunca derruba a navegação

  const headers = {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    "Content-Type": "application/json",
  };

  try {
    await fetch(`${url}/rest/v1/historico_navegacao`, {
      method: "POST",
      headers,
      body: JSON.stringify({ usuario, nome, pagina }),
    });

    // limpeza OCASIONAL (não em toda navegação, só ~2% das vezes) -
    // como isso roda a cada troca de tela (bem mais frequente que login),
    // rodar um DELETE toda hora seria desperdício; de vez em quando já
    // basta pra tabela não crescer sem controle.
    if (Math.random() < 0.02) {
      const limite = new Date(Date.now() - DIAS_RETENCAO_NAVEGACAO * 24 * 60 * 60 * 1000).toISOString();
      await fetch(`${url}/rest/v1/historico_navegacao?quando=lt.${encodeURIComponent(limite)}`, {
        method: "DELETE",
        headers,
      });
    }
  } catch {
    // de propósito silencioso
  }
}
