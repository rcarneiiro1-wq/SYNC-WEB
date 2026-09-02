import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { nomeArquivoSeguro } from "@/lib/nomeArquivo";

export const dynamic = "force-dynamic";

type ArquivoPedido = { url: string; nome: string };

function hostPermitido(url: URL): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    return url.host === new URL(supabaseUrl).host;
  } catch {
    return false;
  }
}

/** "Baixar todos": recebe a lista de arquivos (com o nome bonito que cada
 * um deve ter) num POST - não dá pra usar um simples link com `?url=...`
 * pra isso porque a lista pode ser grande demais pra caber numa querystring
 * (tem limite de tamanho de URL). Monta um .zip no servidor e devolve
 * pronto pra download, já com o nome de cada arquivo dentro do zip igual
 * ao nome que a pessoa veria se baixasse um por um. */
export async function POST(request: NextRequest) {
  let corpo: { arquivos?: ArquivoPedido[]; nomeZip?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const arquivos = corpo.arquivos || [];
  const nomeZip = nomeArquivoSeguro(corpo.nomeZip || "rdos.zip");

  if (arquivos.length === 0) {
    return NextResponse.json({ erro: "Nenhum arquivo pedido." }, { status: 400 });
  }
  if (arquivos.length > 200) {
    return NextResponse.json({ erro: "Muitos arquivos de uma vez só - tenta em partes menores." }, { status: 400 });
  }

  const zip = new JSZip();
  const usados = new Set<string>();

  for (const item of arquivos) {
    let urlValida: URL;
    try {
      urlValida = new URL(item.url);
    } catch {
      continue;
    }
    if (!hostPermitido(urlValida)) continue;

    const resposta = await fetch(urlValida.toString());
    if (!resposta.ok) continue;
    const bytes = await resposta.arrayBuffer();

    // evita sobrescrever dentro do zip se, por algum motivo, dois arquivos
    // pedidos derem o mesmo nome final
    let nomeFinal = nomeArquivoSeguro(item.nome || "arquivo.pdf");
    let contador = 2;
    while (usados.has(nomeFinal)) {
      const semExtensao = nomeFinal.replace(/\.pdf$/i, "");
      nomeFinal = `${semExtensao} (${contador}).pdf`;
      contador += 1;
    }
    usados.add(nomeFinal);

    zip.file(nomeFinal, bytes);
  }

  if (usados.size === 0) {
    return NextResponse.json({ erro: "Não consegui baixar nenhum dos arquivos pedidos." }, { status: 502 });
  }

  const conteudoZip = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(new Blob([new Uint8Array(conteudoZip)]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nomeZip}"`,
      "Cache-Control": "no-store",
    },
  });
}
