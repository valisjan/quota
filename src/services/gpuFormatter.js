import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  TIPUS_NO_LECTIUS, netejarText, senseAccents, normalitzar,
  codiBase, codiUnic, codiProfessorBase,
  codisClasse, grupsClasse, campsBuids, decimalUntis, liniaDif,
  parseGpu002, parseCsvLine, limitsJornada, obtenirProfessorsClasse, descarregarText, expandirClassePerGrups,
} from './untisUtils';
import { parseGestibXml, trobarMateriaGestib, trobarMateriaGestibAmbOverride } from './gestibMapper';
import { agruparClassesPerLlicoExport } from './lessonBuilder';
import { comptaPerGrupPerTipus } from '../utils/tipus';
import { guardesQueTocaFer } from '../utils/guardes';

function cc(cursId, nom) { return collection(db, 'cursos', cursId, nom); }

function codiProfessor(professorNom, professors, codisProfessors) {
  const professor = professors.find((p) => p.nom === professorNom);
  return (
    codisProfessors.get(professorNom) ||
    codiProfessorBase(professor?.codiUntis || professor?.codiGestib || professor?.codi || professorNom)
  );
}

function crearMapes(classes, professors) {
  const codisProfessors = new Map();
  const codisMateries = new Map();
  const codisProfUsats = new Set();
  const codisMatUsats = new Set();

  professors
    .map((p) => p.nom)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .forEach((nom) => {
      const professor = professors.find((p) => p.nom === nom);
      codisProfessors.set(
        nom,
        codiUnic(codiProfessorBase(professor?.codiUntis || professor?.codiGestib || professor?.codi || nom), codisProfUsats, 4)
      );
    });

  classes
    .map((c) => c.materia)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .forEach((materia) => {
      if (!codisMateries.has(materia)) {
        codisMateries.set(materia, codiUnic(codiBase(materia, 'MAT'), codisMatUsats));
      }
    });

  return { codisProfessors, codisMateries };
}

function esGuardiaPati(classe) {
  return netejarText(classe?.tipus).toUpperCase() === 'GP';
}

function codiUntisSegur(codi, fallback = 'MAT') {
  const text = (codi || '').toString().trim();
  if (text.startsWith('*')) return codiActivitatProvisional(text);

  const net = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|;~,\s]+/g, '')
    .toUpperCase()
    .trim();
  return net || codiBase(text, fallback);
}

function codiClasseUntisSegur(codi) {
  return (codi || '')
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|;~,\s]+/g, '');
}

function textUntisSegur(valor) {
  return netejarText(valor).replace(/[;~*|]+/g, '');
}

function codiActivitatProvisional(materia) {
  return codiBase(
    (materia || '')
      .toString()
      .replace(/^\*/, '')
      .replace(/>55/g, 'majors de 55')
      .replace(/\b[1-4]\s*ESO[A-Z]*\b/gi, '')
      .replace(/\b[12]\s*BAT[A-Z]*\b/gi, '')
      .replace(/\b[12]\s*B[A-Z]*\b/gi, '')
      .replace(/\s*-\s*[A-Z]\s*$/i, '')
      .trim(),
    'ACT'
  );
}

function nomActivitatProvisional(materia) {
  return textUntisSegur(
    (materia || '')
      .toString()
      .replace(/^\*/, '')
      .replace(/>55/g, 'majors de 55')
      .replace(/\b[1-4]\s*ESO[A-Z]*\b/gi, '')
      .replace(/\b[12]\s*BAT[A-Z]*\b/gi, '')
      .replace(/\b[12]\s*B[A-Z]*\b/gi, '')
      .replace(/\s*-\s*[A-Z]\s*$/i, '')
      .trim()
  ) || 'Activitat';
}

function classeComptaPerGrupUntis(classe) {
  if (!classe?.curs || !classe?.grup) return false;
  if ((classe.materia || '').toString().trim().startsWith('*')) return false;
  return comptaPerGrupPerTipus(classe.tipus);
}

function codiMateriaClasse(classe, materiaGestib, codisMateries) {
  const codi = materiaGestib?.codiUntis ||
    (esGuardiaPati(classe)
      ? 'GP'
      : (classe.materia || '').toString().trim().startsWith('*')
        ? codiActivitatProvisional(classe.materia)
        : codisMateries.get(classe.materia));
  return codiUntisSegur(codi || classe.materia, 'MAT');
}

function nomMateriaClasse(classe, materiaGestib) {
  if (materiaGestib) {
    return textUntisSegur(
      materiaGestib.cursDescripcio
        ? `${materiaGestib.descripcio} (${materiaGestib.cursDescripcio})`
        : materiaGestib.descripcio
    );
  }
  if ((classe.materia || '').toString().trim().startsWith('*')) {
    return nomActivitatProvisional(classe.materia);
  }
  return textUntisSegur(classe.materia);
}

const CAMPS_ABREVIATURA_UNTIS = {
  'GPU002.TXT': [4, 5, 6, 41],
  'GPU003.TXT': [0],
  'GPU004.TXT': [0],
  'GPU006.TXT': [0],
};

function abreviaturaUntisInvalida(valor) {
  const text = (valor || '').toString();
  return Boolean(text && (text !== text.trim() || /[;~*|\s]/.test(text)));
}

function validarAbreviaturesFitxer(fitxer) {
  const indexs = CAMPS_ABREVIATURA_UNTIS[fitxer.nom];
  if (!indexs || !fitxer.contingut) return [];

  return fitxer.contingut
    .split(/\r?\n/)
    .map((linia, index) => ({ linia, index }))
    .filter(({ linia }) => linia.trim())
    .flatMap(({ linia, index }) => {
      const camps = parseCsvLine(linia);
      const simbolsProhibits = camps
        .map((valor, camp) => ({ camp, valor }))
        .filter(({ valor }) => /[;~*|]/.test((valor || '').toString()));
      const abreviatures = indexs
        .map((camp) => ({ camp, valor: camps[camp] || '' }))
        .filter(({ valor }) => abreviaturaUntisInvalida(valor));
      return [...simbolsProhibits, ...abreviatures]
        .map(({ camp, valor }) => `${fitxer.nom}:${index + 1} camp ${camp + 1} (${valor})`);
    });
}

function validarFitxersUntis(fitxers) {
  const incidencies = fitxers.flatMap(validarAbreviaturesFitxer);
  if (!incidencies.length) return;
  throw new Error(`S'han detectat abreviatures no valides per a Untis: ${incidencies.slice(0, 5).join('; ')}`);
}

function crearClassesGuardiesPati(professors) {
  return professors
    .filter((professor) => Number(professor.gpAssignades || 0) > 0)
    .map((professor) => ({
      id: `gp-${professor.id || professor.nom}`,
      curs: '',
      grup: '',
      materia: 'Guàrdia de pati',
      hores: Number(professor.gpAssignades || 0),
      departament: professor.departament || '',
      departaments: professor.departament ? [professor.departament] : [],
      tipus: 'GP',
      professorAssignat: professor.nom,
      professors: [professor.nom],
      _generadaGuardiaPati: true,
    }));
}

function afegirGuardiesPatiCalculades(classes, professors) {
  return [
    ...classes.filter((classe) => !esGuardiaPati(classe)),
    ...crearClassesGuardiesPati(professors),
  ];
}

function crearClassesGuardiesPassadisIConvivencia(professors, rawClasses) {
  return professors
    .map((professor) => {
      const passadis = guardesQueTocaFer(professor, rawClasses);
      const gc = Math.max(0, Number(professor.gcAssignades || 0));
      const total = passadis + gc;
      if (total <= 0) return null;
      return {
        id: `guard-${professor.id || professor.nom}`,
        curs: '',
        grup: '',
        materia: '*Guà',
        hores: total,
        departament: professor.departament || '',
        departaments: professor.departament ? [professor.departament] : [],
        tipus: '',
        professorAssignat: professor.nom,
        professors: [professor.nom],
        _generadaGuardia: true,
      };
    })
    .filter(Boolean);
}

function codisMateriaPossibles(materia) {
  const text = senseAccents(materia).toUpperCase();
  const codis = new Set();

  const regles = [
    [/FISICA.*QUIMICA|QUIMICA.*FISICA/, 'FQ'],
    [/MATEM/, 'MAT'],
    [/CATAL/, 'LCT'],
    [/CASTELL/, 'LCS'],
    [/GEOGRAF|HISTORIA/, 'GH'],
    [/BIOLOG|GEOLOG/, 'BG'],
    [/EDUCACIO FISICA|ED FISICA/, 'EF'],
    [/MUSICA/, 'MUS'],
    [/PLAST|EPVA|VISUAL/, 'EPVA'],
    [/RELIG/, 'RC'],
    [/ATENCIO EDUCATIVA/, 'AE'],
    [/TUTORIA|\*TUTORIA/, 'TUT'],
    [/TECNOLOG.*DIGITAL|DIGITALITZACIO/, 'TID'],
    [/TECNOLOG/, 'TEC'],
    [/FILOSOF/, 'FIL'],
    [/ECONOM/, 'ECO'],
    [/LLATI/, 'LLAT'],
    [/GREC/, 'GREC'],
    [/PALIC/, 'PALIC'],
    [/GUARDIA.*PATI|VIGILANCIA.*PATI|VIGILANCIA.*ESPLAI/, 'GP'],
  ];

  regles.forEach(([regex, codi]) => {
    if (regex.test(text)) codis.add(codi);
  });

  const inicials = text
    .split(/[^A-Z0-9]+/)
    .filter((p) => p && !['DE', 'DEL', 'I', 'LA', 'EL', 'LES', 'ELS', 'A'].includes(p))
    .map((p) => p[0])
    .join('');
  if (inicials) codis.add(inicials);

  return [...codis];
}

function scoreReferencia(classe, ref) {
  if (esGuardiaPati(classe)) {
    const materiaRef = normalitzar(ref.materia);
    const textRef = normalitzar(`${ref.materia} ${ref.text}`);
    if (
      materiaRef === 'gp' ||
      textRef.includes('guardiadepati') ||
      textRef.includes('vigilanciapati') ||
      textRef.includes('vigilanciaesplai')
    ) {
      let score = 300;
      if (!ref.classe) score += 40;
      if (Number(ref.hores) === Number(classe.hores)) score += 15;
      return score;
    }
  }

  const codisClasseNorm = new Set(codisClasse(classe).map(normalitzar));
  const esNoGrup = codisClasseNorm.size === 0;
  if (esNoGrup) {
    if (ref.classe !== '') return -1;
    let score = 40;
    const materiaNorm = normalitzar(classe.materia);
    const refNorm = normalitzar(`${ref.materia} ${ref.text}`);
    if (materiaNorm && refNorm.includes(materiaNorm)) score += 120;
    if (Number(ref.hores) === Number(classe.hores)) score += 15;
    return score;
  }
  if (!codisClasseNorm.has(normalitzar(ref.classe))) return -1;

  const materiaNorm = normalitzar(classe.materia);
  const refNorm = normalitzar(`${ref.materia} ${ref.text}`);
  const codisMateria = codisMateriaPossibles(classe.materia);
  let score = 100;

  if (materiaNorm && refNorm.includes(materiaNorm)) score += 120;

  codisMateria.forEach((codi) => {
    const codiNorm = normalitzar(codi);
    const materiaCodiNorm = normalitzar(ref.materia);
    if (materiaCodiNorm === codiNorm) score += 90;
    if (materiaCodiNorm.startsWith(codiNorm)) score += 70;
    if (materiaCodiNorm.includes(codiNorm)) score += 40;
  });

  if (Number(ref.hores) === Number(classe.hores)) score += 15;
  if (!ref.professor) score += 5;

  return score;
}

function trobarReferencia(classe, referencies, usades) {
  const candidates = referencies
    .filter((ref) => !usades.has(ref.index))
    .map((ref) => ({ ref, score: scoreReferencia(classe, ref) }))
    .filter((item) => item.score >= 130)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.ref || null;
}

function generarClasses(classes) {
  const classesMap = new Map();

  classes.forEach((classe) => {
    codisClasse(classe).forEach((codi) => {
      if (!classesMap.has(codi)) {
        const grupPart = codi.includes('-') ? codi.slice(codi.lastIndexOf('-')) : '';
        classesMap.set(codi, {
          codi,
          nom: `${netejarText(classe.curs)}${grupPart}`.trim() || codi,
        });
      }
    });
  });

  return [...classesMap.values()]
    .sort((a, b) => a.codi.localeCompare(b.codi))
    .map((item) => {
      const camps = campsBuids(31);
      camps[0] = codiClasseUntisSegur(item.codi);
      camps[1] = textUntisSegur(item.nom || item.codi);
      return liniaDif(camps, new Set([6, 7, 8, 9, 10, 11, 13, 16, 17, 27]));
    })
    .join('\r\n');
}

function generarProfessors(professors, codisProfessors) {
  return professors
    .filter((p) => p.nom)
    .sort((a, b) => a.nom.localeCompare(b.nom))
    .map((professor) => {
      const camps = campsBuids(43);
      camps[0] = codiUntisSegur(codisProfessors.get(professor.nom), 'PROF');
      camps[1] = textUntisSegur(professor.nom);
      camps[14] = limitsJornada(professor);
      camps[16] = textUntisSegur(professor.departament || '');
      camps[22] = professor.major55 ? '>55' : '';
      camps[35] = textUntisSegur(professor.nom);
      return liniaDif(camps, new Set([7, 8, 9, 10, 11, 12, 13, 14, 15, 21, 27, 34, 37, 40]));
    })
    .join('\r\n');
}

function generarMateries(classes, codisMateries, referenciaGestib, overrides) {
  const materies = new Map();

  classes
    .filter((classe) => classe.materia)
    .flatMap(expandirClassePerGrups)
    .forEach((classe) => {
      const materiaGestib = trobarMateriaGestibAmbOverride(classe, referenciaGestib, overrides);
      const codi = codiMateriaClasse(classe, materiaGestib, codisMateries);
      const nom = nomMateriaClasse(classe, materiaGestib);
      if (codi && !materies.has(codi)) {
        materies.set(codi, { codi, nom });
      }
    });

  return [...materies.values()]
    .sort((a, b) => a.codi.localeCompare(b.codi))
    .map(({ nom, codi }) => {
      const camps = campsBuids(21);
      camps[0] = codi;
      camps[1] = textUntisSegur(nom);
      return liniaDif(camps, new Set([6, 7, 8, 9, 14, 17, 18]));
    })
    .join('\r\n');
}

function dadesCalendariGestib(referenciaGestib) {
  const any = Number(referenciaGestib?.any) || new Date().getFullYear();
  return {
    inici: `${any}0701`,
    fi: `${any + 1}0630`,
  };
}

function crearFilaGpu002({ numero, hores, grups, codiProfessors, codiMateria, tipus, classe, referenciaGestib }) {
  const camps = campsBuids(47);
  const horesNum = Number(hores) || 0;
  const calendari = dadesCalendariGestib(referenciaGestib);

  camps[0] = numero;
  camps[1] = horesNum;
  camps[2] = horesNum;
  camps[3] = horesNum;
  camps[4] = grups.filter(Boolean)[0] || '';
  camps[5] = codiProfessors.filter(Boolean)[0] || '';
  camps[6] = codiUntisSegur(codiMateria, 'MAT');
  camps[9] = 0;
  camps[10] = decimalUntis(horesNum);
  camps[12] = netejarText(tipus);
  camps[14] = calendari.inici;
  camps[15] = calendari.fi;
  camps[16] = decimalUntis(horesNum * 0.0053);
  camps[20] = [
    netejarText(classe.curs),
    netejarText(classe.grup),
    nomMateriaClasse(classe, null),
  ].filter(Boolean).join(' ');
  camps[23] = 'n';
  camps[33] = 0;
  camps[34] = 0;
  camps[39] = Math.round(horesNum * 100000);
  camps[40] = decimalUntis(horesNum);
  camps[41] = codiUntisSegur(`${camps[6]}_${camps[4] || 'ACT'}_${camps[5] || 'PROF'}_${numero}`, 'ID');
  camps.forEach((valor, index) => {
    if (typeof valor === 'string' && ![4, 5, 6, 41].includes(index)) {
      camps[index] = textUntisSegur(valor);
    }
  });
  camps[45] = 0;

  return camps;
}

function componentsExportables(components) {
  const vistos = new Set();
  return components
    .flatMap((component) => {
      const grups = (component.codiGrups || '')
        .split(',')
        .map((grup) => grup.trim())
        .filter(Boolean);
      return (grups.length ? grups : ['']).map((grup) => ({
        ...component,
        codiGrups: grup,
      }));
    })
    .filter((component) => {
      const clau = [
        component.codiGrups || '',
        component.codiProfessor || '',
        component.codiMateria || '',
        component.aula || '',
      ].join('|');
      if (vistos.has(clau)) return false;
      vistos.add(clau);
      return true;
    });
}

function prepararCampsLlico({ referencia, numLlico, classe, component, hores, tipus, referenciaGestib, flags }) {
  const camps = referencia?.camps
    ? [...referencia.camps]
    : crearFilaGpu002({
        numero: numLlico,
        hores,
        grups: [component.codiGrups || ''],
        codiProfessors: [component.codiProfessor],
        codiMateria: component.codiMateria,
        tipus,
        classe,
        referenciaGestib,
      });

  const horesNum = Number(hores) || 0;
  camps[0] = numLlico;
  camps[1] = horesNum;
  camps[2] = flags.comptaGrup ? horesNum : '';
  camps[3] = flags.comptaProfessor ? horesNum : 0;
  camps[4] = component.codiGrups || '';
  camps[5] = component.codiProfessor;
  camps[6] = codiUntisSegur(component.codiMateria, 'MAT');
  camps[7] = textUntisSegur(component.aula || camps[7] || '');
  camps[12] = netejarText(tipus);
  camps[20] = [
    netejarText(classe.curs),
    netejarText(component.grup || classe.grup),
    nomMateriaClasse({ ...classe, materia: component.materia || classe.materia }, null),
  ].filter(Boolean).join(' ');
  camps[41] = codiUntisSegur(`${camps[6]}_${component.codiGrups || 'ACT'}_${component.codiProfessor}_${numLlico}`, 'ID');
  camps.forEach((valor, index) => {
    if (typeof valor === 'string' && ![4, 5, 6, 41].includes(index)) {
      camps[index] = textUntisSegur(valor);
    }
  });

  return camps;
}

function codisMateriaLlico(classe, codisMateries, referenciaGestib, referencia, pendents) {
  if (referencia?.materia) return [referencia.materia];

  const materies = classe._materiesAgrupades || [classe];
  const codis = materies
    .map((item) => {
      const materiaGestib = trobarMateriaGestib(item, referenciaGestib);
      if (referenciaGestib && !materiaGestib) {
        pendents.push({
          motiu: "Matèria no trobada a l'XML GestIB; exportada amb codi provisional",
          classe: item,
        });
      }
      return materiaGestib?.codiUntis || codisMateries.get(item.materia);
    })
    .filter(Boolean);

  return [...new Set(codis)];
}

function componentsLlico(classe, professors, codisProfessors, codisMateries, referenciaGestib, pendents, overrides) {
  const files = classe._filesAgrupades || [classe];
  const components = [];

  files.forEach((fila) => {
    const materiaGestib = trobarMateriaGestibAmbOverride(fila, referenciaGestib, overrides);
    if (referenciaGestib && !materiaGestib) {
      pendents.push({
        motiu: "Matèria no trobada a l'XML GestIB; exportada amb codi provisional",
        classe: fila,
      });
    }

    const codiMateria = codiMateriaClasse(fila, materiaGestib, codisMateries);
    const grupOriginal = classe._preservaGrupsOriginals ? fila.grup : classe.grup;
    const comptaGrup = classeComptaPerGrupUntis({ ...fila, grup: grupOriginal });
    const codiGrups = comptaGrup ? codisClasse({ ...fila, grup: grupOriginal }).join(',') : '';
    const teGrupDefinit = comptaGrup;

    obtenirProfessorsClasse(fila).forEach((nomProfessor) => {
      const codiProf = codiProfessor(nomProfessor, professors, codisProfessors);
      if (!codiProf || !codiMateria || (teGrupDefinit && !codiGrups)) return;
      components.push({
        professor: nomProfessor,
        codiProfessor: codiProf,
        materia: fila.materia,
        codiMateria,
        grup: grupOriginal,
        codiGrups,
        aula: fila.aula || fila.aulaPropria || fila.aulaEspecifica || '',
        fila,
      });
    });
  });

  return components;
}

function generarLlicons(classes, professors, codisProfessors, codisMateries, referenciesGpu002 = [], referenciaGestib = null, overrides = null) {
  const pendents = [];
  const usades = new Set();
  const vistaPrevia = [];
  let numero = 1;

  const linies = agruparClassesPerLlicoExport(
    classes.filter((classe) =>
      Number(classe.hores) > 0 &&
      classe.materia &&
      !TIPUS_NO_LECTIUS.has(netejarText(classe.tipus).toUpperCase())
    )
  )
    .flatMap((classe) => {
      const tipus = netejarText(classe.tipus).toUpperCase();
      const professorsClasse = obtenirProfessorsClasse(classe);

      if (TIPUS_NO_LECTIUS.has(tipus)) {
        pendents.push({ motiu: `No lectiu (${tipus})`, classe });
        return [];
      }

      if (!professorsClasse.length) {
        pendents.push({ motiu: 'Sense professor assignat', classe });
        return [];
      }

      const referencia = referenciesGpu002.length
        ? trobarReferencia(classe, referenciesGpu002, usades)
        : null;

      if (referenciesGpu002.length && !referencia) {
        pendents.push({ motiu: 'No trobada al GPU002 de referència', classe });
        return [];
      }

      if (referencia) usades.add(referencia.index);

      const components = componentsLlico(
        classe, professors, codisProfessors, codisMateries, referenciaGestib, pendents, overrides
      );

      if (!components.length) {
        pendents.push({ motiu: 'Sense professor, materia o grup exportable', classe });
        return [];
      }

      const componentsUnics = componentsExportables(components);
      const grups = [...new Set(componentsUnics.map((c) => c.codiGrups))];
      const numLlico = referencia?.num || numero++;
      const NUMERICS_LLICO = new Set([0, 1, 2, 3, 9, 10, 13, 16, 18, 27, 28, 29, 30, 33, 34, 39, 40, 43, 45]);
      const hores = Number(classe.hores) || 0;

      const filesAgrupades = (classe._filesAgrupades || [classe]).map((fila) => ({
        curs: fila.curs || '',
        grup: fila.grup || '',
        materia: fila.materia || '',
        hores: Number(fila.hores) || 0,
        tipus: fila.tipus || '',
        professor: fila.professorAssignat || fila.professors?.[0] || '',
      }));

      const primerGrup = new Set();
      const primerProfessor = new Set();
      const liniesComponents = componentsUnics.map((component) => {
        const clauProfessor = `${component.codiProfessor}|${component.codiMateria}`;
        const flags = {
          comptaGrup: Boolean(component.codiGrups) && !primerGrup.has(component.codiGrups),
          comptaProfessor: !primerProfessor.has(clauProfessor),
        };
        if (component.codiGrups) primerGrup.add(component.codiGrups);
        primerProfessor.add(clauProfessor);

        const camps = prepararCampsLlico({
          referencia,
          numLlico,
          classe,
          component,
          hores,
          tipus,
          referenciaGestib,
          flags,
        });
        return liniaDif(camps, NUMERICS_LLICO);
      });

      vistaPrevia.push({
        numero: numLlico,
        curs: classe.curs || '',
        grup: classe.grup || '',
        materia: classe.materia || '',
        hores,
        tipus: netejarText(classe.tipus),
        professors: [...new Set(componentsUnics.map((c) => c.professor))],
        codisProfessors: [...new Set(componentsUnics.map((c) => c.codiProfessor))],
        codiMateria: [...new Set(componentsUnics.map((c) => c.codiMateria))].join(', '),
        codiGrups: grups.join('+'),
        font: referencia ? 'referencia' : 'generat',
        esActivitat: !classe.curs && !classe.grup,
        filesAgrupades,
      });

      return liniesComponents;
    });

  return {
    text: linies.join('\r\n'),
    pendents,
    vistaPrevia: ordenarVistaPrevia(vistaPrevia),
  };
}

function ordenarVistaPrevia(llista) {
  return [...llista].sort((a, b) => {
    const grup = (a.codiGrups || '').localeCompare(b.codiGrups || '');
    if (grup) return grup;
    const materia = (a.materia || '').localeCompare(b.materia || '');
    if (materia) return materia;
    return Number(a.numero) - Number(b.numero);
  });
}

function generarRevisio(pendents, totals) {
  const linies = [
    'Exportacio Untis',
    `Generat: ${new Date().toLocaleString('ca-ES')}`,
    '',
    `Professors: ${totals.professors}`,
    `Classes/grups: ${totals.classes}`,
    `Matèries: ${totals.materies}`,
    `Lliçons exportades: ${totals.llicons}`,
    `Files pendents de revisar: ${pendents.length}`,
    '',
    'Pendents:',
  ];

  if (!pendents.length) {
    linies.push('Cap incidencia detectada.');
  } else {
    pendents.forEach(({ motiu, classe }) => {
      linies.push(
        `- ${motiu}: ${[
          classe.curs,
          classe.grup,
          classe.materia,
          classe.hores ? `${classe.hores}h` : '',
          classe.professorAssignat || '',
        ].filter(Boolean).join(' | ')}`
      );
    });
  }

  return linies.join('\r\n');
}

function professorsPerSimulacio(professors, referenciaGestib) {
  if (referenciaGestib?.places?.length) {
    return referenciaGestib.places
      .map((placa) => placa.curta)
      .filter(Boolean)
      .map((codi) => ({ nom: codi, codiUntis: codiProfessorBase(codi) }));
  }

  return professors
    .filter((p) => p.nom)
    .map((p) => ({
      nom: p.nom,
      codiUntis: codiProfessorBase(p.codiUntis || p.codiGestib || p.codi || p.nom),
    }));
}

function hashText(text) {
  return [...(text || '').toString()].reduce(
    (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0,
    0
  );
}

function simularAssignacions(classes, professorsSimulacio) {
  const disponibles = professorsSimulacio.map((p) => p.nom).filter(Boolean);

  return classes.map((classe) => {
    if (TIPUS_NO_LECTIUS.has((classe.tipus || '').toUpperCase())) return classe;
    if (!disponibles.length) return classe;
    const clau = [
      classe.id,
      classe.curs,
      classe.grup,
      classe.materia,
      classe.tipus,
    ].map((part) => normalitzar(part || '')).join('|');
    const index = hashText(clau) % disponibles.length;
    const professorAssignat = disponibles[index] || '';
    return {
      ...classe,
      professorAssignat,
      professors: professorAssignat ? [professorAssignat] : [],
      _simulat: true,
    };
  });
}

export async function prepararExportUntis(cursId, { referenciaGpu002Text = '', referenciaGestibXmlText = '', simular = false, overrides = null } = {}) {
  const [snapClasses, snapProfessors] = await Promise.all([
    getDocs(cc(cursId, 'classes')),
    getDocs(cc(cursId, 'professors')),
  ]);

  const referenciaGestib = referenciaGestibXmlText ? parseGestibXml(referenciaGestibXmlText) : null;
  let professors = snapProfessors.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rawClasses = snapClasses.docs.map((d) => ({ id: d.id, ...d.data() }));
  let classes = [
    ...afegirGuardiesPatiCalculades(rawClasses, professors),
    ...crearClassesGuardiesPassadisIConvivencia(professors, rawClasses),
  ];
  const professorsSimulacio = simular ? professorsPerSimulacio(professors, referenciaGestib) : [];
  if (simular) {
    professors = professorsSimulacio;
    classes = simularAssignacions(classes, professorsSimulacio);
  }
  const { codisProfessors, codisMateries } = crearMapes(classes, professors);
  const classesText = generarClasses(classes);
  const professorsText = generarProfessors(professors, codisProfessors);
  const materiesText = generarMateries(classes, codisMateries, referenciaGestib, overrides);
  const referenciesGpu002 = referenciaGpu002Text ? parseGpu002(referenciaGpu002Text) : [];
  const llicons = generarLlicons(classes, professors, codisProfessors, codisMateries, referenciesGpu002, referenciaGestib, overrides);
  const totals = {
    professors: professors.length,
    classes: classesText ? classesText.split('\r\n').length : 0,
    materies: materiesText ? materiesText.split('\r\n').length : 0,
    llicons: llicons.text ? llicons.text.split('\r\n').length : 0,
    simulades: simular ? classes.filter((classe) => classe._simulat).length : 0,
  };
  const fitxers = [
    { nom: 'GPU003.TXT', descripcio: 'Classes / grups', contingut: classesText },
    { nom: 'GPU004.TXT', descripcio: 'Professors', contingut: professorsText },
    { nom: 'GPU006.TXT', descripcio: 'Materies', contingut: materiesText },
    { nom: 'GPU002.TXT', descripcio: 'Llicons amb professor i grup', contingut: llicons.text },
    {
      nom: 'GPU000_REVISIO_EXPORTACIO.TXT',
      descripcio: 'Incidencies i files no exportades com a llicons',
      contingut: generarRevisio(llicons.pendents, totals),
    },
  ];
  validarFitxersUntis(fitxers);

  return {
    totals,
    referenciaGestibStats: referenciaGestib
      ? {
          centre: referenciaGestib.centre,
          any: referenciaGestib.any,
          cursos: referenciaGestib.cursos.length,
          places: referenciaGestib.places.length,
          materies: referenciaGestib.materies.length,
          activitats: referenciaGestib.activitats.length,
          aules: referenciaGestib.aules.length,
        }
      : null,
    pendents: llicons.pendents,
    vistaPrevia: llicons.vistaPrevia,
    fitxersOriginals: [
      { nom: 'GPU003.TXT', descripcio: 'Classes / grups', contingut: classesText },
      { nom: 'GPU004.TXT', descripcio: 'Professors', contingut: professorsText },
      { nom: 'GPU006.TXT', descripcio: 'Matèries', contingut: materiesText },
      { nom: 'GPU002.TXT', descripcio: 'Lliçons amb professor i grup', contingut: llicons.text },
      {
        nom: 'GPU000_REVISIO_EXPORTACIO.TXT',
        descripcio: 'Incidències i files no exportades com a lliçons',
        contingut: generarRevisio(llicons.pendents, totals),
      },
    ],
    fitxersOriginals: undefined,
    fitxers,
  };
}

export async function compararAmbGpu002(cursId, gpu002Text) {
  const [snapClasses, snapProfessors] = await Promise.all([
    getDocs(cc(cursId, 'classes')),
    getDocs(cc(cursId, 'professors')),
  ]);

  const classes = snapClasses.docs.map((d) => ({ id: d.id, ...d.data() }));
  const professors = snapProfessors.docs.map((d) => ({ id: d.id, ...d.data() }));
  const { codisProfessors, codisMateries } = crearMapes(classes, professors);

  const nomPerCodiProf = new Map([...codisProfessors.entries()].map(([nom, codi]) => [codi, nom]));

  const classesPerCodi = new Map();
  classes.forEach((classe) => {
    codisClasse(classe).forEach((codi) => {
      if (!classesPerCodi.has(codi)) classesPerCodi.set(codi, []);
      classesPerCodi.get(codi).push(classe);
    });
  });

  const entrades = parseGpu002(gpu002Text);
  const classesUsades = new Set();

  const resultEntrades = entrades.map((entrada) => {
    const { classe: classeGpu, professor: profGpu, materia: materiaGpu, hores: horesGpu } = entrada;
    const appClasses = classesPerCodi.get(classeGpu) || [];
    const millor = appClasses.find((c) => codisMateries.get(c.materia) === materiaGpu) || appClasses[0] || null;

    const profNomGpu = profGpu ? (nomPerCodiProf.get(profGpu) || profGpu) : '';
    const profNomApp = millor?.professorAssignat || '';
    const profCodeApp = profNomApp ? (codisProfessors.get(profNomApp) || '') : '';

    let estat;
    if (!millor) estat = 'noTrobat';
    else if (!profGpu && !profNomApp) estat = 'ok';
    else if (!profGpu) estat = 'senseProfGpu';
    else if (!profNomApp) estat = 'senseProfApp';
    else if (profGpu !== profCodeApp) estat = 'diferentProf';
    else if (Number(horesGpu) !== Number(millor.hores || 0)) estat = 'diferentHores';
    else estat = 'ok';

    if (millor) classesUsades.add(millor.id);

    return {
      num: entrada.num,
      classeGpu,
      materiaGpu,
      profGpu,
      profNomGpu,
      horesGpu,
      classeApp: millor
        ? { id: millor.id, curs: millor.curs, grup: millor.grup, materia: millor.materia, hores: millor.hores, professorAssignat: millor.professorAssignat }
        : null,
      profCodeApp,
      profNomApp,
      estat,
    };
  });

  const senseEntrada = classes.filter(
    (c) =>
      !classesUsades.has(c.id) &&
      !TIPUS_NO_LECTIUS.has((c.tipus || '').toUpperCase()) &&
      Number(c.hores) > 0 &&
      c.materia &&
      c.curs &&
      c.grup &&
      (c.professorAssignat || c.professors?.length)
  );

  const resum = {
    total: resultEntrades.length,
    ok: resultEntrades.filter((e) => e.estat === 'ok').length,
    diferentProf: resultEntrades.filter((e) => e.estat === 'diferentProf').length,
    diferentHores: resultEntrades.filter((e) => e.estat === 'diferentHores').length,
    noTrobat: resultEntrades.filter((e) => e.estat === 'noTrobat').length,
    senseProfGpu: resultEntrades.filter((e) => e.estat === 'senseProfGpu').length,
    senseProfApp: resultEntrades.filter((e) => e.estat === 'senseProfApp').length,
    senseEntrada: senseEntrada.length,
  };

  return { entrades: resultEntrades, senseEntrada, resum };
}

export function descarregarFitxerUntis(fitxer) {
  descarregarText(fitxer.nom, fitxer.contingut);
}

export function descarregarTotsElsFitxersUntis(fitxers) {
  fitxers.forEach((fitxer, index) => {
    window.setTimeout(() => descarregarFitxerUntis(fitxer), index * 250);
  });
}
