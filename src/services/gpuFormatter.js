import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  TIPUS_NO_LECTIUS, netejarText, senseAccents, normalitzar,
  codiBase, codiUnic, codiProfessorBase,
  codisClasse, grupsClasse, campsBuids, decimalUntis, liniaDif,
  parseGpu002, limitsJornada, obtenirProfessorsClasse, descarregarText,
} from './untisUtils';
import { parseGestibXml, trobarMateriaGestib, trobarMateriaGestibAmbOverride } from './gestibMapper';
import { agruparClassesPerLlico, esOptativaCompartida } from './lessonBuilder';

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
      camps[0] = item.codi;
      camps[1] = item.nom || item.codi;
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
      camps[0] = codisProfessors.get(professor.nom);
      camps[1] = professor.nom;
      camps[14] = limitsJornada(professor);
      camps[16] = professor.departament || '';
      camps[22] = professor.major55 ? '>55' : '';
      camps[35] = professor.nom;
      return liniaDif(camps, new Set([7, 8, 9, 10, 11, 12, 13, 14, 15, 21, 27, 34, 37, 40]));
    })
    .join('\r\n');
}

function generarMateries(classes, codisMateries, referenciaGestib, overrides) {
  const materies = new Map();

  classes
    .filter((classe) => classe.materia)
    .forEach((classe) => {
      const materiaGestib = trobarMateriaGestibAmbOverride(classe, referenciaGestib, overrides);
      const codi = materiaGestib?.codiUntis || codisMateries.get(classe.materia);
      const nom = materiaGestib
        ? `${materiaGestib.descripcio} (${materiaGestib.cursDescripcio})`
        : classe.materia;
      if (codi && !materies.has(codi)) {
        materies.set(codi, { codi, nom });
      }
    });

  return [...materies.values()]
    .sort((a, b) => a.codi.localeCompare(b.codi))
    .map(({ nom, codi }) => {
      const camps = campsBuids(21);
      camps[0] = codi;
      camps[1] = nom;
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
  camps[4] = grups.join('~');
  camps[5] = codiProfessors.join('~');
  camps[6] = codiMateria;
  camps[9] = 0;
  camps[10] = decimalUntis(horesNum);
  camps[12] = netejarText(tipus);
  camps[14] = calendari.inici;
  camps[15] = calendari.fi;
  camps[16] = decimalUntis(horesNum * 0.0053);
  camps[20] = [
    netejarText(classe.curs),
    netejarText(classe.grup),
    netejarText(classe.materia),
  ].filter(Boolean).join(' ');
  camps[23] = 'n';
  camps[33] = 0;
  camps[34] = 0;
  camps[39] = Math.round(horesNum * 100000);
  camps[40] = decimalUntis(horesNum);
  camps[41] = `${codiMateria}_${grups.join('~')}_${numero}`;
  camps[45] = 0;

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

    const codiMateria = materiaGestib?.codiUntis || codisMateries.get(fila.materia);
    const grupOriginal = classe._preservaGrupsOriginals ? fila.grup : classe.grup;
    const codiGrups = codisClasse({ ...fila, grup: grupOriginal }).join(',');
    const teGrupDefinit = Boolean((fila.curs || '').toString().trim() && (grupOriginal || '').toString().trim());

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

  const linies = agruparClassesPerLlico(
    classes.filter((classe) => Number(classe.hores) > 0 && classe.materia)
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

      const codiProfessorsLlico = components.map((c) => c.codiProfessor);
      const codiMateria = components.map((c) => c.codiMateria).join('~');
      const grups = [...new Set(components.map((c) => c.codiGrups))];
      const numLlico = referencia?.num || numero++;
      const camps = referencia?.camps
        ? [...referencia.camps]
        : crearFilaGpu002({
            numero: numLlico,
            hores: classe.hores,
            grups,
            codiProfessors: codiProfessorsLlico,
            codiMateria,
            tipus,
            classe,
            referenciaGestib,
          });

      if (referencia) {
        camps[0] = numLlico;
        camps[1] = Number(classe.hores);
        camps[2] = Number(classe.hores);
        camps[3] = Number(classe.hores);
        camps[4] = grups.join('~');
        camps[5] = codiProfessorsLlico.join('~');
        camps[6] = codiMateria;
        camps[12] = netejarText(classe.tipus);
      }

      vistaPrevia.push({
        numero: numLlico,
        curs: classe.curs || '',
        grup: classe.grup || '',
        materia: classe.materia || '',
        hores: Number(classe.hores) || 0,
        tipus: netejarText(classe.tipus),
        professors: components.map((c) => c.professor),
        codisProfessors: codiProfessorsLlico,
        codiMateria,
        codiGrups: camps[4] || grups.join('~'),
        font: referencia ? 'referencia' : 'generat',
        filesAgrupades: (classe._filesAgrupades || [classe]).map((fila) => ({
          curs: fila.curs || '',
          grup: fila.grup || '',
          materia: fila.materia || '',
          hores: Number(fila.hores) || 0,
          tipus: fila.tipus || '',
          professor: fila.professorAssignat || fila.professors?.[0] || '',
        })),
      });

      return [liniaDif(camps, new Set([0, 1, 2, 3, 9, 10, 13, 16, 18, 27, 28, 29, 30, 33, 34, 39, 40, 43, 45]))];
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

function simularAssignacions(classes, professorsSimulacio) {
  const disponibles = professorsSimulacio.map((p) => p.nom).filter(Boolean);
  let index = 0;

  return classes.map((classe) => {
    if (TIPUS_NO_LECTIUS.has((classe.tipus || '').toUpperCase())) return classe;
    if (!disponibles.length) return classe;
    const totalProfessors = esOptativaCompartida(classe) && disponibles.length > 1 ? 2 : 1;
    const professorsAssignats = Array.from({ length: totalProfessors }, () => {
      const profNom = disponibles[index % disponibles.length];
      index++;
      return profNom;
    });
    return {
      ...classe,
      professorAssignat: professorsAssignats[0] || '',
      professors: professorsAssignats,
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
  let classes = snapClasses.docs.map((d) => ({ id: d.id, ...d.data() }));
  let professors = snapProfessors.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    fitxers: [
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
