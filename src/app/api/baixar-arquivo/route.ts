import { NextRequest, NextResponse } from "next/server";
import { nomeArquivoSeguro } from "@/lib/nomeArquivo";

export const dynamic = "force-dynamic";

/** Só deixa passar arquivo que vem do nosso próprio Supabase Storage - essa
 * rota busca uma URL e devolve o conteúdo dela pro navegador, então sem essa
 * trava ela virava um jeito de baixar (e forjar o nome de) qualquer URL da
 * internet através do nosso servidor. */
function hostPermitido(url: URL): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    return url.host === new URL(supabaseUrl).host;
  } catch {
    return false;
  }
}

/** Proxy de download: busca o arquivo no Supabase Storage e devolve com um
 * cabeçalho Content-Disposition explícito. Necessário porque o atributo
 * `download` do HTML é IGNORADO pelo navegador quando o link é pra outra
 * origem (como é o caso de uma URL do Supabase Storage) - nesse caso o
 * navegador usa o nome que vier do próprio servidor de origem, que é um
 * nome interno/aleatório, não o nome "bonito" (padrão RDO) que a gente
 * quer que a pessoa receba ao baixar. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlArquivo = searchParams.get("url");
  const nome = searchParams.get("nome");

  if (!urlArquivo || !nome) {
    return NextResponse.json({ erro: "Faltam parâmetros (url e nome)." }, { status: 400 });
  }

  let urlValida: URL;
  try {
    urlValida = new URL(urlArquivo);
  } catch {
    return NextResponse.json({ erro: "URL inválida." }, { status: 400 });
  }

  if (!hostPermitido(urlValida)) {
    return NextResponse.json({ erro: "Origem do arquivo não permitida." }, { status: 403 });
  }

  const resposta = await fetch(urlValida.toString());
  if (!resposta.ok || !resposta.body) {
    return NextResponse.json({ erro: "Não consegui baixar o arquivo da nuvem." }, { status: 502 });
  }

  const nomeAscii = nomeArquivoSeguro(nome);
  const nomeCodificado = encodeURIComponent(nome);

  return new NextResponse(resposta.body, {
    headers: {
      "Content-Type": resposta.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${nomeAscii}"; filename*=UTF-8''${nomeCodificado}`,
      "Cache-Control": "no-store",
    },
  });
}
