"use client";

export type ArquivoParaZip = { url: string; nome: string };

/** Monta a URL do proxy de download de um único arquivo (RDO ou anexo),
 * já com o nome certo - usar isso no `href` de um `<a>` é suficiente, não
 * precisa de JavaScript: o servidor devolve o arquivo com o cabeçalho
 * Content-Disposition certo, então o navegador baixa direto com o nome
 * bonito, sem precisar simular clique nem lidar com blob. */
export function urlDownloadArquivo(urlOriginal: string, nome: string): string {
  const parametros = new URLSearchParams({ url: urlOriginal, nome });
  return `/api/baixar-arquivo?${parametros.toString()}`;
}

/** "Baixar todos": pede o zip pro backend (POST, porque a lista pode ser
 * grande demais pra caber numa querystring) e dispara o download no
 * navegador assim que a resposta chega. Devolve uma mensagem de erro (para
 * mostrar pra pessoa) ou `null` quando deu certo. */
export async function baixarTodosComoZip(arquivos: ArquivoParaZip[], nomeZip: string): Promise<string | null> {
  if (arquivos.length === 0) return "Não tem nenhum PDF pra baixar ainda.";
  try {
    const resposta = await fetch("/api/baixar-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arquivos, nomeZip }),
    });
    if (!resposta.ok) {
      return "Não consegui gerar o zip agora. Tenta de novo em instantes.";
    }
    const blob = await resposta.blob();
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlBlob;
    link.download = nomeZip;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(urlBlob);
    return null;
  } catch {
    return "Não consegui gerar o zip agora. Tenta de novo em instantes.";
  }
}
