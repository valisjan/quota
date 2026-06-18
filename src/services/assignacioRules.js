import { professorsClasse } from '../utils/horesProfessor';
import { esOptativaCompartida } from '../utils/tipus';
import {
  esCapsEstudisClasse,
  esTutoriaAsterisc,
  esTutoriaPrincipal,
  trobarAssignaturesParelladesTutoria,
  trobarDedicacioPerCapEstudis,
  trobarTutoriaAsterisc,
  trobarTutoriaPrincipal,
} from '../utils/tutories';
import { trobarGermanesBloc } from '../utils/grups';

function afegirClasseUnica(mapa, classe) {
  if (!classe?.id || mapa.has(classe.id)) return;
  mapa.set(classe.id, classe);
}

function tutoriaPrincipalDe(classe, classes) {
  if (esTutoriaPrincipal(classe)) return classe;
  if (esTutoriaAsterisc(classe)) return trobarTutoriaPrincipal(classe, classes);
  return null;
}

function normalitzarLlistaProfessors(professors = []) {
  return [...new Set(professors.filter(Boolean))];
}

export function professorsAmbCanvi(classe, nomProfessor, index = 0) {
  if (index === 0 && !esOptativaCompartida(classe?.tipus)) {
    return nomProfessor ? [nomProfessor] : [];
  }

  const professors = professorsClasse(classe);
  professors[index] = nomProfessor;
  return normalitzarLlistaProfessors(professors);
}

export function resoldreClassesRelacionadesAssignacio(classe, classes = []) {
  const relacionades = new Map();
  afegirClasseUnica(relacionades, classe);

  const tutoriaPrincipal = tutoriaPrincipalDe(classe, classes);
  if (tutoriaPrincipal) {
    afegirClasseUnica(relacionades, tutoriaPrincipal);
    afegirClasseUnica(relacionades, trobarTutoriaAsterisc(tutoriaPrincipal, classes));

    for (const assignatura of trobarAssignaturesParelladesTutoria(tutoriaPrincipal, classes)) {
      afegirClasseUnica(relacionades, assignatura);
    }
  }

  for (const germana of trobarGermanesBloc(classe, classes)) {
    afegirClasseUnica(relacionades, germana);
  }

  if (esCapsEstudisClasse(classe)) {
    for (const dedicacio of trobarDedicacioPerCapEstudis(classe, classes)) {
      afegirClasseUnica(relacionades, dedicacio);
    }
  }

  return [...relacionades.values()];
}

export function crearActualitzacionsAssignacio({ classe, classes = [], professors = [] }) {
  const professorsNormalitzats = normalitzarLlistaProfessors(professors);
  return resoldreClassesRelacionadesAssignacio(classe, classes).map((item) => ({
    classe: item,
    professors: [...professorsNormalitzats],
    professorAssignat: professorsNormalitzats[0] || '',
  }));
}

export function crearActualitzacionsCanviProfessor({ classe, classes = [], nomProfessor, index = 0 }) {
  return crearActualitzacionsAssignacio({
    classe,
    classes,
    professors: professorsAmbCanvi(classe, nomProfessor, index),
  });
}

export function crearActualitzacionsDesassignacioProfessor({ classe, classes = [], nomProfessor }) {
  return resoldreClassesRelacionadesAssignacio(classe, classes).map((item) => {
    const professors = professorsClasse(item).filter((nom) => nom && nom !== nomProfessor);
    return {
      classe: item,
      professors,
      professorAssignat:
        item.professorAssignat === nomProfessor
          ? professors[0] || ''
          : item.professorAssignat || '',
    };
  });
}
