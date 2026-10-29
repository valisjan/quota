// Els components carreguen aquest mòdul quan algú exporta (import dinàmic): la llibreria
// d'Excel (uns 95 kB comprimits) no es baixa en obrir el departament o els resums.
import { utils, writeFile } from 'xlsx';

export function descarregarExcel(fulls, nomFitxer) {
  const wb = utils.book_new();
  for (const { nom, dades } of fulls) {
    const ws = utils.aoa_to_sheet(dades);
    utils.book_append_sheet(wb, ws, nom);
  }
  writeFile(wb, `${nomFitxer}.xlsx`);
}
