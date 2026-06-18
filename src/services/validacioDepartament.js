import { classeCompletamentAssignada } from '../utils/assignacions';
import { classeAssignadaA, horesComputablesClasse, limitsHoresProfessor, professorsClasse, textJornada } from '../utils/horesProfessor';
import { exclosaDelRepartiment, esGP, esOptativaCompartida, esPALIC } from '../utils/tipus';
import { classePertanyDepartament } from '../utils/departaments';
import {
  esCapsEstudisClasse,
  esTutoriaAsterisc,
  esTutoriaPrincipal,
  trobarDedicacioPerCapEstudis,
  trobarTutoriaAsterisc,
  trobarTutoriaPrincipal,
} from '../utils/tutories';
import { trobarGermanesBloc } from '../utils/grups';

function formatHores(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function labelClasse(classe = {}) {
  return [
    classe.curs,
    classe.grup,
    classe.materia,
    classe.hores ? `${formatHores(classe.hores)}h` : '',
    classe.tipus ? `Tipus ${classe.tipus}` : '',
  ]
    .map((part) => (part ?? '').toString().trim())
    .filter(Boolean)
    .join(' · ');
}

function llistaProfessors(classe = {}) {
  return [...new Set(professorsClasse(classe).filter(Boolean))];
}

function mateixaAssignacio(a, b) {
  const pa = llistaProfessors(a).sort().join('|');
  const pb = llistaProfessors(b).sort().join('|');
  return pa === pb;
}

function textAssignacio(classe = {}) {
  const professors = llistaProfessors(classe);
  return professors.length ? professors.join(', ') : 'sense professor';
}

function crearItem({ id, severitat = 'avis', categoria, titol, detall, context, target }) {
  return {
    id,
    severitat,
    bloqueja: severitat === 'critica',
    categoria,
    titol,
    detall,
    context,
    target,
  };
}

function horesTotalsProfessor(professor, classes) {
  const horesClasses = classes
    .filter((classe) => !esGP(classe.tipus) && !esPALIC(classe.tipus) && classeAssignadaA(classe, professor.nom))
    .reduce((total, classe) => total + horesComputablesClasse(classe), 0);
  return horesClasses + Number(professor.palicAssignades || 0);
}

function validarClassesSenseAssignar(classesDepartament) {
  return classesDepartament
    .filter((classe) => Number(classe.hores) > 0)
    .filter((classe) => !exclosaDelRepartiment(classe.tipus))
    .filter((classe) => !classeCompletamentAssignada(classe))
    .map((classe) =>
      crearItem({
        id: `classe-sense-${classe.id}`,
        severitat: 'critica',
        categoria: 'Classes',
        titol: classe.materia || 'Classe sense nom',
        detall: esOptativaCompartida(classe.tipus)
          ? 'L’optativa compartida necessita dos professors.'
          : 'No té cap professor assignat.',
        context: labelClasse(classe),
        target: { type: 'classe', id: classe.id },
      })
    );
}

function validarTutories(classesDepartament, classes) {
  const items = [];

  classesDepartament
    .filter(esTutoriaPrincipal)
    .forEach((classe) => {
      const asterisc = trobarTutoriaAsterisc(classe, classes);
      if (!asterisc) {
        items.push(
          crearItem({
            id: `tutoria-sense-asterisc-${classe.id}`,
            severitat: 'critica',
            categoria: 'Tutories',
            titol: classe.materia || 'Tutoria',
            detall: "No s'ha trobat la seva *Tutoria associada.",
            context: labelClasse(classe),
            target: { type: 'classe', id: classe.id },
          })
        );
        return;
      }

      if (!mateixaAssignacio(classe, asterisc)) {
        items.push(
          crearItem({
            id: `tutoria-desincronitzada-${classe.id}-${asterisc.id}`,
            severitat: 'critica',
            categoria: 'Tutories',
            titol: classe.materia || 'Tutoria',
            detall: `Tutoria: ${textAssignacio(classe)} · *Tutoria: ${textAssignacio(asterisc)}.`,
            context: labelClasse(classe),
            target: { type: 'classe', id: classe.id },
          })
        );
      }
    });

  classesDepartament
    .filter(esTutoriaAsterisc)
    .forEach((classe) => {
      const principal = trobarTutoriaPrincipal(classe, classes);
      if (!principal) {
        items.push(
          crearItem({
            id: `asterisc-sense-tutoria-${classe.id}`,
            severitat: 'critica',
            categoria: 'Tutories',
            titol: classe.materia || '*Tutoria',
            detall: "No s'ha trobat la tutoria lectiva associada.",
            context: labelClasse(classe),
            target: { type: 'classe', id: classe.id },
          })
        );
      }
    });

  return items;
}

function validarBlocsGermans(classesDepartament, classes) {
  const items = [];
  const vistes = new Set();

  classesDepartament.forEach((classe) => {
    trobarGermanesBloc(classe, classes).forEach((germana) => {
      if (!classesDepartament.some((item) => item.id === germana.id)) return;
      const key = [classe.id, germana.id].sort().join('|');
      if (vistes.has(key)) return;
      vistes.add(key);
      if (!classeCompletamentAssignada(classe) || !classeCompletamentAssignada(germana)) return;
      if (mateixaAssignacio(classe, germana)) return;

      items.push(
        crearItem({
          id: `bloc-germana-${key}`,
          severitat: 'critica',
          categoria: 'Blocs',
          titol: classe.materia || 'Bloc germà',
          detall: `${labelClasse(classe)} té ${textAssignacio(classe)} i ${labelClasse(germana)} té ${textAssignacio(germana)}.`,
          context: 'Els blocs germans haurien de mantenir el mateix professorat.',
          target: { type: 'classe', id: classe.id },
        })
      );
    });
  });

  return items;
}

function validarProfessorat(professorsDepartament, classes) {
  return professorsDepartament
    .map((professor) => {
      const hores = horesTotalsProfessor(professor, classes);
      const limits = limitsHoresProfessor(professor);
      if (hores < limits.ideal) {
        return crearItem({
          id: `prof-baix-${professor.id || professor.nom}`,
          severitat: 'avis',
          categoria: 'Professorat',
          titol: professor.nom,
          detall: `Té ${formatHores(hores)}h i l'objectiu de ${textJornada(professor)} és ${formatHores(limits.ideal)}h.`,
          context: professor.departament || '',
          target: { type: 'professor', nom: professor.nom },
        });
      }
      if (hores > limits.maxim) {
        return crearItem({
          id: `prof-alt-${professor.id || professor.nom}`,
          severitat: 'critica',
          categoria: 'Professorat',
          titol: professor.nom,
          detall: `Té ${formatHores(hores)}h i el màxim de ${textJornada(professor)} és ${formatHores(limits.maxim)}h.`,
          context: professor.departament || '',
          target: { type: 'professor', nom: professor.nom },
        });
      }
      if (hores > limits.ideal) {
        return crearItem({
          id: `prof-sobre-${professor.id || professor.nom}`,
          severitat: 'avis',
          categoria: 'Professorat',
          titol: professor.nom,
          detall: `Té ${formatHores(hores)}h, per sobre de l'objectiu de ${formatHores(limits.ideal)}h.`,
          context: professor.departament || '',
          target: { type: 'professor', nom: professor.nom },
        });
      }
      return null;
    })
    .filter(Boolean);
}

function validarGpPalic({ totalGPDepartament = 0, totalGPAssignades = 0, totalPALICDepartament = 0, totalPALICAssignades = 0 }) {
  const items = [];
  if (totalGPDepartament > 0 && totalGPAssignades !== totalGPDepartament) {
    items.push(
      crearItem({
        id: 'gp-pendent',
        severitat: 'critica',
        categoria: 'GP/PALIC',
        titol: 'Guàrdies de pati',
        detall:
          totalGPAssignades < totalGPDepartament
            ? `Falten ${formatHores(totalGPDepartament - totalGPAssignades)} guàrdies per assignar.`
            : `Hi ha ${formatHores(totalGPAssignades - totalGPDepartament)} guàrdies de més.`,
        context: `${formatHores(totalGPAssignades)} / ${formatHores(totalGPDepartament)}`,
        target: { type: 'resum' },
      })
    );
  }
  if (totalPALICDepartament > 0 && totalPALICAssignades !== totalPALICDepartament) {
    items.push(
      crearItem({
        id: 'palic-pendent',
        severitat: 'critica',
        categoria: 'GP/PALIC',
        titol: 'PALIC',
        detall:
          totalPALICAssignades < totalPALICDepartament
            ? `Falten ${formatHores(totalPALICDepartament - totalPALICAssignades)} hores PALIC per assignar.`
            : `Hi ha ${formatHores(totalPALICAssignades - totalPALICDepartament)} hores PALIC de més.`,
        context: `${formatHores(totalPALICAssignades)} / ${formatHores(totalPALICDepartament)}`,
        target: { type: 'resum' },
      })
    );
  }
  return items;
}

function validarCapsEstudis(classesDepartament, classes) {
  const items = [];

  classesDepartament
    .filter(esCapsEstudisClasse)
    .forEach((classe) => {
      const dedicacions = trobarDedicacioPerCapEstudis(classe, classes);
      dedicacions.forEach((dedicacio) => {
        if (!classeCompletamentAssignada(classe) || !classeCompletamentAssignada(dedicacio)) return;
        if (mateixaAssignacio(classe, dedicacio)) return;
        items.push(
          crearItem({
            id: `cap-estudis-dedicacio-${classe.id}-${dedicacio.id}`,
            severitat: 'critica',
            categoria: "Cap d'estudis",
            titol: classe.materia || "Cap d'estudis",
            detall: `Cap d'estudis: ${textAssignacio(classe)} · dedicació: ${textAssignacio(dedicacio)}.`,
            context: labelClasse(dedicacio),
            target: { type: 'classe', id: classe.id },
          })
        );
      });
    });

  return items;
}

export function calcularValidacioDepartament({
  departament,
  classes = [],
  professors = [],
  totalGPDepartament = 0,
  totalGPAssignades = 0,
  totalPALICDepartament = 0,
  totalPALICAssignades = 0,
} = {}) {
  const classesDepartament = classes.filter((classe) =>
    classePertanyDepartament(classe, departament)
  );
  const professorsDepartament = professors.filter((professor) => professor.departament === departament);

  const items = [
    ...validarClassesSenseAssignar(classesDepartament),
    ...validarTutories(classesDepartament, classes),
    ...validarBlocsGermans(classesDepartament, classes),
    ...validarProfessorat(professorsDepartament, classes),
    ...validarGpPalic({ totalGPDepartament, totalGPAssignades, totalPALICDepartament, totalPALICAssignades }),
    ...validarCapsEstudis(classesDepartament, classes),
  ];

  const critiques = items.filter((item) => item.severitat === 'critica');
  const avisos = items.filter((item) => item.severitat !== 'critica');

  return {
    items,
    critiques,
    avisos,
    potTancar: critiques.length === 0,
    estat: critiques.length > 0 ? 'bloquejat' : avisos.length > 0 ? 'revisar' : 'llest',
  };
}
