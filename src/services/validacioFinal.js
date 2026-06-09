import {
  classeAssignadaA,
  horesComputablesClasse,
  limitsHoresProfessor,
  textJornada,
} from '../utils/horesProfessor';
import { classeCompletamentAssignada } from '../utils/assignacions';
import {
  esCoordinacio,
  esGP,
  esOptativaCompartida,
  esPALIC,
  esTipusConegut,
  normalitzarTipus,
} from '../utils/tipus';
import { calcularTotalHoresGrup, comptaPerGrup, expandirGrups, teGrup } from '../utils/grups';
import {
  clauCursGrupTutoria,
  esTutoriaAsterisc,
  esTutoriaPrincipal,
  trobarTutoriaAsterisc,
} from '../utils/tutories';

function normalitzarText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function esCapDepartament(classe) {
  const materia = normalitzarText(classe.materia);
  return materia.includes('cap') && materia.includes('departament');
}

function teDepartament(classe) {
  return Boolean((classe.departament || '').toString().trim() || classe.departaments?.[0]);
}

function detallClasse(classe) {
  return [
    classe.departament || classe.departaments?.[0],
    classe.curs,
    classe.grup,
    classe.materia,
    classe.hores ? `${classe.hores}h` : '',
    classe.tipus ? `Tipus ${classe.tipus}` : '',
  ].filter(Boolean).join(' · ');
}

function itemClasse(prefix, classe, title, detail, context = detallClasse(classe)) {
  return {
    key: `${prefix}-${classe.id}`,
    title,
    detail,
    context,
  };
}

function motiuDadaProblematica(classe) {
  const tipus = normalitzarTipus(classe.tipus);
  if (!classe.materia) return 'Falta matèria.';
  if (Number(classe.hores) <= 0) return 'Hores buides o zero.';
  if (!teDepartament(classe)) return 'Falta departament.';
  if (tipus && !esTipusConegut(tipus)) return `Tipus no classificat: ${classe.tipus}.`;
  return 'Cal revisar la fila.';
}

export function calcularValidacioFinal({ classes = [], professors = [], departaments = [] }) {
  const classesSenseAssignar = classes
    .filter((classe) => {
      if (esGP(classe.tipus) && !classeCompletamentAssignada(classe)) return false;
      if (esPALIC(classe.tipus) && !classeCompletamentAssignada(classe)) return false;
      return Number(classe.hores) > 0 && !classeCompletamentAssignada(classe);
    })
    .map((classe) =>
      itemClasse(
        'sense',
        classe,
        classe.materia || 'Matèria sense nom',
        'No té cap professor assignat.'
      )
    );

  const classesExpandides = classes.flatMap((classe) => expandirGrups(classe));
  const perGrup = new Map();
  classesExpandides.forEach((classe) => {
    if (!teGrup(classe)) return;
    const key = `${classe.curs}|${classe.grup}`;
    if (!perGrup.has(key)) perGrup.set(key, []);
    perGrup.get(key).push(classe);
  });

  const grupsIncomplets = [...perGrup.entries()]
    .map(([key, llista]) => {
      const [curs, grup] = key.split('|');
      const total = calcularTotalHoresGrup(llista);
      const assignades = calcularTotalHoresGrup(llista, true);
      const pendents = llista.filter((classe) => comptaPerGrup(classe) && !classeCompletamentAssignada(classe));
      return { curs, grup, total, assignades, pendents };
    })
    .filter((item) => item.total > 0 && item.pendents.length > 0)
    .map((item) => ({
      key: `grup-${item.curs}-${item.grup}`,
      title: `${item.curs} ${item.grup}`,
      detail: `${item.assignades}h assignades de ${item.total}h. Pendents: ${item.pendents.map((c) => c.materia).join(', ')}`,
      context: `${item.pendents.length} files sense professor`,
    }));

  const incidenciesProfessorat = professors
    .map((professor) => {
      const horesLectives = classes
        .filter((classe) => classeAssignadaA(classe, professor.nom) && !esGP(classe.tipus))
        .reduce((total, classe) => total + horesComputablesClasse(classe), 0);
      const gp = Number(professor.gpAssignades || 0);
      const limits = limitsHoresProfessor(professor);
      let tipus = '';
      if (horesLectives < limits.ideal) tipus = 'baix';
      if (horesLectives > limits.maxim) tipus = 'alt';
      return { professor, horesLectives, gp, limits, tipus };
    })
    .filter((item) => item.tipus)
    .map((item) => ({
      key: `prof-${item.professor.id || item.professor.nom}`,
      title: item.professor.nom,
      detail:
        item.tipus === 'baix'
          ? `Té ${item.horesLectives}h lectives i l'objectiu de ${textJornada(item.professor)} és ${item.limits.ideal}h.`
          : `Té ${item.horesLectives}h lectives i el màxim de ${textJornada(item.professor)} és ${item.limits.maxim}h.`,
      context: item.gp ? `GP: ${item.gp}h` : item.professor.departament || '',
      tipus: item.tipus,
    }));

  const coordinacionsSenseCoordinador = classes
    .filter((classe) => esCoordinacio(classe.tipus) && !classeCompletamentAssignada(classe))
    .map((classe) =>
      itemClasse(
        'coord',
        classe,
        classe.materia || 'Coordinació sense nom',
        'La comissió o coordinació no té coordinador.',
        `${classe.hores || 0}h`
      )
    );

  const tutoriesSenseTutor = classes
    .filter((classe) => esTutoriaPrincipal(classe) && !classeCompletamentAssignada(classe))
    .map((classe) =>
      itemClasse(
        'tut',
        classe,
        classe.materia || 'Tutoria',
        'La tutoria del grup no té tutor assignat.',
        `${classe.curs || ''} ${classe.grup || ''}`.trim() || 'Sense grup'
      )
    );

  const tutoriesSenseAsterisc = classes
    .filter((classe) => esTutoriaPrincipal(classe) && !trobarTutoriaAsterisc(classe, classes))
    .map((classe) =>
      itemClasse(
        'tut-asterisc-falta',
        classe,
        classe.materia || 'Tutoria',
        "No s'ha trobat la seva *Tutoria associada.",
        `${classe.curs || ''} ${classe.grup || ''}`.trim() || 'Sense grup'
      )
    );

  const tutoriesAsteriscSensePrincipal = classes
    .filter((classe) => {
      if (!esTutoriaAsterisc(classe)) return false;
      const clau = clauCursGrupTutoria(classe);
      return !classes.some((item) => item.id !== classe.id && esTutoriaPrincipal(item) && clauCursGrupTutoria(item) === clau);
    })
    .map((classe) =>
      itemClasse(
        'tut-principal-falta',
        classe,
        classe.materia || '*Tutoria',
        "No s'ha trobat la tutoria lectiva associada.",
        `${classe.curs || ''} ${classe.grup || ''}`.trim() || 'Sense grup'
      )
    );

  const tutoriesAsteriscDiferents = classes
    .filter((classe) => {
      if (!esTutoriaPrincipal(classe)) return false;
      const asterisc = trobarTutoriaAsterisc(classe, classes);
      if (!asterisc || !classeCompletamentAssignada(classe) || !classeCompletamentAssignada(asterisc)) return false;
      return (classe.professorAssignat || '') !== (asterisc.professorAssignat || '');
    })
    .map((classe) => {
      const asterisc = trobarTutoriaAsterisc(classe, classes);
      return itemClasse(
        'tut-prof-diferent',
        classe,
        classe.materia || 'Tutoria',
        `La tutoria i la *Tutoria tenen professors diferents: ${classe.professorAssignat || 'sense tutor'} / ${asterisc.professorAssignat || 'sense tutor'}.`,
        `${classe.curs || ''} ${classe.grup || ''}`.trim() || 'Sense grup'
      );
    });

  const optativesCompartidesIncompletes = classes
    .filter((classe) => esOptativaCompartida(classe.tipus) && !classeCompletamentAssignada(classe))
    .map((classe) =>
      itemClasse(
        'opt-t',
        classe,
        classe.materia || 'Optativa compartida',
        'Les optatives de tipus T necessiten dos professors.',
        detallClasse(classe)
      )
    );

  const capsSenseAssignar = classes
    .filter((classe) => esCapDepartament(classe) && !classeCompletamentAssignada(classe))
    .map((classe) =>
      itemClasse(
        'cap',
        classe,
        classe.departament || classe.departaments?.[0] || classe.materia,
        'El cap de departament no té professor assignat.',
        `${classe.hores || 0}h`
      )
    );

  const departamentsSenseTancar = departaments
    .filter((departament) => !departament.tancat)
    .map((departament) => ({
      key: `dept-obert-${departament.id || departament.nom}`,
      title: departament.nom || 'Departament sense nom',
      detail: 'El departament no ha tancat la distribució.',
      context: 'No tancat',
    }));

  const dadesProblematiques = classes
    .filter((classe) => {
      const tipus = normalitzarTipus(classe.tipus);
      if (!classe.materia || Number(classe.hores) <= 0 || !teDepartament(classe)) return true;
      if (tipus && !esTipusConegut(tipus)) return true;
      return false;
    })
    .map((classe) =>
      itemClasse('dada', classe, classe.materia || 'Fila sense matèria', motiuDadaProblematica(classe))
    );

  const critiques = [
    ...classesSenseAssignar,
    ...grupsIncomplets,
    ...coordinacionsSenseCoordinador,
    ...tutoriesSenseTutor,
    ...optativesCompartidesIncompletes,
    ...capsSenseAssignar,
  ];

  const avisosOrganitzacio = [
    ...tutoriesSenseAsterisc,
    ...tutoriesAsteriscSensePrincipal,
    ...tutoriesAsteriscDiferents,
    ...departamentsSenseTancar,
  ];

  const avisosProfessorat = incidenciesProfessorat.filter((item) => item.tipus === 'baix');
  const critiquesProfessorat = incidenciesProfessorat.filter((item) => item.tipus === 'alt');

  return {
    critiques,
    avisosOrganitzacio,
    avisosProfessorat,
    critiquesProfessorat,
    dadesProblematiques,
    incidenciesProfessorat,
    classesSenseAssignar,
  };
}
