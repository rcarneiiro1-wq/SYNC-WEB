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
