import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  TIPUS_NO_LECTIUS, netejarText, senseAccents, normalitzar,
  codiBase, codiUnic, codiProfessorBase, codiProfessorExport, incidenciesCodisProfessorGestib,
  codisClasse, codisCurs, grupsClasse, campsBuids, decimalUntis, liniaDif,
  parseGpu002, parseCsvLine, limitsJornada, obtenirProfessorsClasse, descarregarText, expandirClassePerGrups,
  compararAbreviaturaUntis, dividirCodisGrupUntis, prepararComponentsGpu002,
} from './untisUtils';
import { parseGestibXml, trobarMateriaGestib, trobarMateriaGestibAmbOverride } from './gestibMapper';
import { agruparClassesPerLlicoExport } from './lessonBuilder';
import { comptaPerGrupPerTipus, esDesdoblamentDivisible, esSuportDivisible } from '../utils/tipus';
import { guardesQueTocaFer } from '../utils/guardes';
import { crearClassesDesdoblamentDivisible, crearClassesSuportDivisible } from '../utils/suportDivisible';

function cc(cursId, nom) { return collection(db, 'cursos', cursId, nom); }

function codiProfessor(professorNom, professors, codisProfessors) {
  const professor = professors.find((p) => p.nom === professorNom);
  return (
    codisProfessors.get(professorNom) ||
    codiProfessorExport(professor || { nom: professorNom })
  );
}

function crearMapes(classes, professors, referenciaGestib = null) {
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
        codiUnic(codiProfessorExport(professor || { nom }, referenciaGestib?.places || []), codisProfUsats, 4)
      );
    });

  classes
    .flatMap(filesExportClasse)
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

function filesExportClasse(classe = {}) {
  const files = classe._filesAgrupades || [classe];
  return files.flatMap((fila) => {
    if (!Array.isArray(fila.subclasses) || !fila.subclasses.length) return [fila];
    return fila.subclasses.map((subclasse) => ({
      ...fila,
      ...subclasse,
      hores: Number(subclasse.hores) || Number(fila.hores) || 0,
      tipus: subclasse.tipus ?? fila.tipus,
      departament: subclasse.departament ?? fila.departament,
      departaments: subclasse.departaments ?? fila.departaments,
      professors: fila.professors || [],
      professorAssignat: fila.professorAssignat || '',
      participants: fila.participants || [],
      _subclasseMulticurs: true,
      _classePareMulticurs: fila,
    }));
  });
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
  const tipus = netejarText(classe.tipus).toUpperCase();
  return tipus === 'CD' || comptaPerGrupPerTipus(tipus);
}

function classeTeGrupExportable(classe) {
  if (!classe?.curs || !classe?.grup) return false;
  if ((classe.materia || '').toString().trim().startsWith('*')) return false;
  return codisClasse(classe).length > 0;
}

function codiMateriaClasse(classe, materiaGestib, codisMateries) {
  if (classe?._descripcioSenseMateria) return '';
  const codi =
    classe?._generadaGuardia
      ? 'G'
      : esGuardiaPati(classe)
        ? 'GP'
        : materiaGestib?.codiUntis ||
          ((classe.materia || '').toString().trim().startsWith('*')
            ? codiActivitatProvisional(classe.materia)
            : codisMateries.get(classe.materia));
  return codiUntisSegur(codi || classe.materia, 'MAT');
}

function nomMateriaClasse(classe, materiaGestib) {
  if (classe?._descripcioSenseMateria) return classe._descripcioUntis || classe.materia || 'Activitat';
  if (classe?._generadaGuardia) return 'Professor de guàrdia';
  if (esGuardiaPati(classe)) return 'Guàrdia de pati';
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
  return Boolean(text && (text !== text.trim() || /[;,~*|\s]/.test(text)));
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

function crearClassesGuardiesNormals(professors, rawClasses) {
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
        materia: 'Professor de guàrdia',
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

function esCapDepartamentClasse(classe) {
  const materia = normalitzar(classe?.materia || '');
  return materia.includes('cap') && materia.includes('departament');
}

function departamentClasseCap(classe, professorsPerNom) {
  const professor = obtenirProfessorsClasse(classe)[0];
  return (
    classe.departament ||
    classe.departaments?.[0] ||
    professorsPerNom.get(professor)?.departament ||
    ''
  ).toString().trim();
}

function esDepartamentEconomia(departament) {
  return normalitzar(departament).includes('economia');
}

function comptarProfessorsPerDepartament(professors) {
  const perDepartament = new Map();
  professors.forEach((professor) => {
    const departament = (professor.departament || '').toString().trim();
    if (!departament) return;
    const clau = normalitzar(departament);
    if (!clau) return;
    perDepartament.set(clau, (perDepartament.get(clau) || 0) + 1);
  });
  return perDepartament;
}

function trobarActivitatCcp(referenciaGestib) {
  return referenciaGestib?.activitats?.find((activitat) => {
    const text = normalitzar([
      activitat.etiqueta,
      activitat.curta,
      activitat.descripcio,
    ].filter(Boolean).join(' '));
    return text.includes('ccp') && text.includes('assistencia');
  }) || null;
}

function prepararCcpCapsDepartament(rawClasses, professors, referenciaGestib) {
  const professorsPerNom = new Map(professors.map((professor) => [professor.nom, professor]));
  const membresPerDepartament = comptarProfessorsPerDepartament(professors);
  const caps = rawClasses
    .filter(esCapDepartamentClasse)
    .map((classe) => {
      const professor = obtenirProfessorsClasse(classe)[0] || '';
      const departament = departamentClasseCap(classe, professorsPerNom);
      const membres = membresPerDepartament.get(normalitzar(departament)) || 0;
      const horesOriginals = Number(classe.hores) || 0;
      const elegible = Boolean(
        professor &&
        departament &&
        membres >= 2 &&
        !esDepartamentEconomia(departament) &&
        horesOriginals >= 2
      );
      const horesCcp = elegible ? Math.min(1, horesOriginals) : 0;
      return {
        classeId: classe.id || '',
        departament,
        professor,
        membres,
        horesOriginals,
        horesCcp,
        horesCapExport: Math.max(0, horesOriginals - horesCcp),
        elegible,
        motiu: !professor
          ? 'sense professor'
          : !departament
            ? 'sense departament'
            : membres < 2
              ? 'departament amb menys de 2 membres'
              : esDepartamentEconomia(departament)
                ? 'Economia exclòs'
                : horesOriginals < 2
                  ? '1h: tota a cap de departament'
                  : '',
      };
    });

  const capsAmbCcp = caps.filter((cap) => cap.elegible && cap.horesCcp > 0);
  const horesCapPerClasse = new Map(caps.map((cap) => [cap.classeId, cap.horesCapExport]));
  const classes = rawClasses.map((classe) => {
    if (!esCapDepartamentClasse(classe) || !horesCapPerClasse.has(classe.id || '')) return classe;
    return {
      ...classe,
      hores: horesCapPerClasse.get(classe.id || ''),
      _horesCapDepartamentOriginals: Number(classe.hores) || 0,
      _horesCcpDescomptades: (Number(classe.hores) || 0) - horesCapPerClasse.get(classe.id || ''),
    };
  });

  const activitat = trobarActivitatCcp(referenciaGestib);
  const descripcio = activitat?.curta || activitat?.etiqueta || activitat?.descripcio || '*Assistència a CCP';
  const classeCcp = capsAmbCcp.length
    ? {
        id: 'ccp-caps-departament',
        curs: '',
        grup: '',
        materia: descripcio,
        hores: 1,
        departament: '',
        departaments: [],
        tipus: '',
        professorAssignat: capsAmbCcp[0].professor,
        professors: capsAmbCcp.map((cap) => cap.professor),
        _descripcioSenseMateria: true,
        _descripcioUntis: descripcio,
        _activitatGestib: activitat,
        _ccpCapsDepartament: true,
      }
    : null;

  return {
    classes: classeCcp ? [...classes, classeCcp] : classes,
    resum: {
      descripcio,
      codiActivitat: activitat?.codiUntis || '',
      caps,
      capsAmbCcp,
      totalCaps: caps.length,
      totalAssistents: capsAmbCcp.length,
      totalHoresCcp: capsAmbCcp.reduce((total, cap) => total + cap.horesCcp, 0),
      totalHoresCapExport: caps.reduce((total, cap) => total + cap.horesCapExport, 0),
    },
  };
}

function trobarActivitatCoordinacioDocent(referenciaGestib) {
  return referenciaGestib?.activitats?.find((activitat) => {
    const text = normalitzar([
      activitat.etiqueta,
      activitat.curta,
      activitat.descripcio,
    ].filter(Boolean).join(' '));
    return text.includes('reun') && text.includes('coordinacio') && text.includes('docent');
  }) || null;
}

function trobarActivitatAtencioFamilies(referenciaGestib) {
  return referenciaGestib?.activitats?.find((activitat) => {
    const text = normalitzar([
      activitat.etiqueta,
      activitat.curta,
      activitat.descripcio,
    ].filter(Boolean).join(' '));
    return (
      text.includes('atencio') &&
      (
        text.includes('responsablesalumnes') ||
        text.includes('pares') ||
        text.includes('mares') ||
        text.includes('tutorslegals') ||
        text.includes('famil')
      )
    );
  }) || null;
}

function trobarActivitatReunioDepartament(referenciaGestib) {
  return referenciaGestib?.activitats?.find((activitat) => {
    const text = normalitzar([
      activitat.etiqueta,
      activitat.curta,
      activitat.descripcio,
    ].filter(Boolean).join(' '));
    return text.includes('reunio') && text.includes('departament');
  }) || null;
}

function numeroEsoExport(classe) {
  const codi = codisCurs(classe?.curs || '')[0] || '';
  const match = codi.match(/^([123])ESO$/);
  return match ? Number(match[1]) : 0;
}

function esOptativaPerReunio(classe) {
  const tipus = netejarText(classe?.tipus || '').toUpperCase();
  return tipus.startsWith('O') || tipus.startsWith('T');
}

function esTallerLectura(classe) {
  const materia = normalitzar(classe?.materia || '');
  return materia.includes('taller') && materia.includes('lectura');
}

function motiuExclusioReunioCoordinacio(classe) {
  if (!numeroEsoExport(classe)) return 'fora de 1r, 2n i 3r ESO';
  if (!grupsClasse(classe).length) return 'sense grup';
  if (esTallerLectura(classe)) return 'Taller de lectura';
  if (esOptativaPerReunio(classe)) return 'optativa';
  if (!obtenirProfessorsClasse(classe).length) return 'sense professor';
  return '';
}

function crearEquipsDocentsBase(rawClasses) {
  const grupsPerCurs = new Map();
  rawClasses.forEach((classe) => {
    const numero = numeroEsoExport(classe);
    if (!numero) return;
    if (!grupsPerCurs.has(numero)) grupsPerCurs.set(numero, new Set());
    grupsClasse(classe).forEach((grup) => grupsPerCurs.get(numero).add(grup));
  });

  const definicions = [];
  grupsPerCurs.forEach((grups, numero) => {
    [
      ['senars', ['A', 'C', 'E']],
      ['parells', ['B', 'D', 'F']],
    ].forEach(([tipus, possibles]) => {
      const lletres = possibles.filter((grup) => grups.has(grup));
      if (!lletres.length) return;
      definicions.push({
        clau: `${numero}-${tipus}`,
        curs: `${numero}ESO`,
        numero,
        grups: lletres,
        etiqueta: `${numero}${lletres.join('')}`,
      });
    });
  });

  return definicions.sort((a, b) => a.numero - b.numero || a.etiqueta.localeCompare(b.etiqueta));
}

function prepararReunionsCoordinacioDocent(rawClasses, referenciaGestib) {
  const activitat = trobarActivitatCoordinacioDocent(referenciaGestib);
  const descripcio = activitat?.curta || activitat?.etiqueta || activitat?.descripcio || 'Reunions coordinació docent';
  const equips = crearEquipsDocentsBase(rawClasses).map((equip) => ({
    ...equip,
    professors: [],
    professorsSet: new Set(),
    classesIncloses: [],
    excloses: [],
  }));
  const exclosos = [];

  rawClasses.forEach((classe) => {
    const numero = numeroEsoExport(classe);
    if (!numero) return;
    const grups = grupsClasse(classe);
    const motiuExclusio = motiuExclusioReunioCoordinacio(classe);
    if (motiuExclusio) {
      const item = {
        curs: classe.curs || `${numero}ESO`,
        grup: grups.join('+') || classe.grup || '',
        materia: classe.materia || '',
        tipus: classe.tipus || '',
        professorat: obtenirProfessorsClasse(classe),
        motiu: motiuExclusio,
      };
      exclosos.push(item);
      return;
    }

    const professors = obtenirProfessorsClasse(classe);
    const equipsCurs = equips.filter((equip) => equip.numero === numero);
    equipsCurs
      .filter((equip) => grups.some((grup) => equip.grups.includes(grup)))
      .forEach((equip) => {
        professors.forEach((professor) => equip.professorsSet.add(professor));
        equip.classesIncloses.push({
          curs: classe.curs || `${numero}ESO`,
          grup: grups.join('+') || classe.grup || '',
          materia: classe.materia || '',
          tipus: classe.tipus || '',
          professorat: professors,
        });
      });
  });

  const equipsAmbProfessors = equips.map((equip) => {
    const professors = [...equip.professorsSet].sort((a, b) => a.localeCompare(b));
    return {
      ...equip,
      professors,
      professorsSet: undefined,
      classesIncloses: equip.classesIncloses.sort((a, b) =>
        [a.curs, a.grup, a.materia].join('|').localeCompare([b.curs, b.grup, b.materia].join('|'))
      ),
    };
  });

  const classes = equipsAmbProfessors
    .filter((equip) => equip.professors.length)
    .map((equip) => ({
      id: `reunio-coordinacio-docent-${equip.clau}`,
      curs: '',
      grup: '',
      materia: `${descripcio} ${equip.etiqueta}`,
      hores: 1,
      departament: '',
      departaments: [],
      tipus: '',
      professorAssignat: equip.professors[0],
      professors: equip.professors,
      _descripcioSenseMateria: true,
      _descripcioUntis: descripcio,
      _textLlicoUntis: `Equip docent ${equip.etiqueta}`,
      _activitatGestib: activitat,
      _reunioCoordinacioDocent: true,
      _equipDocent: equip,
    }));

  return {
    classes,
    resum: {
      descripcio,
      codiActivitat: activitat?.codiUntis || '',
      equips: equipsAmbProfessors,
      exclosos,
      totalEquips: equipsAmbProfessors.length,
      totalReunions: classes.length,
      totalLinies: classes.reduce((total, classe) => total + classe.professors.length, 0),
    },
  };
}

function prepararAtencioFamilies(professors, referenciaGestib) {
  const activitat = trobarActivitatAtencioFamilies(referenciaGestib);
  const descripcio = activitat?.curta || activitat?.etiqueta || activitat?.descripcio || 'Atenció a pares, mares i tutors legals';
  const professorsExportables = professors
    .filter((professor) => professor.nom)
    .sort((a, b) => a.nom.localeCompare(b.nom));
  const classes = professorsExportables.map((professor) => ({
    id: `atencio-families-${professor.id || professor.codiUntis || professor.codiGestib || professor.codi || professor.nom}`,
    curs: '',
    grup: '',
    materia: descripcio,
    hores: 1,
    departament: professor.departament || '',
    departaments: professor.departament ? [professor.departament] : [],
    tipus: 'COM',
    professorAssignat: professor.nom,
    professors: [professor.nom],
    _descripcioSenseMateria: true,
    _descripcioUntis: descripcio,
    _activitatGestib: activitat,
    _atencioFamilies: true,
  }));

  return {
    classes,
    resum: {
      descripcio,
      codiActivitat: activitat?.codiUntis || '',
      totalProfessors: professorsExportables.length,
      totalLinies: classes.length,
      horesPerProfessor: 1,
      professors: professorsExportables.map((professor) => ({
        nom: professor.nom,
        departament: professor.departament || '',
        codiUntis: codiProfessorExport(professor),
      })),
    },
  };
}

function prepararReunionsDepartament(professors, referenciaGestib) {
  const activitat = trobarActivitatReunioDepartament(referenciaGestib);
  const descripcio = activitat?.curta || activitat?.etiqueta || activitat?.descripcio || 'Reunió de departament';
  const professorsExportables = professors
    .filter((professor) => professor.nom)
    .sort((a, b) => a.nom.localeCompare(b.nom));

  const departaments = [...new Set(professorsExportables
    .map((professor) => (professor.departament || 'Sense departament').toString().trim() || 'Sense departament'))]
    .sort((a, b) => a.localeCompare(b));

  const classes = professorsExportables.length
    ? [{
        id: 'reunio-departament-tots',
        curs: '',
        grup: '',
        materia: descripcio,
        hores: 1,
        departament: '',
        departaments,
        tipus: 'COM',
        professorAssignat: professorsExportables[0]?.nom || '',
        professors: professorsExportables.map((professor) => professor.nom),
        _descripcioSenseMateria: true,
        _descripcioUntis: descripcio,
        _textLlicoUntis: descripcio,
        _activitatGestib: activitat,
        _reunioDepartament: true,
        _departamentReunio: 'Tots',
      }]
    : [];

  return {
    classes,
    resum: {
      descripcio,
      codiActivitat: activitat?.codiUntis || '',
      reunions: [{
        departament: 'Tots',
        professors: professorsExportables.map((professor) => ({
          nom: professor.nom,
          codiUntis: codiProfessorExport(professor),
        })),
      }],
      totalDepartaments: departaments.length,
      totalReunions: classes.length,
      totalLinies: professorsExportables.length,
      horesPerReunio: 1,
    },
  };
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
    if (classe._ccpCapsDepartament && refNorm.includes('ccp')) score += 140;
    if (classe._atencioFamilies && refNorm.includes('atencio')) score += 140;
    if (classe._reunioDepartament && refNorm.includes('departament')) score += 140;
    if (classe._reunioCoordinacioDocent) {
      const equipNorm = normalitzar(classe._textLlicoUntis || '');
      if (equipNorm && refNorm.includes(equipNorm)) score += 180;
      if (refNorm.includes('equipdocent')) score += 60;
    }
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
    .sort((a, b) => compararAbreviaturaUntis(a.codi, b.codi))
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
    .sort((a, b) =>
      compararAbreviaturaUntis(codisProfessors.get(a.nom), codisProfessors.get(b.nom)) ||
      a.nom.localeCompare(b.nom, 'ca')
    )
    .map((professor) => {
      const camps = campsBuids(43);
      camps[0] = codisProfessors.get(professor.nom) || '';
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

  function afegirMateria(codi, nom) {
    if (!codi?.toString().trim()) return;
    const codiNet = codiUntisSegur(codi, 'MAT');
    if (codiNet && !materies.has(codiNet)) {
      materies.set(codiNet, { codi: codiNet, nom: textUntisSegur(nom) });
    }
  }

  classes
    .filter((classe) => classe.materia)
    .flatMap(filesExportClasse)
    .flatMap(expandirClassePerGrups)
    .forEach((classe) => {
      const materiaGestib = trobarMateriaGestibAmbOverride(classe, referenciaGestib, overrides);
      const codi = codiMateriaClasse(classe, materiaGestib, codisMateries);
      const nom = nomMateriaClasse(classe, materiaGestib);
      afegirMateria(codi, nom);
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
  camps[20] = '';
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
  return prepararComponentsGpu002(components);
}

function etiquetaBlocLlico(classe, components) {
  const tipus = netejarText(classe.tipus).toUpperCase();
  const tipusParts = new Set(tipus.split('+').map((part) => part.trim()).filter(Boolean));
  const teOptativa = [...tipusParts].find((part) => part.startsWith('O') || part.startsWith('T'));

  if (!classe.curs && !classe.grup) return 'Activitat';
  if (teOptativa) return `Optativa ${teOptativa}`;
  if (tipusParts.has('F')) return 'Flexible';
  if (tipusParts.has('CD')) return 'Codocencia';
  if (tipusParts.has('D')) return 'Desdoblament';
  if (tipusParts.has('S')) return 'Suport';
  if (components.length > 1) return 'Bloc compartit';
  return tipus || 'Ordinaria';
}

function notesVistaPrevia({ classe, components, referencia, filesAgrupades }) {
  const notes = [];
  if (components.length > 1) notes.push(`${components.length} linies GPU002`);
  if (classe._ccpCapsDepartament) notes.push('CCP: descompta 1h de cap de departament');
  if (classe._atencioFamilies) notes.push('1h complementaria d atencio a families');
  if (classe._reunioDepartament) notes.push(`Reunio departament ${classe._departamentReunio || ''}`.trim());
  if (classe.multicurs || classe._comptaProfessorUnic) notes.push('Materia simultania en diversos cursos');
  if (classe._reunioCoordinacioDocent) notes.push(classe._textLlicoUntis || 'Reunio equip docent');
  if (filesAgrupades.length > 1) notes.push(`${filesAgrupades.length} classes agrupades`);
  if (referencia) notes.push('Numero conservat del GPU002 de referencia');
  if (!classe.curs && !classe.grup) notes.push('Activitat sense grup');
  return notes;
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
  camps[6] = classe?._descripcioSenseMateria ? '' : codiUntisSegur(component.codiMateria, 'MAT');
  camps[7] = textUntisSegur(component.aula || camps[7] || '');
  camps[12] = netejarText(tipus);
  if (classe?._textLlicoUntis) {
    camps[17] = textUntisSegur(classe._textLlicoUntis);
  }
  camps[20] = '';
  camps[41] = codiUntisSegur(`${camps[6] || 'DESC'}_${component.codiGrups || 'ACT'}_${component.codiProfessor}_${numLlico}`, 'ID');
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
  const files = filesExportClasse(classe);
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
    const teGrupDefinit = classeTeGrupExportable({ ...fila, grup: grupOriginal });
    const codiGrups = teGrupDefinit ? codisClasse({ ...fila, grup: grupOriginal }).join(',') : '';

    obtenirProfessorsClasse(fila).forEach((nomProfessor) => {
      const codiProf = codiProfessor(nomProfessor, professors, codisProfessors);
      if (!codiProf || (!fila._descripcioSenseMateria && !codiMateria) || (teGrupDefinit && !codiGrups)) return;
      components.push({
        professor: nomProfessor,
        codiProfessor: codiProf,
        materia: fila.materia,
        codiMateria,
        grup: grupOriginal,
        codiGrups,
        comptaGrup,
        aula: fila.aula || fila.aulaPropria || fila.aulaEspecifica || '',
        fila,
      });
    });
  });

  return components;
}

function codiOrdreGrupLlico(classe) {
  return codisClasse(classe)[0] || (classe.curs || classe.grup ? `${classe.curs || ''}-${classe.grup || ''}` : 'ZZZ');
}

function ordenarLliconsExport(llicons) {
  return [...llicons].sort((a, b) =>
    compararAbreviaturaUntis(codiOrdreGrupLlico(a), codiOrdreGrupLlico(b)) ||
    (a.materia || '').localeCompare(b.materia || '', 'ca') ||
    (netejarText(a.tipus) || '').localeCompare(netejarText(b.tipus), 'ca') ||
    Number(b.hores || 0) - Number(a.hores || 0)
  );
}

function generarLlicons(classes, professors, codisProfessors, codisMateries, referenciesGpu002 = [], referenciaGestib = null, overrides = null) {
  const pendents = [];
  const usades = new Set();
  const vistaPrevia = [];
  let numero = Math.max(0, ...referenciesGpu002.map((ref) => Number(ref.num) || 0)) + 1;

  const lliconsExport = ordenarLliconsExport(agruparClassesPerLlicoExport(
    classes.filter((classe) =>
      Number(classe.hores) > 0 &&
      classe.materia &&
      !TIPUS_NO_LECTIUS.has(netejarText(classe.tipus).toUpperCase())
    )
  ));

  const linies = lliconsExport.flatMap((classe) => {
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

      if (referencia) usades.add(referencia.index);

      const components = componentsLlico(
        classe, professors, codisProfessors, codisMateries, referenciaGestib, pendents, overrides
      );

      if (!components.length) {
        pendents.push({ motiu: 'Sense professor, materia o grup exportable', classe });
        return [];
      }

      const componentsUnics = componentsExportables(components);
      const grups = [...new Set(componentsUnics.flatMap((c) => dividirCodisGrupUntis(c.codiGrups)))];
      const numLlico = referencia?.num || numero++;
      const NUMERICS_LLICO = new Set([0, 1, 2, 3, 9, 10, 13, 16, 18, 27, 28, 29, 30, 33, 34, 39, 40, 43, 45]);
      const hores = Number(classe.hores) || 0;

      const filesAgrupades = filesExportClasse(classe).map((fila) => ({
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
        const clauProfessor = classe._comptaProfessorUnic
          ? component.codiProfessor
          : `${component.codiProfessor}|${component.codiMateria}`;
        const grupsComponent = dividirCodisGrupUntis(component.codiGrups);
        const potComptarGrup = Boolean(grupsComponent.length) && component.comptaGrup;
        const comptaGrup = potComptarGrup && grupsComponent.some((grup) => !primerGrup.has(grup));
        const flags = {
          comptaGrup,
          comptaProfessor: !primerProfessor.has(clauProfessor),
        };
        grupsComponent.forEach((grup) => primerGrup.add(grup));
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
        return {
          text: liniaDif(camps, NUMERICS_LLICO),
          camps,
          component,
          flags,
        };
      });

      vistaPrevia.push({
        numero: numLlico,
        bloc: etiquetaBlocLlico(classe, componentsUnics),
        curs: classe.curs || '',
        grup: classe.grup || '',
        materia: classe.materia || '',
        hores,
        linies: liniesComponents.length,
        tipus: netejarText(classe.tipus),
        professors: [...new Set(componentsUnics.map((c) => c.professor))],
        codisProfessors: [...new Set(componentsUnics.map((c) => c.codiProfessor))],
        codiMateria: [...new Set(componentsUnics.map((c) => c.codiMateria))].join(', '),
        codiGrups: grups.join(','),
        font: referencia ? 'referencia' : 'generat',
        esActivitat: !classe.curs && !classe.grup,
        filesAgrupades,
        notes: notesVistaPrevia({ classe, components: componentsUnics, referencia, filesAgrupades }),
        liniesUntis: liniesComponents.map(({ component, flags, camps }) => ({
          numero: numLlico,
          codiGrup: component.codiGrups || '',
          grup: component.grup || '',
          professor: component.professor || '',
          codiProfessor: component.codiProfessor || '',
          materia: component.materia || classe.materia || '',
          codiMateria: component.codiMateria || '',
          aula: component.aula || '',
          hores,
          horesGrup: flags.comptaGrup ? hores : 0,
          horesProfessor: flags.comptaProfessor ? hores : 0,
          idUntis: camps[41] || '',
        })),
      });

      return liniesComponents.map((item) => item.text);
    });

  const text = linies.join('\r\n');
  return {
    text,
    pendents: [...pendents, ...validarLimitsHoresGrupGpu002(text)],
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

function limitHoresGrupUntis(codiGrup) {
  const codi = (codiGrup || '').toString().trim().toUpperCase();
  if (/^[1-4]ESO-/.test(codi)) return 30;
  if (/^(1B|2B)-/.test(codi)) return 33;
  return null;
}

function validarLimitsHoresGrupGpu002(text) {
  const totals = new Map();
  (text || '').split(/\r?\n/).forEach((linia) => {
    if (!linia.trim()) return;
    const camps = parseCsvLine(linia);
    const codiGrup = camps[4] || '';
    const horesGrup = Number(camps[2] || 0);
    if (!codiGrup || !horesGrup) return;
    totals.set(codiGrup, (totals.get(codiGrup) || 0) + horesGrup);
  });

  return [...totals.entries()]
    .map(([codiGrup, hores]) => ({ codiGrup, hores, limit: limitHoresGrupUntis(codiGrup) }))
    .filter((item) => item.limit !== null && item.hores > item.limit)
    .map((item) => ({
      motiu: `Hores de grup superen el limit Untis (${item.hores}/${item.limit})`,
      classe: {
        curs: item.codiGrup,
        grup: '',
        materia: 'Revisa duplicacions de grups compostos o optatives',
        hores: item.hores,
        professorAssignat: '',
      },
    }));
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
      .map((codi) => ({ nom: codi, codiUntis: codi }));
  }

  return professors
    .filter((p) => p.nom)
    .map((p) => ({
      nom: p.nom,
      codiUntis: codiProfessorExport(p),
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
    if (classe._virtualSuportDivisible || classe._virtualDesdoblamentDivisible) return classe;
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
  let professors = snapProfessors.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.eliminatDelFull);
  const rawClasses = snapClasses.docs.map((d) => ({ id: d.id, ...d.data() }));
  const reunionsCoordinacio = prepararReunionsCoordinacioDocent(rawClasses, referenciaGestib);
  const ccp = simular
    ? {
        descripcio: '*Assistència a CCP',
        codiActivitat: '',
        caps: [],
        capsAmbCcp: [],
        totalCaps: 0,
        totalAssistents: 0,
        totalHoresCcp: 0,
        totalHoresCapExport: 0,
        simulacio: true,
      }
    : prepararCcpCapsDepartament(rawClasses, professors, referenciaGestib);
  const atencioFamilies = simular
    ? {
        descripcio: 'Atenció a pares, mares i tutors legals',
        codiActivitat: '',
        totalProfessors: 0,
        totalLinies: 0,
        horesPerProfessor: 1,
        professors: [],
        simulacio: true,
      }
    : prepararAtencioFamilies(professors, referenciaGestib);
  const reunionsDepartament = simular
    ? {
        descripcio: 'Reunió de departament',
        codiActivitat: '',
        reunions: [],
        totalDepartaments: 0,
        totalLinies: 0,
        horesPerDepartament: 1,
        simulacio: true,
      }
    : prepararReunionsDepartament(professors, referenciaGestib);
  const rawClassesExport = simular ? rawClasses : ccp.classes;
  const rawClassesSenseDivisibles = rawClassesExport.filter((classe) => !esSuportDivisible(classe.tipus) && !esDesdoblamentDivisible(classe.tipus));
  const classesSuportDivisible = crearClassesSuportDivisible(professors, rawClassesExport);
  const classesDesdoblamentDivisible = crearClassesDesdoblamentDivisible(professors, rawClassesExport);
  let classes = [
    ...afegirGuardiesPatiCalculades(rawClassesSenseDivisibles, professors),
    ...crearClassesGuardiesNormals(professors, rawClassesSenseDivisibles),
    ...(simular ? [] : atencioFamilies.classes),
    ...(simular ? [] : reunionsDepartament.classes),
    ...(simular ? [] : reunionsCoordinacio.classes),
    ...classesSuportDivisible,
    ...classesDesdoblamentDivisible,
  ];
  const professorsSimulacio = simular ? professorsPerSimulacio(professors, referenciaGestib) : [];
  if (simular) {
    professors = professorsSimulacio;
    classes = simularAssignacions(classes, professorsSimulacio);
  }
  if (!simular && referenciaGestib?.places?.length) {
    const incidenciesProfessors = incidenciesCodisProfessorGestib(professors, referenciaGestib.places);
    if (incidenciesProfessors.length) {
      const detall = incidenciesProfessors
        .slice(0, 10)
        .map(({ professor, codi, motiu }) => `${professor.nom || 'Professor'} (${codi || 'sense codi'}: ${motiu})`)
        .join('; ');
      const mes = incidenciesProfessors.length > 10 ? `; i ${incidenciesProfessors.length - 10} mes` : '';
      throw new Error(
        `Revisa la columna codiUntis del full Professorat i torna a sincronitzar. ` +
        `Cada codi ha de coincidir amb PLACA curta del XML GestIB: ${detall}${mes}.`
      );
    }
  }
  const { codisProfessors, codisMateries } = crearMapes(classes, professors, referenciaGestib);
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
    ccp: simular ? ccp : ccp.resum,
    atencioFamilies: simular
      ? atencioFamilies
      : atencioFamilies.resum,
    reunionsDepartament: simular
      ? reunionsDepartament
      : reunionsDepartament.resum,
    reunionsCoordinacio: simular
      ? { ...reunionsCoordinacio.resum, simulacio: true }
      : reunionsCoordinacio.resum,
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
  const professors = snapProfessors.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.eliminatDelFull);
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
