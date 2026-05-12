export function professorsClasse(classe) {
  if (Array.isArray(classe.professors) && classe.professors.length > 0)
    return classe.professors.filter(Boolean);
  return [classe.professorAssignat].filter(Boolean);
}

export function classeAssignadaA(classe, nomProfessor) {
  return professorsClasse(classe).includes(nomProfessor);
}

export function horesComputablesClasse(classe) {
  const tipus = (classe.tipus || '').toString().toUpperCase().trim();
  const profs = professorsClasse(classe);
  if (tipus.startsWith('T') && profs.length > 1)
    return (Number(classe.hores) || 0) / profs.length;
  return Number(classe.hores) || 0;
}

export function calcularHoresLectives(classes, nomProfessor) {
  return classes
    .filter(c => c.tipus !== 'GP' && classeAssignadaA(c, nomProfessor))
    .reduce((sum, c) => sum + horesComputablesClasse(c), 0);
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

export function textJornada(professor = {}) {
  const jornada = normalitzarJornada(professor.jornada);
  if (jornada === 'M') return 'Mitja jornada';
  if (jornada === 'T') return "Reducció d'1/3";
  return 'Jornada completa';
}
