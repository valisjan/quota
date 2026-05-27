export const TOTAL_GUARDIES_PATI = 30;

const DEPARTAMENTS_SENSE_GUARDIES_PATI = [
  'educacio fisica',
  'agraria',
  'forneria',
  'industries alimentaries',
];

function normalitzarText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function departamentFaGuardiesPati(departament) {
  const normal = normalitzarText(departament);
  if (!normal) return false;
  return !DEPARTAMENTS_SENSE_GUARDIES_PATI.some((exclos) =>
    normal.includes(exclos)
  );
}

export function calcularQuotesGuardiesPati(professors = [], total = TOTAL_GUARDIES_PATI) {
  const comptadors = new Map();

  for (const professor of professors) {
    const departament = (professor?.departament || '').toString().trim();
    if (!departament || !departamentFaGuardiesPati(departament)) continue;
    comptadors.set(departament, (comptadors.get(departament) || 0) + 1);
  }

  const totalProfessorat = [...comptadors.values()].reduce((sum, count) => sum + count, 0);
  if (!totalProfessorat || total <= 0) return {};

  const quotes = [...comptadors.entries()]
    .map(([departament, membres]) => {
      const exacta = (membres / totalProfessorat) * total;
      return {
        departament,
        membres,
        base: Math.floor(exacta),
        resta: exacta - Math.floor(exacta),
      };
    })
    .sort((a, b) => b.resta - a.resta || b.membres - a.membres || a.departament.localeCompare(b.departament));

  let assignades = quotes.reduce((sum, item) => sum + item.base, 0);
  let index = 0;
  while (assignades < total && quotes.length > 0) {
    quotes[index % quotes.length].base += 1;
    assignades += 1;
    index += 1;
  }

  return Object.fromEntries(
    quotes
      .sort((a, b) => a.departament.localeCompare(b.departament))
      .map((item) => [item.departament, item.base])
  );
}

export function quotaGuardiesPatiDepartament(professors = [], departament, total = TOTAL_GUARDIES_PATI) {
  if (!departamentFaGuardiesPati(departament)) return 0;
  return calcularQuotesGuardiesPati(professors, total)[departament] || 0;
}
