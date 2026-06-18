const DEPTS_EXEMPTS_FP = ['agraria', 'industries alimentaries'];

function normalitzarText(text) {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function esDepartamentFP(departament) {
  const norm = normalitzarText(departament);
  return DEPTS_EXEMPTS_FP.some((d) => norm.includes(d));
}

export function esTutor(professor, classes) {
  return classes.some((c) => {
    const esAssignat =
      c.professorAssignat === professor.nom || (c.professors || []).includes(professor.nom);
    if (!esAssignat) return false;
    const materia = (c.materia || '').trim().replace(/^\*/, '').toLowerCase();
    return materia === 'tutoria';
  });
}

export function esParticipantComissio(professor, classes) {
  return classes.some(
    (c) =>
      (c.tipus || '').toUpperCase() === 'C' &&
      (c.participants || []).includes(professor.nom) &&
      c.professorAssignat !== professor.nom
  );
}

export function guardesQueTocaFer(professor, classes) {
  if (professor.exempteGuardies || esDepartamentFP(professor.departament)) return 0;
  const base = esTutor(professor, classes) ? 2 : 4;
  const reduccions =
    (esParticipantComissio(professor, classes) ? 1 : 0) +
    Math.max(0, Number(professor.gpAssignades || 0)) +
    Math.max(0, Number(professor.gcAssignades || 0));
  return Math.max(0, base - reduccions);
}

export function motiusReduccio(professor, classes) {
  if (professor.exempteGuardies) return ['Exempt (dedicació)'];
  if (esDepartamentFP(professor.departament)) return ['Exempt (dept. FP)'];
  const motius = [];
  if (esTutor(professor, classes)) motius.push('Tutor (base 2)');
  if (esParticipantComissio(professor, classes)) motius.push('Comissió −1');
  const gp = Number(professor.gpAssignades || 0);
  if (gp > 0) motius.push(`GP −${gp}`);
  const gc = Number(professor.gcAssignades || 0);
  if (gc > 0) motius.push(`GC −${gc}`);
  return motius;
}
