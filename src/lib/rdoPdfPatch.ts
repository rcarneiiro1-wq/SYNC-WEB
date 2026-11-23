import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Corrige campos do PDF de RDO já gerado (12/11) - criado depois do
 * incidente do campo "Local" errado em 3 RDOs (19/22/23-10), que só foi
 * corrigido na hora à mão (Python/pikepdf, fora deste projeto). Essa
 * versão em TypeScript/pdf-lib roda direto na Server Action de edição de
 * RDO (`rdoEditorActions.ts`) - mesma ideia (apaga visualmente o valor
 * antigo com um retângulo branco e desenha o novo por cima), mas com UMA
 * diferença importante: pdf-lib não dá um jeito fácil de REMOVER o texto
 * antigo do fluxo de conteúdo do PDF (o pikepdf em Python consegue isso,
 * achando e zerando o operador `TJ` certo) - aqui só cobre visualmente.
 * Pra quem abre/baixa/imprime o PDF normalmente isso é 100% igual ao
 * resultado final - só não adianta copiar/colar ou buscar texto bem em
 * cima da área coberta, porque o valor antigo ainda existe "por baixo",
 * invisível. Suficiente pro uso real (ver/baixar/imprimir o RDO), mas
 * documentado aqui caso algum dia vire problema (ex: alguém processando
 * o PDF por OCR/extração de texto).
 *
 * As coordenadas abaixo são FIXAS - vieram de medir o PDF de verdade
 * (pdfplumber) nos RDOs de Rafael/Gustavo, que usam todos o MESMO molde
 * Excel (`modulos/rdo/excel_generator.py` no desktop) - qualquer RDO
 * gerado por esse molde tem o campo "Local" e o bloco de "Descrição" sempre
 * no mesmo lugar, no mesmo tamanho de página (992x1403.4pt). Se um dia o
 * molde do Excel mudar de layout, essas coordenadas ficam desatualizadas e
 * passam a cobrir/escrever no lugar errado - vale reconferir com um RDO de
 * verdade se isso acontecer.
 */

const COR_BRANCA = rgb(1, 1, 1);
const COR_PRETA = rgb(0, 0, 0);

// --- campo "Local" (célula única, valor centralizado) ---
const LOCAL_CAIXA = { x0: 732.5, x1: 939.8, topTop: 236.3, topBottom: 283.2 };
const LOCAL_FONTE_TAMANHO = 12;
const LOCAL_VALOR_BOTTOM_REF = 267.8; // bottom (pdfplumber) do valor original, pra calcular a baseline

// --- bloco "Descrição das atividades do executante" (célula alta, texto corrido) ---
const DESCRICAO_CAIXA = { x0: 98.0, x1: 728.5, topTop: 589.6, topBottom: 980.1 };
const DESCRICAO_FONTE_TAMANHO = 13;
const DESCRICAO_ALTURA_LINHA = 16; // pt entre uma linha e a próxima
const DESCRICAO_PRIMEIRA_LINHA_BOTTOM_REF = 605.4; // bottom (pdfplumber) da 1a linha original
const DESCRICAO_MARGEM_ESQUERDA = 100.0;

function paraPdfY(pageHeight: number, topDownY: number): number {
  return pageHeight - topDownY;
}

/** Quebra um texto em linhas que cabem em `larguraMax`, respeitando
 * quebras de parágrafo já existentes (`\n`) - cada parágrafo some pra uma
 * ou mais linhas, e entre parágrafos entra uma linha em branco (mesmo
 * padrão visual que o RDO original já tinha, confirmado medindo o
 * espaçamento real entre os blocos de texto no PDF: o dobro da altura de
 * uma linha normal). */
function quebrarEmLinhas(texto: string, fonte: PDFFont, tamanho: number, larguraMax: number): string[] {
  const paragrafos = texto.split(/\r?\n/);
  const linhas: string[] = [];
  paragrafos.forEach((paragrafo, indiceParagrafo) => {
    if (indiceParagrafo > 0) linhas.push(""); // linha em branco entre parágrafos
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (palavras.length === 0) {
      linhas.push("");
      return;
    }
    let linhaAtual = "";
    for (const palavra of palavras) {
      const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= larguraMax) {
        linhaAtual = tentativa;
      } else {
        if (linhaAtual) linhas.push(linhaAtual);
        linhaAtual = palavra;
      }
    }
    if (linhaAtual) linhas.push(linhaAtual);
  });
  return linhas;
}

/** Corrige o campo "Local" (ex: BORESTE/BOMBORDO/PROA/POPA/FLARE/
 * VENTPOST) - cobre a célula inteira de branco e escreve o novo valor
 * centralizado, no mesmo tamanho/posição que o valor original sempre
 * ocupou. */
export function corrigirCampoLocal(page: PDFPage, fonte: PDFFont, novoValor: string, pageHeight: number) {
  const caixa = LOCAL_CAIXA;
  const yInferior = paraPdfY(pageHeight, caixa.topBottom);
  const ySuperior = paraPdfY(pageHeight, caixa.topTop);
  page.drawRectangle({
    x: caixa.x0,
    y: yInferior,
    width: caixa.x1 - caixa.x0,
    height: ySuperior - yInferior,
    color: COR_BRANCA,
  });

  const baseline = paraPdfY(pageHeight, LOCAL_VALOR_BOTTOM_REF) + 2.2; // mesma folga usada no fix manual de hoje
  const centroX = (caixa.x0 + caixa.x1) / 2;
  const largura = fonte.widthOfTextAtSize(novoValor, LOCAL_FONTE_TAMANHO);
  page.drawText(novoValor, {
    x: centroX - largura / 2,
    y: baseline,
    size: LOCAL_FONTE_TAMANHO,
    font: fonte,
    color: COR_PRETA,
  });
}

/** Corrige o bloco "Descrição das atividades do executante" - cobre a
 * célula inteira de branco e reescreve o texto novo, quebrando linha
 * sozinho pra caber na largura da coluna. Devolve `transbordou: true` se o
 * texto novo precisar de mais linhas do que a célula original tinha
 * espaço (nesse caso o texto ainda é desenhado inteiro, só que pode
 * invadir visualmente a área abaixo da célula no PDF - função avisa pra
 * quem chamou decidir o que falar pro usuário). */
export function corrigirDescricao(
  page: PDFPage,
  fonte: PDFFont,
  novoTexto: string,
  pageHeight: number
): { transbordou: boolean; linhas: number } {
  const caixa = DESCRICAO_CAIXA;
  const yInferior = paraPdfY(pageHeight, caixa.topBottom);
  const ySuperior = paraPdfY(pageHeight, caixa.topTop);
  page.drawRectangle({
    x: caixa.x0,
    y: yInferior,
    width: caixa.x1 - caixa.x0,
    height: ySuperior - yInferior,
    color: COR_BRANCA,
  });

  const larguraMax = caixa.x1 - DESCRICAO_MARGEM_ESQUERDA - 2;
  const linhas = quebrarEmLinhas(novoTexto, fonte, DESCRICAO_FONTE_TAMANHO, larguraMax);

  const primeiraBaseline = paraPdfY(pageHeight, DESCRICAO_PRIMEIRA_LINHA_BOTTOM_REF) + 2.2;
  const linhasQueCabem = Math.floor((ySuperior - yInferior) / DESCRICAO_ALTURA_LINHA);

  linhas.forEach((linha, indice) => {
    if (!linha) return; // linha em branco entre parágrafos - só pula espaço, não desenha nada
    const baseline = primeiraBaseline - indice * DESCRICAO_ALTURA_LINHA;
    page.drawText(linha, {
      x: DESCRICAO_MARGEM_ESQUERDA,
      y: baseline,
      size: DESCRICAO_FONTE_TAMANHO,
      font: fonte,
      color: COR_PRETA,
    });
  });

  return { transbordou: linhas.length > linhasQueCabem, linhas: linhas.length };
}

export type ResultadoPatchRdo = { bytes: Uint8Array; transbordouDescricao: boolean };

/** Função principal - abre o PDF existente (bytes já baixados de
 * `arquivo_pdf_url`), aplica as correções pedidas (qualquer uma das duas é
 * opcional - passa `null` pra não mexer naquele campo) e devolve os bytes
 * do PDF corrigido, pronto pra sobrescrever no Storage. */
export async function corrigirPdfRdo(
  bytesOriginais: Uint8Array,
  campos: { novoLocal?: string | null; novaDescricao?: string | null }
): Promise<ResultadoPatchRdo> {
  const pdfDoc = await PDFDocument.load(bytesOriginais);
  const pagina = pdfDoc.getPages()[0];
  const { height: alturaPagina } = pagina.getSize();
  const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);

  if (campos.novoLocal != null && campos.novoLocal !== "") {
    corrigirCampoLocal(pagina, fonte, campos.novoLocal, alturaPagina);
  }

  let transbordouDescricao = false;
  if (campos.novaDescricao != null && campos.novaDescricao !== "") {
    const resultado = corrigirDescricao(pagina, fonte, campos.novaDescricao, alturaPagina);
    transbordouDescricao = resultado.transbordou;
  }

  const bytes = await pdfDoc.save();
  return { bytes, transbordouDescricao };
}
