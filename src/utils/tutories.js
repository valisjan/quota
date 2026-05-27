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

// Returns the tutor's regular subject in the same department+curs whose group contains the tutoria's group.
// Used to auto-sync the paired subject when a tutoria is assigned.
export function trobarAssignaturesParelladesTutoria(tutoria, classes = []) {
  if (!esTutoriaPrincipal(tutoria)) return [];

  const clau = clauCursGrupTutoria(tutoria);
  if (!clau) return [];
  const [cursNorm, grupTutoria] = clau.split('|');
  if (!cursNorm || !grupTutoria) return [];

  const departamentsTutoria = tutoria.departaments || [];
  if (departamentsTutoria.length === 0) return [];

  return classes.filter((classe) => {
    if (classe.id === tutoria.id) return false;
    if (esTutoria(classe)) return false;
    const tipus = (classe.tipus || '').toString().toUpperCase().trim();
    if (tipus) return false;
    if (normalitzarCodiTutoria(classe.curs) !== cursNorm) return false;
    const departamentsClasse = classe.departaments || [];
    if (!departamentsTutoria.some((d) => departamentsClasse.includes(d))) return false;
    const grups = normalitzarGrupBloc(classe.grup)
      .split('+')
      .map((g) => normalitzarCodiTutoria(g))
      .filter(Boolean);
    return grups.includes(grupTutoria);
  });
}
