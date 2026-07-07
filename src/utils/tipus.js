export const TIPUS = {
  DESDOBLAMENT: 'D',
  DESDOBLAMENT_DIVISIBLE: 'DD',
  CODOCENCIA: 'CD',
  SUPORT: 'S',
  SUPORT_DIVISIBLE: 'SD',
  FLEXIBLE: 'F',
  GP: 'GP',
  PALIC: 'PALIC',
  COORDINACIO: 'C',
  COORDINACIO_INDIVIDUAL: 'CO',
};

export const TIPUS_CONEGUTS = [
  '',
  TIPUS.DESDOBLAMENT,
  TIPUS.DESDOBLAMENT_DIVISIBLE,
  TIPUS.CODOCENCIA,
  TIPUS.SUPORT,
  TIPUS.SUPORT_DIVISIBLE,
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

export function esSuportDivisible(tipus) {
  return esTipus(tipus, TIPUS.SUPORT_DIVISIBLE);
}

export function esDesdoblamentDivisible(tipus) {
  return esTipus(tipus, TIPUS.DESDOBLAMENT_DIVISIBLE);
}

export function esDesdoblament(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal === TIPUS.DESDOBLAMENT || normal === TIPUS.DESDOBLAMENT_DIVISIBLE || normal === TIPUS.CODOCENCIA;
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

function normalitzarDepartament(valor) {
  return (valor || '')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function departamentsClasse(classe = {}) {
  return [
    ...(Array.isArray(classe.departaments) ? classe.departaments : []),
    classe.departament,
  ]
    .map(normalitzarDepartament)
    .filter(Boolean);
}

export function classeRequereixDosProfessors(classe = {}) {
  if (esOptativaCompartida(classe.tipus)) return true;
  return new Set(departamentsClasse(classe)).size > 1;
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
  if (normal.startsWith('T')) return 'O4';
  return normal || 'O';
}

function tipusBase(tipus) {
  const normal = normalitzarTipus(tipus);
  if (normal.startsWith('T')) return { code: normal, text: 'Optativa compartida', group: 'optativa' };
  if (normal.startsWith('O') && normal !== TIPUS.COORDINACIO_INDIVIDUAL) return { code: normal, text: 'Optativa', group: 'optativa' };
  if (esAutodesdoble(normal)) return { code: normal, text: 'Autodesdoble', group: 'autodesdoble' };

  const map = {
    D: { text: 'Desdoblament', group: 'desdoblament' },
    DD: { text: 'Desdoblament divisible', group: 'desdoblament-divisible' },
    CD: { text: 'Codoc\u00e8ncia', group: 'desdoblament' },
    S: { text: 'Suport', group: 'suport' },
    SD: { text: 'Suport divisible', group: 'suport-divisible' },
    F: { text: 'Flexible', group: 'flexible' },
    GP: { text: 'Gu\u00e0rdies de pati', group: 'gp' },
    PALIC: { text: 'PALIC', group: 'palic' },
    C: { text: 'Coordinaci\u00f3', group: 'coordinacio' },
    CO: { text: 'Coordinaci\u00f3 individual', group: 'coordinacio' },
  };

  return {
    code: normal,
    text: map[normal]?.text || tipus || '',
    group: map[normal]?.group || 'normal',
  };
}

export function getTipusText(tipus, options = {}) {
  const { includeCode = false, compact = false } = options;
  const base = tipusBase(tipus);
  if (!base.text) return '';
  if (!includeCode || !base.code) return base.text;
  if (compact && base.group === 'optativa' && base.code.startsWith('T')) return `Opt. compartida (${base.code})`;
  if (compact && base.group === 'optativa') return `Optativa (${base.code})`;
  if (compact && base.group === 'autodesdoble') return `Autodesdoble (${base.code})`;
  return `${base.text} ${base.code}`;
}


const GRUP_ICONES = {
  optativa:     '✦',
  desdoblament: '⇄',
  'desdoblament-divisible': '⇄',
  suport:       '⊕',
  autodesdoble: '↺',
  flexible:     '≈',
  gp:           '◉',
  palic:        '◆',
  coordinacio:  '⊙',
};

export function getTipusLabel(tipus) {
  const { group, text } = tipusBase(tipus);
  if (!text) return '';
  const icon = GRUP_ICONES[group];
  return icon ? `${icon} ${text}` : text;
}

export function getTipusBadgeClass(tipus, variant = 'badge') {
  const colors = {
    optativa:     'badge-green',
    desdoblament: 'badge-blue',
    'desdoblament-divisible': 'badge-blue',
    suport:       'badge-yellow',
    'suport-divisible': 'badge-yellow',
    autodesdoble: 'badge-purple',
    flexible:     'badge-indigo',
    gp:           'badge-red',
    palic:        'badge-orange',
    coordinacio:  'badge-purple',
    normal:       'badge-gray',
  };
  const color = colors[tipusBase(tipus).group] ?? 'badge-gray';
  return variant === 'sm' ? `badge-sm ${color}` : `badge ${color}`;
}

export function exclosaDelRepartiment(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal === TIPUS.GP || normal === TIPUS.PALIC || normal === TIPUS.SUPORT_DIVISIBLE || normal === TIPUS.DESDOBLAMENT_DIVISIBLE;
}

export function comptaPerGrupPerTipus(tipus) {
  const normal = normalitzarTipus(tipus);
  return ![
    TIPUS.DESDOBLAMENT,
    TIPUS.DESDOBLAMENT_DIVISIBLE,
    TIPUS.CODOCENCIA,
    TIPUS.SUPORT,
    TIPUS.SUPORT_DIVISIBLE,
    TIPUS.FLEXIBLE,
    TIPUS.PALIC,
    TIPUS.GP,
    TIPUS.COORDINACIO,
    TIPUS.COORDINACIO_INDIVIDUAL,
  ].includes(normal);
}
