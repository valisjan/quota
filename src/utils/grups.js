import { classeCompletamentAssignada } from './assignacions';
import { clauFranjaOptativa, comptaPerGrupPerTipus, esOptativa, normalitzarTipus } from './tipus';

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
