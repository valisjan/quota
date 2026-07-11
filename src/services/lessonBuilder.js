import {
  netejarText, normalitzar, normalitzarGrup,
  grupsClasse, clauGrups, esSubconjuntGrups, obtenirProfessorsClasse,
  expandirClassePerGrups,
} from './untisUtils.js';
import { comptaPerGrupPerTipus } from '../utils/tipus.js';

function clauLlicoAgrupada(classe) {
  const professors = classe._generadaGuardia || classe._generadaGuardiaPati
    ? obtenirProfessorsClasse(classe).join('+')
    : '';
  return [
    normalitzar(classe.curs),
    normalitzar(normalitzarGrup(classe.grup)),
    normalitzar(classe.materia),
    normalitzar(professors),
  ].join('|');
}

function clauCursMateria(classe) {
  return [normalitzar(classe.curs), normalitzar(classe.materia)].join('|');
}

function esFlexible(classe) {
  return netejarText(classe.tipus).toUpperCase() === 'F';
}

function esOptativaClasse(classe) {
  const tipus = netejarText(classe.tipus).toUpperCase();
  return tipus.startsWith('O') || tipus.startsWith('T');
}

function esAutodesdobleClasse(classe) {
  return /^A\d+$/i.test(netejarText(classe.tipus));
}

function getAutodesdobleN(classe) {
  const match = netejarText(classe.tipus).toUpperCase().match(/^A(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function comptaPerGrupExport(classe) {
  if (!classe.curs || !classe.grup) return false;
  if ((classe.materia || '').toString().trim().startsWith('*')) return false;
  const tipus = netejarText(classe.tipus).toUpperCase();
  return tipus === 'CD' || comptaPerGrupPerTipus(tipus);
}

function horesPerGrupExport(classe, totalGrups) {
  const hores = Number(classe.hores) || 0;
  const horesBase = comptaPerGrupExport(classe) && totalGrups > 1 && !esOptativaClasse(classe)
    ? Math.round(hores / totalGrups)
    : hores;
  return esAutodesdobleClasse(classe)
    ? Math.max(0, horesBase - getAutodesdobleN(classe))
    : horesBase;
}

export function esOptativaCompartida(classe) {
  return netejarText(classe.tipus).toUpperCase().startsWith('T');
}

function franjaOptativa(tipus) {
  const normal = netejarText(tipus).toUpperCase();
  if (!normal.startsWith('O') && !normal.startsWith('T')) return '';
  if (normal.startsWith('T')) return 'O4';
  return normal;
}

function combinarTipusLlico(actual, nou) {
  const tipus = [actual, nou].map(netejarText);
  if (tipus.some((valor) => !valor)) return '';
  return [...new Set(tipus)].join('+');
}

function crearClustersLlico(classes) {
  const perMateria = new Map();

  classes.forEach((classe) => {
    const grups = grupsClasse(classe);
    const item = { classe, grups, clauGrups: clauGrups(grups) };
    const clau = clauCursMateria(classe);
    if (!perMateria.has(clau)) perMateria.set(clau, []);
    perMateria.get(clau).push(item);
  });

  const clusters = [];

  perMateria.forEach((items) => {
    const usats = new Set();
    const combinats = items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => item.grups.length > 1 || esFlexible(item.classe))
      .sort((a, b) => b.grups.length - a.grups.length);

    combinats.forEach((base) => {
      if (usats.has(base.index) || !base.grups.length) return;
      const membres = items
        .map((item, index) => ({ ...item, index }))
        .filter(
          (item) =>
            !usats.has(item.index) &&
            esSubconjuntGrups(item.grups, base.grups)
        );

      membres.forEach((item) => usats.add(item.index));
      clusters.push({
        grups: base.grups,
        classes: membres.map((item) => item.classe),
      });
    });

    const restants = new Map();
    items.forEach((item, index) => {
      if (usats.has(index)) return;
      if (!restants.has(item.clauGrups)) restants.set(item.clauGrups, []);
      restants.get(item.clauGrups).push(item.classe);
    });

    restants.forEach((llista, grupsKey) => {
      clusters.push({
        grups: grupsKey.split('+').filter(Boolean),
        classes: llista,
      });
    });
  });

  return clusters;
}

function crearLliconsPerTramsDeGrup(classes, grup) {
  const horesTall = [
    ...new Set(
      classes
        .map((classe) => Number(classe.hores) || 0)
        .filter((hores) => hores > 0)
    ),
  ].sort((a, b) => a - b);

  const llicons = [];
  let inici = 0;

  horesTall.forEach((fi) => {
    const hores = fi - inici;
    if (hores <= 0) return;

    const actives = classes.filter((classe) => Number(classe.hores || 0) > inici);
    if (!actives.length) {
      inici = fi;
      return;
    }

    const professors = [
      ...new Set(actives.flatMap((classe) => obtenirProfessorsClasse(classe))),
    ];
    const tipus = actives.reduce(
      (actual, classe) => combinarTipusLlico(actual, classe.tipus),
      netejarText(actives[0]?.tipus || '')
    );
    const referencia = actives.find((classe) => !netejarText(classe.tipus)) || actives[0];

    llicons.push({
      ...referencia,
      grup,
      hores,
      professors,
      professorAssignat: professors[0] || '',
      tipus,
      _filesAgrupades: actives,
      _preservaGrupsOriginals: false,
      _comptaGrupUnic: actives.some((classe) => classe._exportGrupCompartit),
      _comptaProfessorUnic: actives.some((classe) => classe.multicurs || classe._exportMulticurs),
    });

    inici = fi;
  });

  return llicons;
}

function crearLliconsPerTramsFlexibles(classes) {
  const grup = normalitzarGrup(
    classes.find((classe) => esFlexible(classe))?.grup || classes[0]?.grup || ''
  );
  return crearLliconsPerTramsDeGrup(classes, grup).map((llico) => ({
    ...llico,
    _preservaGrupsOriginals: true,
  }));
}

function crearLliconsPerTramsExactes(classes) {
  const grup = normalitzarGrup(classes[0]?.grup || '');
  return crearLliconsPerTramsDeGrup(classes, grup);
}

function clauOptativa(classe) {
  const tipus = netejarText(classe.tipus).toUpperCase();
  const grups = /^O\d+$/.test(tipus) || tipus.startsWith('T')
    ? ''
    : classe._grupsLlicoExport || clauGrups(grupsClasse(classe));
  return [
    normalitzar(classe.curs),
    normalitzar(franjaOptativa(classe.tipus)),
    normalitzar(grups),
  ].join('|');
}

function classeOptativaPerBloc(classe, indexBloc, totalBlocs) {
  const professorsClasse = obtenirProfessorsClasse(classe);
  const esCompartida = esOptativaCompartida(classe) && professorsClasse.length > 1;
  const professorBloc = esCompartida
    ? professorsClasse[indexBloc % professorsClasse.length]
    : professorsClasse[0];
  const horesBloc = (Number(classe.hores) || 0) / totalBlocs;

  return {
    ...classe,
    hores: horesBloc,
    tipus: franjaOptativa(classe.tipus),
    professors: professorBloc ? [professorBloc] : [],
    professorAssignat: professorBloc || '',
    _filaOriginal: classe,
  };
}

function crearLlicoOptativa(classes, indexBloc, totalBlocs) {
  const filesBloc = classes.map((classe) =>
    classeOptativaPerBloc(classe, indexBloc, totalBlocs)
  );
  const primera = filesBloc[0] || {};
  const professors = [
    ...new Set(filesBloc.flatMap((classe) => obtenirProfessorsClasse(classe))),
  ];

  return {
    ...primera,
    materia: `Optatives ${franjaOptativa(primera.tipus)}`,
    grup: clauGrups(filesBloc.flatMap((classe) => grupsClasse(classe))),
    hores: Number(primera.hores) || 0,
    professors,
    professorAssignat: professors[0] || '',
    tipus: franjaOptativa(primera.tipus),
    _materiesAgrupades: filesBloc,
    _filesAgrupades: filesBloc,
    _preservaGrupsOriginals: true,
    _comptaGrupUnic: true,
  };
}

function agruparOptatives(classes) {
  const perFranja = new Map();

  classes.forEach((classe) => {
    const clau = clauOptativa(classe);
    if (!perFranja.has(clau)) perFranja.set(clau, []);
    perFranja.get(clau).push(classe);
  });

  return [...perFranja.values()].flatMap((llista) => {
    const totalBlocs = Math.max(
      1,
      ...llista
        .filter(esOptativaCompartida)
        .map((classe) => obtenirProfessorsClasse(classe).length)
    );

    return Array.from({ length: totalBlocs }, (_, index) =>
      crearLlicoOptativa(llista, index, totalBlocs)
    );
  });
}

export function agruparClassesPerLlico(classes) {
  const optatives = [];
  const flexibles = [];
  const trams = new Map();
  const usadesEnFlexible = new Set();

  classes
    .filter((classe) => esFlexible(classe))
    .forEach((classeFlexible) => {
      const grupsFlexible = grupsClasse(classeFlexible);
      const relacionades = classes.filter(
        (classe) =>
          !esOptativaClasse(classe) &&
          clauCursMateria(classe) === clauCursMateria(classeFlexible) &&
          esSubconjuntGrups(grupsClasse(classe), grupsFlexible)
      );

      relacionades.forEach((classe) => usadesEnFlexible.add(classe.id || classe));
      flexibles.push(...crearLliconsPerTramsFlexibles(relacionades));
    });

  classes.forEach((classe) => {
    if (usadesEnFlexible.has(classe.id || classe)) return;

    if (esOptativaClasse(classe)) {
      optatives.push(classe);
      return;
    }

    const classesPerTram = classe._exportGrupCompartit ? [classe] : expandirClassePerGrups(classe);
    classesPerTram.forEach((c) => {
      const clau = clauLlicoAgrupada(c);
      if (!trams.has(clau)) trams.set(clau, []);
      trams.get(clau).push(c);
    });
  });

  return [
    ...[...trams.values()].flatMap(crearLliconsPerTramsExactes),
    ...agruparOptatives(optatives),
    ...flexibles,
  ];
}

export function agruparClassesPerLlicoExport(classes) {
  const preparades = classes.flatMap((classe) => {
    const grupsOriginals = grupsClasse(classe);
    const totalGrups = Math.max(1, grupsOriginals.length);
    const horesExport = horesPerGrupExport(classe, totalGrups);
    const grupsLlicoExport = clauGrups(grupsOriginals);

    const preparada = {
      ...classe,
      hores: horesExport,
      _horesOriginals: Number(classe.hores) || 0,
      _exportMulticurs: Boolean(classe.multicurs || classe.subclasses?.length),
      _grupsLlicoExport: grupsLlicoExport,
    };

    return esFlexible(classe) ? [preparada] : expandirClassePerGrups(preparada);
  });

  return agruparClassesPerLlico(preparades);
}
