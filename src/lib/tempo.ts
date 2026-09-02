/** "02/09/2026 09:54 (há 1h)" - igual o desktop mostra "Última atualização"
 * na janela de RDOs. Roda no navegador (componente client), então
 * `Date.now()` usa o relógio de quem está vendo a tela. */
export function tempoRelativo(dataIso: string | null): string {
  if (!dataIso) return "-";
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "-";

  const diffMs = Date.now() - data.getTime();
  const diffMin = Math.round(diffMs / 60000);

  let relativo: string;
  if (diffMin < 1) relativo = "agora mesmo";
  else if (diffMin < 60) relativo = `há ${diffMin} min`;
  else if (diffMin < 60 * 24) relativo = `há ${Math.round(diffMin / 60)}h`;
  else relativo = `há ${Math.round(diffMin / (60 * 24))} dia(s)`;

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);

  return `${dataFormatada} (${relativo})`;
}
