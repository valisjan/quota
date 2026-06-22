import { normalitzarTipus } from './tipus';

export function normalitzarCodiTutoria(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalitzarMateria(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\*/, '')
    .trim()
    .toLowerCase();
}

export function esTutoria(classe) {
  return normalitzarMateria(classe?.materia).includes('tutoria');
}

export function esTutoriaAsterisc(classe) {
  return (classe?.materia || '').toString().trim().startsWith('*') && esTutoria(classe);
}

export function esTutoriaPrincipal(classe) {
  return esTutoria(classe) && !esTutoriaAsterisc(classe);
}

function extreureCursGrupDeMateria(materia) {
  const compact = normalitzarCodiTutoria(materia);
  const patrons = [
    /([1-4]ESO)([A-Z])$/,
    /([12]BATX?)([A-Z])$/,
    /([1-2]BAT)([A-Z])$/,
  ];

  for (const patro of patrons) {
    const match = compact.match(patro);
    if (match) {
      return {
        curs: match[1].replace('BATX', 'BAT'),
        grup: match[2],
      };
    }
  }

  return null;
}

export function clauCursGrupTutoria(classe) {
  const curs = normalitzarCodiTutoria(classe?.curs);
  const grup = normalitzarCodiTutoria(classe?.grup);
  if (curs && grup) return `${curs}|${grup}`;

  const extret = extreureCursGrupDeMateria(classe?.materia);
  if (!extret) return '';
  return `${normalitzarCodiTutoria(extret.curs)}|${normalitzarCodiTutoria(extret.grup)}`;
}

export function trobarTutoriaAsterisc(tutoria, classes = []) {
  if (!esTutoriaPrincipal(tutoria)) return null;

  const clau = clauCursGrupTutoria(tutoria);
  if (!clau) return null;

  return classes.find(
    (classe) =>
      classe.id !== tutoria.id &&
      esTutoriaAsterisc(classe) &&
      clauCursGrupTutoria(classe) === clau
  ) || null;
}

export function trobarTutoriaPrincipal(tutoriaAsterisc, classes = []) {
  if (!esTutoriaAsterisc(tutoriaAsterisc)) return null;

  const clau = clauCursGrupTutoria(tutoriaAsterisc);
  if (!clau) return null;

  return classes.find(
    (classe) =>
      classe.id !== tutoriaAsterisc.id &&
      esTutoriaPrincipal(classe) &&
      clauCursGrupTutoria(classe) === clau
  ) || null;
}

export function teTutoriaPrincipalParellada(tutoriaAsterisc, classes = []) {
  if (!esTutoriaAsterisc(tutoriaAsterisc)) return false;

  const clau = clauCursGrupTutoria(tutoriaAsterisc);
  if (!clau) return false;

  return classes.some(
    (classe) =>
      classe.id !== tutoriaAsterisc.id &&
      esTutoriaPrincipal(classe) &&
      clauCursGrupTutoria(classe) === clau
  );
}

function normalitzarGrupBloc(grup) {
  const value = (grup || '').toString().trim();
  if (!value || value.includes('+') || value.length <= 1) return value;
  if (/^[A-Za-z]+$/.test(value)) return value.split('').join('+');
  return value;
}

function normalitzarTextTutoria(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalitzarMateriaBaseTutoria(text) {
  return normalitzarTextTutoria(text)
    .replace(/\b(i|ii|iii|iv|v|1|2|3|4)\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tipusExclosDeParellTutoria(tipus) {
  const normal = normalitzarTipus(tipus);
  return !!normal;
}

function teMarcaNoTroncal(materia) {
  const normal = normalitzarTextTutoria(materia);
  return /\b(optativa|optatives|suport|desdoblament|desdoble|flexible|codocencia)\b/.test(normal);
}

function mateixDepartament(departamentsTutoria, departamentsClasse) {
  const normalsTutoria = new Set(departamentsTutoria.map(normalitzarCodiTutoria));
  return departamentsClasse.some((departament) =>
    normalsTutoria.has(normalitzarCodiTutoria(departament))
  );
}

function departamentsClasseTutoria(classe = {}) {
  const departaments = Array.isArray(classe.departaments) ? classe.departaments : [];
  return [...new Set([...departaments, classe.departament].filter(Boolean))];
}

function grupsClasseTutoria(classe) {
  return normalitzarGrupBloc(classe.grup)
    .split('+')
    .map((g) => normalitzarCodiTutoria(g))
    .filter(Boolean);
}

function scoreAssignaturaParelladaTutoria(classe, tutoria, grupTutoria) {
  const grups = grupsClasseTutoria(classe);
  const grupOriginal = normalitzarCodiTutoria(classe.grup);
  let score = 0;

  if (grupOriginal === grupTutoria) score += 120;
  else if (grups.includes(grupTutoria)) score += 45;

  const materiaBase = normalitzarMateriaBaseTutoria(classe.materia);
  const departamentsBase = (tutoria.departaments || []).map(normalitzarMateriaBaseTutoria);
  if (departamentsBase.includes(materiaBase)) {
    score += 90;
  } else if (
    departamentsBase.some(
      (departament) =>
        departament &&
        (materiaBase === departament ||
          materiaBase.startsWith(`${departament} `) ||
          departament.startsWith(`${materiaBase} `))
    )
  ) {
    score += 35;
  }

  if (teMarcaNoTroncal(classe.materia)) score -= 100;
  if (grups.length > 1) score -= 15;
  score -= Math.max(0, materiaBase.length - 24) / 4;

  return score;
}

export function esCapsEstudisClasse(classe) {
  const original = (classe?.materia || '').toString().trim();
  if (original.startsWith('*')) return false;
  const words = original.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  return words.includes('cap') && words.includes('estudis');
}

export function esDedicacioPrefacturaClasse(classe) {
  const original = (classe?.materia || '').toString().trim();
  if (!original.startsWith('*')) return false;
  const materia = normalitzarMateria(original);
  return materia.includes('dedicaci') && (materia.includes('prefactura') || materia.includes('prefectura'));
}

export function trobarDedicacioPerCapEstudis(classe, classes = []) {
  if (!esCapsEstudisClasse(classe)) return [];
  const departaments = classe?.departaments || [];
  return classes.filter(
    (c) =>
      c.id !== classe.id &&
      esDedicacioPrefacturaClasse(c) &&
      (
        departaments.length === 0 ||
        (c.departaments || []).length === 0 ||
        (c.departaments || []).some((d) => departaments.includes(d))
      )
  );
}

// Returns the tutor's regular subject in the same department+curs whose group contains the tutoria's group.
// Used to auto-sync the paired subject when a tutoria is assigned.
export function trobarAssignaturesParelladesTutoria(tutoria, classes = []) {
  if (!esTutoriaPrincipal(tutoria)) return [];

  const clau = clauCursGrupTutoria(tutoria);
  if (!clau) return [];
  const [cursNorm, grupTutoria] = clau.split('|');
  if (!cursNorm || !grupTutoria) return [];

  const departamentsTutoria = departamentsClasseTutoria(tutoria);
  if (departamentsTutoria.length === 0) return [];

  const candidates = classes.filter((classe) => {
    if (classe.id === tutoria.id) return false;
    if (esTutoria(classe)) return false;
    if (tipusExclosDeParellTutoria(classe.tipus)) return false;
    if (normalitzarCodiTutoria(classe.curs) !== cursNorm) return false;
    const departamentsClasse = departamentsClasseTutoria(classe);
    if (!mateixDepartament(departamentsTutoria, departamentsClasse)) return false;
    const grups = grupsClasseTutoria(classe);
    return grups.includes(grupTutoria);
  });

  return candidates
    .sort((a, b) => {
      const scoreA = scoreAssignaturaParelladaTutoria(a, tutoria, grupTutoria);
      const scoreB = scoreAssignaturaParelladaTutoria(b, tutoria, grupTutoria);
      if (scoreA !== scoreB) return scoreB - scoreA;
      const materiaA = normalitzarMateriaBaseTutoria(a.materia);
      const materiaB = normalitzarMateriaBaseTutoria(b.materia);
      if (materiaA.length !== materiaB.length) return materiaA.length - materiaB.length;
      return (a.materia || '').localeCompare(b.materia || '');
    })
    .slice(0, 1);
}
