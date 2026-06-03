export const TIPUS = {
  DESDOBLAMENT: 'D',
  SUPORT: 'S',
  FLEXIBLE: 'F',
  GP: 'GP',
  PALIC: 'PALIC',
  COORDINACIO: 'C',
  COORDINACIO_INDIVIDUAL: 'CO',
};

export const TIPUS_CONEGUTS = [
  '',
  TIPUS.DESDOBLAMENT,
  TIPUS.SUPORT,
  TIPUS.FLEXIBLE,
  TIPUS.GP,
  TIPUS.PALIC,
  TIPUS.COORDINACIO,
  TIPUS.COORDINACIO_INDIVIDUAL,
];

export function normalitzarTipus(tipus) {
  return (tipus || '').toString().trim().toUpperCase();
}

export function esTipus(tipus, expected) {
  return normalitzarTipus(tipus) === expected;
}

export function esGP(tipus) {
  return esTipus(tipus, TIPUS.GP);
}

export function esPALIC(tipus) {
  return esTipus(tipus, TIPUS.PALIC);
}

export function esCoordinacio(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal === TIPUS.COORDINACIO || normal === TIPUS.COORDINACIO_INDIVIDUAL;
}

export function esCoordinacioAmbMembres(tipus) {
  return esTipus(tipus, TIPUS.COORDINACIO);
}

export function esCoordinacioIndividual(tipus) {
  return esTipus(tipus, TIPUS.COORDINACIO_INDIVIDUAL);
}

export function esOptativa(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal.startsWith('O') || normal.startsWith('T');
}

export function esOptativaCompartida(tipus) {
  return normalitzarTipus(tipus).startsWith('T');
}

export function esAutodesdoble(tipus) {
  return /^A\d*$/.test(normalitzarTipus(tipus));
}

export function esTipusConegut(tipus) {
  const normal = normalitzarTipus(tipus);
  return TIPUS_CONEGUTS.includes(normal) || esOptativa(normal) || esAutodesdoble(normal);
}

export function clauFranjaOptativa(tipus) {
  const normal = normalitzarTipus(tipus);
  if (normal.startsWith('T')) return `O${normal.slice(1)}`;
  return normal || 'O';
}

export function getTipusText(tipus) {
  const normal = normalitzarTipus(tipus);
  if (normal.startsWith('T')) return 'Optativa compartida';
  if (normal.startsWith('O') && normal !== TIPUS.COORDINACIO_INDIVIDUAL) return 'Optativa';
  if (esAutodesdoble(normal)) return 'Autodesdoble';
  const map = {
    D: 'Desdoblament',
    S: 'Suport',
    F: 'Flexible',
    GP: 'Guàrdies de pati',
    PALIC: 'PALIC',
    C: 'Coordinació',
    CO: 'Coordinació individual',
  };
  return map[normal] || tipus || '';
}

export function exclosaDelRepartiment(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal === TIPUS.GP || normal === TIPUS.PALIC || esCoordinacio(normal);
}

export function comptaPerGrupPerTipus(tipus) {
  const normal = normalitzarTipus(tipus);
  return ![
    TIPUS.DESDOBLAMENT,
    TIPUS.SUPORT,
    TIPUS.FLEXIBLE,
    TIPUS.PALIC,
    TIPUS.GP,
    TIPUS.COORDINACIO,
    TIPUS.COORDINACIO_INDIVIDUAL,
  ].includes(normal);
}
