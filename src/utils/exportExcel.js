import * as XLSX from 'xlsx';

export function descarregarExcel(fulls, nomFitxer) {
  const wb = XLSX.utils.book_new();
  for (const { nom, dades } of fulls) {
    const ws = XLSX.utils.aoa_to_sheet(dades);
    XLSX.utils.book_append_sheet(wb, ws, nom);
  }
  XLSX.writeFile(wb, `${nomFitxer}.xlsx`);
}
