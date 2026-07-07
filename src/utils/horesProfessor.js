import { classeRequereixDosProfessors, exclosaDelRepartiment } from './tipus';

export function professorsClasse(classe) {
  if (Array.isArray(classe.professors) && classe.professors.length > 0)
    return classe.professors.filter(Boolean);
  return [classe.professorAssignat].filter(Boolean);
}

export function classeAssignadaA(classe, nomProfessor) {
  return professorsClasse(classe).includes(nomProfessor);
}

export function horesComputablesClasse(classe) {
  const profs = professorsClasse(classe);
  if (classeRequereixDosProfessors(classe) && profs.length > 1)
    return (Number(classe.hores) || 0) / profs.length;
  return Number(classe.hores) || 0;
}

export function calcularHoresLectives(classes, nomProfessor) {
  return classes
    .filter(c =>
      classeAssignadaA(c, nomProfessor) &&
      (!exclosaDelRepartiment(c.tipus) || esMajorDe55Classe(c))
    )
    .reduce((sum, c) => sum + horesComputablesClasse(c), 0);
}

export function esMajorDe55Classe(classe) {
  const original = (classe?.materia || '').toString().trim();
  if (original.includes('>55')) return true;
  const normalized = original.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const words = normalized.replace(/[^a-z0-9]/g, ' ').trim();
  return words.includes('majors') && words.includes('55');
}

export function normalitzarJornada(jornada) {
  const value = (jornada || '').toString().trim().toUpperCase();
  return value === 'M' || value === 'T' ? value : '';
}

export function limitsHoresProfessor(professor = {}) {
  const jornada = normalitzarJornada(professor.jornada);

  if (jornada === 'M') {
    return {
      ideal: 9,
      maxim: 10,
      label: 'Mitja jornada',
    };
  }

  if (jornada === 'T') {
    return {
      ideal: 13,
      maxim: 14,
      label: "Reducció d'1/3",
    };
  }

  return {
    ideal: 18,
    maxim: 21,
    label: 'Jornada completa',
  };
}

export function resumCapacitatProfessorat(professors = []) {
  return professors.reduce(
    (resum, professor) => {
      const limits = limitsHoresProfessor(professor);
      const jornada = normalitzarJornada(professor.jornada) || 'N';
      resum.ideal += limits.ideal;
      resum.maxim += limits.maxim;
      resum.total += 1;
      resum.perJornada[jornada] = (resum.perJornada[jornada] || 0) + 1;
      return resum;
    },
    {
      ideal: 0,
      maxim: 0,
      total: 0,
      perJornada: { N: 0, T: 0, M: 0 },
    }
  );
}

export function textJornada(professor = {}) {
  const jornada = normalitzarJornada(professor.jornada);
  if (jornada === 'M') return 'Mitja jornada';
  if (jornada === 'T') return "Reducció d'1/3";
  return 'Jornada completa';
}
