/** Mesma lógica de `montar_nome_arquivo_rdo()` do desktop (arquivo
 * modulos/rdo/gerenciamento_telas.py) - o nome do arquivo baixado tem que
 * ficar IGUAL nos dois lados. Sem isso, quem baixa o PDF pela web recebe
 * um nome genérico (o nome interno do arquivo na nuvem), em vez do nome
 * padronizado que o resto da empresa já usa e reconhece. Exemplo de saída:
 * "01-RDO-INFOTEC-P-78-16-04-26-RAFAEL CARNEIRO.pdf" */
export function montarNomeArquivoRdo(
  numeroRdo: number | null | undefined,
  empresa: string | null | undefined,
  localCodigo: string | null | undefined,
  dataIso: string | null | undefined,
  nomeColaborador: string | null | undefined
): string {
  const numeroTexto = numeroRdo ? String(numeroRdo).padStart(2, "0") : "00";
  const empresaTexto = (empresa || "EMPRESA").toUpperCase();
  const plataformaTexto = (localCodigo || "PLATAFORMA").toUpperCase();

  let dataTexto = "00-00-00";
  if (dataIso) {
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
    if (ano && mes && dia) dataTexto = `${dia}-${mes}-${ano.slice(2)}`;
  }

  const nomeTexto = (nomeColaborador || "COLABORADOR").toUpperCase();
  return `${numeroTexto}-RDO-${empresaTexto}-${plataformaTexto}-${dataTexto}-${nomeTexto}.pdf`;
}

/** Tira acento e troca caractere que nome de arquivo do Windows não aceita
 * (\ / : * ? " < > |). Usado só como alternativa em ASCII puro dentro do
 * cabeçalho de download (o nome de verdade, com acento, vai também no
 * `filename*` do Content-Disposition, que os navegadores atuais preferem -
 * a versão sem acento é só um fallback pros mais antigos). */
export function nomeArquivoSeguro(nome: string): string {
  const semAcento = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcento.replace(/[\\/:*?"<>|]/g, "-");
}
