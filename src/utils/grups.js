import { classeCompletamentAssignada } from './assignacions';
import { clauFranjaOptativa, comptaPerGrupPerTipus, esOptativa, normalitzarTipus } from './tipus';
import { esTutoria, normalitzarCodiTutoria } from './tutories';

export function normalitzarGrup(grup) {
  const value = (grup || '').toString().trim();
  if (!value || value.includes('+') || value.length <= 1) return value;
  if (/^[A-Za-z]+$/.test(value)) return value.split('').join('+');
  return value;
}

export function expandirGrups(classe) {
  const grup = normalitzarGrup(classe?.grup);
  if (!grup) return [];
  return grup.split('+').map((g) => ({ ...classe, grup: g }));
}

export function teGrup(classe) {
  return Boolean((classe?.curs || '').toString().trim() && (classe?.grup || '').toString().trim());
}

export function comptaPerGrup(classe) {
  if (!teGrup(classe)) return false;
  if ((classe?.materia || '').toString().trim().startsWith('*')) return false;
  return comptaPerGrupPerTipus(classe?.tipus);
}

export function trobarGermanesBloc(classe, classes = []) {
  const tipus = (classe?.tipus || '').toString().trim();
  if (tipus !== '') return [];
  if (esTutoria(classe)) return [];
  const cursNorm = normalitzarCodiTutoria(classe?.curs);
  const grupNorm = normalitzarCodiTutoria(classe?.grup);
  if (!cursNorm || grupNorm.length !== 1 || !/^[A-Z]$/.test(grupNorm)) return [];
  const materiaNorm = normalitzarCodiTutoria(classe?.materia);
  if (!materiaNorm) return [];
  const departaments = classe?.departaments || [];
  return classes.filter((c) => {
    if (c.id === classe.id) return false;
    if ((c.tipus || '').toString().trim() !== '') return false;
    if (esTutoria(c)) return false;
    if (normalitzarCodiTutoria(c.curs) !== cursNorm) return false;
    if (normalitzarCodiTutoria(c.materia) !== materiaNorm) return false;
    const cDepts = c.departaments || [];
    if (!departaments.some((d) => cDepts.includes(d))) return false;
    const cGrupNorm = normalitzarCodiTutoria(c.grup);
    return cGrupNorm.length === 1 && /^[A-Z]$/.test(cGrupNorm) && cGrupNorm !== grupNorm;
  });
}

export function calcularTotalHoresGrup(classesDelGrup, nomesAssignades = false) {
  const optativesVistes = new Set();
  const materiesMax = {};
  let total = 0;

  classesDelGrup.forEach((classe) => {
    const tipus = normalitzarTipus(classe.tipus);
    if (!comptaPerGrup(classe)) return;
    if (nomesAssignades && !classeCompletamentAssignada(classe)) return;

    if (esOptativa(tipus)) {
      const clauOptativa = clauFranjaOptativa(tipus);
      if (!optativesVistes.has(clauOptativa)) {
        optativesVistes.add(clauOptativa);
        total += Number(classe.hores) || 0;
      }
    } else if (classe.materia) {
      materiesMax[classe.materia] = Math.max(
        materiesMax[classe.materia] || 0,
        Number(classe.hores) || 0
      );
    }
  });

  Object.values(materiesMax).forEach((hores) => {
    total += hores;
  });

  return total;
}
