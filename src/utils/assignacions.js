import { professorsClasse } from './horesProfessor';
import { classeRequereixDosProfessors } from './tipus';

export function classeCompletamentAssignada(classe) {
  const assignats = professorsClasse(classe).length;
  if (classeRequereixDosProfessors(classe)) return assignats >= 2;
  return assignats > 0;
}

export function professorPrincipalClasse(classe) {
  return professorsClasse(classe)[0] || '';
}

export function professorSecundariClasse(classe) {
  return professorsClasse(classe)[1] || '';
}

export function normalitzarProfessorsAssignats(classe) {
  return [...new Set(professorsClasse(classe).filter(Boolean))];
}
