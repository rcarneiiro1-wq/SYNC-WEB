import "server-only";
import crypto from "crypto";

/**
 * Confere a senha usando EXATAMENTE a mesma fórmula do desktop
 * (modulos/usuarios/database.py, função _hash_senha):
 * PBKDF2-HMAC-SHA256, 100 mil iterações, salt de 16 bytes.
 *
 * Testado com um hash gerado de verdade no Python antes de usar aqui -
 * bate byte a byte.
 *
 * "server-only": esse arquivo usa o módulo "crypto" do Node, que só
 * existe em Node normal, não no Edge Runtime - nunca pode ser importado
 * pelo proxy.ts (middleware).
 */
export function verificarSenha(senhaDigitada: string, hashHex: string, saltHex: string): boolean {
  try {
    const salt = Buffer.from(saltHex, "hex");
    const derivado = crypto.pbkdf2Sync(senhaDigitada, salt, 100_000, 32, "sha256");
    const derivadoHex = derivado.toString("hex");
    // comparação em tempo constante - evita vazar informação por timing
    const a = Buffer.from(derivadoHex, "hex");
    const b = Buffer.from(hashHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Gera um hash novo (salt aleatório de 16 bytes + PBKDF2, mesma fórmula
 * de `verificarSenha`/do desktop `_hash_senha`) - usado ao criar um
 * usuário novo ou trocar a senha de um existente pelo site. Se essa
 * fórmula algum dia divergir da do desktop, as duas pontas passam a
 * aceitar senhas diferentes uma da outra - por isso NUNCA mudar os
 * parâmetros (100_000 iterações, sha256, salt de 16 bytes) sem trocar
 * dos dois lados ao mesmo tempo.
 */
export function gerarHashSenha(senha: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivado = crypto.pbkdf2Sync(senha, Buffer.from(salt, "hex"), 100_000, 32, "sha256");
  return { hash: derivado.toString("hex"), salt };
}
