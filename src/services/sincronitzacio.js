import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { normalitzarJornada } from '../utils/horesProfessor';
import { departamentsProfessor, formatDepartamentsProfessor, separarDepartaments } from '../utils/departaments';
import { E2E_AUTH_BYPASS, getE2ECollection } from './e2e';
import { BatchSplit } from '../utils/firestoreBatch';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbykQQXn6_oZ1iTtkASuHSA1P1kr5eSqGlIEdm5IBfuxSvr0wDh2I6Ec_yjILnHCXDKe/exec';
export const DEFAULT_SHEETS_ID = '1uKYDn_2-KyHVJrlfLAHWvZ-YvPIRpv2SlSDUhdQfnA0';
const SHEET_CLASSES = 'Classes';
const SHEET_PROFESSORAT = 'Professorat';
const SYNC_STATE_DOC = 'sync_state';

const n = (s) => (s || '').toString().toLowerCase().trim();

const DOMINI_CENTRE = 'iesjosepsuredaiblanes.com';
function completarEmail(raw) {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return '';
  return s.includes('@') ? s : `${s}@${DOMINI_CENTRE}`;
}

const ROLS_VALIDS = new Set(['admin', 'cap_departament', 'departament', 'professor']);

function normalitzarGrup(grup) {
  if (!grup) return '';
  if (grup.includes('+') || grup.length <= 1) return grup;
  if (/^[A-Za-z]+$/.test(grup)) return grup.split('').join('+');
  return grup;
}

function valorCel(row, index) {
  return row.c?.[index]?.v?.toString().trim() || '';
}

function normalitzarCapcalera(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function indexCapcalera(capcaleres, aliases, fallback) {
  const aliasos = aliases.map(normalitzarCapcalera);
  const index = capcaleres.findIndex((capcalera) => aliasos.includes(normalitzarCapcalera(capcalera)));
  return index >= 0 ? index : fallback;
}

function capcaleresDeFiles(rows) {
  return rows[0]?.c?.map((cell) => (cell?.v ?? '').toString().trim()) || [];
}

function teCapcaleraProfessorat(capcaleres) {
  return capcaleres.some((capcalera) => ['NOM', 'NOMBRE', 'PROFESSOR', 'PROFESSORAT'].includes(normalitzarCapcalera(capcalera)));
}

function hashText(text) {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function assertSheetOk(data, nomPestanya) {
  if (data.status === 'error') {
    throw new Error(
      data.errors?.[0]?.detailed_message
      || data.errors?.[0]?.message
      || `Error en llegir la pestanya "${nomPestanya}".`
    );
  }
}

function llegirClassesDeResposta(data) {
  assertSheetOk(data, SHEET_CLASSES);
  return (data.table?.rows || [])
    .map((row) => ({
      curs:        valorCel(row, 0),
      grup:        normalitzarGrup(valorCel(row, 1)),
      materia:     valorCel(row, 2),
      hores:       Number(row.c[3]?.v) || 0,
      departament: valorCel(row, 4),
      tipus:       valorCel(row, 5),
    }))
    .filter((c) => c.materia && n(c.materia) !== 'materia');
}

function llegirProfessorsDeResposta(data) {
  assertSheetOk(data, SHEET_PROFESSORAT);
  const rows = data.table?.rows || [];
  const capcaleres = capcaleresDeFiles(rows);
  const teCapcalera = teCapcaleraProfessorat(capcaleres);
  const col = {
    nom: indexCapcalera(capcaleres, ['Nom', 'Nombre', 'Professor', 'Professorat'], 0),
    departament: indexCapcalera(capcaleres, ['Departament', 'Departaments'], 1),
    jornada: indexCapcalera(capcaleres, ['Jornada'], 2),
    codiUntis: indexCapcalera(capcaleres, ['Codi Untis', 'CODIUNTIS', 'Codi', 'Sigla'], 3),
    email: indexCapcalera(capcaleres, ['Email', 'Correu', 'Mail'], 4),
    rol: indexCapcalera(capcaleres, ['Rol'], 5),
    comentariFull: indexCapcalera(capcaleres, ['Comentari', 'Comentari Full', 'Observacions'], 6),
    idGestib: indexCapcalera(capcaleres, ['ID GestIB', 'ID_GESTIB', 'IDGESTIB', 'Codi GestIB', 'Sigla GestIB'], -1),
  };

  return (teCapcalera ? rows.slice(1) : rows)
    .map((row) => {
      const codiUntis = valorCel(row, col.codiUntis).replace(/\s+/g, '').toUpperCase();
      const idGestib = valorCel(row, col.idGestib).replace(/\s+/g, '').toUpperCase();
      const departaments = separarDepartaments(valorCel(row, col.departament));
      return {
        nom:          valorCel(row, col.nom),
        departament: departaments[0] || '',
        departaments,
        jornada:      normalitzarJornada(valorCel(row, col.jornada)),
        codiUntis,
        email:        completarEmail(valorCel(row, col.email)),
        rol:          valorCel(row, col.rol),
        comentariFull: valorCel(row, col.comentariFull),
        idGestib:     idGestib || codiUntis,
      };
    })
    .filter((p) => p.nom && !['nom', 'professor', 'professorat'].includes(n(p.nom)) && p.departaments.length > 0);
}

function textSignatura(valor) {
  return (valor ?? '').toString().trim();
}

function filesSignaturaClasses(classes) {
  return classes
    .map((c) => [
      textSignatura(c.curs),
      textSignatura(normalitzarGrup(c.grup)),
      textSignatura(c.materia),
      Number(c.hores) || 0,
      textSignatura(c.departament),
      textSignatura(c.tipus),
    ].join('\u001f'))
    .sort();
}

function filesSignaturaProfessors(professors) {
  return professors
    .map((p) => [
      textSignatura(p.nom),
      textSignatura(formatDepartamentsProfessor(p)),
      textSignatura(p.jornada),
      textSignatura(p.codiUntis),
      textSignatura(p.email),
      textSignatura(p.rol),
      textSignatura(p.comentariFull),
      textSignatura(p.idGestib),
    ].join('\u001f'))
    .sort();
}

function signaturaClasses(classes) {
  return hashText(JSON.stringify(filesSignaturaClasses(classes)));
}

function signaturaProfessors(professors) {
  return hashText(JSON.stringify(filesSignaturaProfessors(professors)));
}

function signaturaDadesSheets(classes, professors) {
  const filesClasses = filesSignaturaClasses(classes);
  const filesProfessors = filesSignaturaProfessors(professors);
  return hashText(JSON.stringify({ classes: filesClasses, professors: filesProfessors }));
}

function clauUnica(c) {
  return `${n(c.curs)}|${n(normalitzarGrup(c.grup))}|${n(c.materia)}|${n(c.departament)}|${n(c.tipus)}`;
}

function clauBase(c) {
  return `${n(c.curs)}|${n(normalitzarGrup(c.grup))}|${n(c.materia)}`;
}

function campsAssignacio(data = {}) {
  const professorAssignat = data.professorAssignat || '';
  const professors = data.professors?.length
    ? data.professors
    : professorAssignat
    ? [professorAssignat]
    : [];
  return {
    professors,
    professorAssignat,
    participants: data.participants || [],
  };
}

function teAssignacio(data = {}) {
  return Boolean(data.professorAssignat || data.professors?.length || data.participants?.length);
}

function resumAssignacio(data = {}) {
  const { professors, participants } = campsAssignacio(data);
  const parts = [];
  if (professors.length) parts.push(`professorat: ${professors.join(', ')}`);
  if (participants.length) parts.push(`participants: ${participants.length}`);
  return parts.join(' · ');
}

function netejarAssignacionsProfessorsEliminats(data = {}, nomsValids = new Set()) {
  const professorAssignatOriginal = data.professorAssignat || '';
  const professorsOriginal = Array.isArray(data.professors)
    ? data.professors.filter(Boolean)
    : professorAssignatOriginal
    ? [professorAssignatOriginal]
    : [];
  const participantsOriginal = Array.isArray(data.participants) ? data.participants.filter(Boolean) : [];

  const professors = professorsOriginal.filter((nom) => nomsValids.has(n(nom)));
  const participants = participantsOriginal.filter((nom) => nomsValids.has(n(nom)));
  const professorAssignat = nomsValids.has(n(professorAssignatOriginal))
    ? professorAssignatOriginal
    : professors[0] || '';

  const professorsHanCanviat =
    professors.length !== professorsOriginal.length ||
    professors.some((nom, index) => nom !== professorsOriginal[index]);
  const participantsHanCanviat =
    participants.length !== participantsOriginal.length ||
    participants.some((nom, index) => nom !== participantsOriginal[index]);

  if (
    professorAssignat === professorAssignatOriginal &&
    !professorsHanCanviat &&
    !participantsHanCanviat
  ) {
    return null;
  }

  return { professorAssignat, professors, participants };
}

function afegirAIndex(index, clau, item) {
  if (!index.has(clau)) index.set(clau, []);
  index.get(clau).push(item);
}

function ordenarIndexPerAssignacio(index) {
  index.forEach((items) => {
    items.sort((a, b) => Number(teAssignacio(b.data)) - Number(teAssignacio(a.data)));
  });
}

function trobarNoEmparellat(index, clau, idsEmparellats) {
  return (index.get(clau) || []).find((item) => !idsEmparellats.has(item.id));
}


async function guardarHistorialSincronitzacio(cursId, resultat, actor) {
  await addDoc(collection(db, 'cursos', cursId, 'sync_history'), {
    ...resultat,
    actor: actor || 'admin',
    createdAt: new Date().toISOString(),
  });
}

function cc(cursId, nom) { return collection(db, 'cursos', cursId, nom); }
function dd(cursId, nom, id) { return id ? doc(db, 'cursos', cursId, nom, id) : doc(cc(cursId, nom)); }
function syncStateRef(cursId) { return doc(db, 'cursos', cursId, 'config', SYNC_STATE_DOC); }

function parseGvizResponse(text) {
  // The gviz response format: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  // The prefix is always 47 chars; the suffix is ");".
  try {
    return JSON.parse(text.substring(47, text.length - 2));
  } catch {
    // Fallback: try regex in case the format varies slightly
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/);
    if (match) return JSON.parse(match[1]);
    throw new Error("No s'ha pogut llegir el full. Comprova que és públic (visible per a tothom amb l'enllaç).");
  }
}

async function llegirSheets(nomPestanya, sheetsId = DEFAULT_SHEETS_ID) {
  const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(nomPestanya)}&_=${cacheBust}`;
  const res = await fetch(url);
  const text = await res.text();
  return parseGvizResponse(text);
}

export async function llegirEstatFontSheets(sheetsId = DEFAULT_SHEETS_ID) {
  const [jsonClasses, jsonProfs] = await Promise.all([
    llegirSheets(SHEET_CLASSES, sheetsId),
    llegirSheets(SHEET_PROFESSORAT, sheetsId),
  ]);
  const classes = llegirClassesDeResposta(jsonClasses);
  const professors = llegirProfessorsDeResposta(jsonProfs);
  return {
    sheetsId,
    classes,
    professors,
    signatura: signaturaDadesSheets(classes, professors),
    signaturaClasses: signaturaClasses(classes),
    signaturaProfessors: signaturaProfessors(professors),
    totalClasses: classes.length,
    totalProfessors: professors.length,
    checkedAt: new Date().toISOString(),
  };
}

export function subscribeEstatSincronitzacio(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) {
    callback({
      classesSignature: 'e2e',
      sourceSignature: 'e2e',
      sheetsId: DEFAULT_SHEETS_ID,
      totalClasses: getE2ECollection('classes').length,
      totalProfessors: getE2ECollection('professors').length,
      syncedAt: new Date().toISOString(),
    });
    return () => {};
  }
  if (!cursId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    syncStateRef(cursId),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    onError
  );
}

async function guardarEstatFontSincronitzada(cursId, estatFont, resultat, actor) {
  await setDoc(
    syncStateRef(cursId),
    {
      sourceSignature: estatFont.signatura,
      classesSignature: estatFont.signaturaClasses,
      professorsSignature: estatFont.signaturaProfessors,
      sheetsId: estatFont.sheetsId,
      totalClasses: estatFont.totalClasses,
      totalProfessors: estatFont.totalProfessors,
      syncedAt: resultat.timestamp,
      checkedAt: estatFont.checkedAt,
      actor: actor || 'admin',
      lastResult: {
        afegides: resultat.afegides || 0,
        actualitzades: resultat.actualitzades || 0,
        eliminades: resultat.eliminades || 0,
      },
    },
    { merge: true }
  );
}

async function ajustarEstatFontSenseCanvis(cursId, estatFont) {
  await setDoc(
    syncStateRef(cursId),
    {
      sourceSignature: estatFont.signatura,
      classesSignature: estatFont.signaturaClasses,
      professorsSignature: estatFont.signaturaProfessors,
      sheetsId: estatFont.sheetsId,
      totalClasses: estatFont.totalClasses,
      totalProfessors: estatFont.totalProfessors,
      checkedAt: estatFont.checkedAt,
      baselineAdjustedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

function resumCanvisBuit() {
  return {
    noves: 0,
    modificades: 0,
    eliminades: 0,
    totalCanvis: 0,
    detalls: [],
    preview: { noves: [], modificades: [], eliminades: [] },
    resumPerDepartament: [],
    resumPerMateria: [],
  };
}

function valorVisible(valor, fallback = '-') {
  const text = (valor ?? '').toString().trim();
  return text || fallback;
}

function resumClasseCanvi(classe = {}) {
  return [
    classe.curs,
    classe.grup,
    classe.materia,
    classe.hores ? `${classe.hores}h` : '',
    classe.departament,
    classe.tipus ? `tipus ${classe.tipus}` : '',
  ]
    .map((part) => (part ?? '').toString().trim())
    .filter(Boolean)
    .join(' | ');
}

function classePreview(classe = {}) {
  return {
    curs: classe.curs || '',
    grup: normalitzarGrup(classe.grup) || '',
    materia: classe.materia || '',
    hores: Number(classe.hores) || 0,
    departament: classe.departament || classe.departaments?.[0] || '',
    tipus: classe.tipus || '',
  };
}

function crearCanviClasse(tipus, classe, extra = {}) {
  return {
    tipus,
    resum: resumClasseCanvi(classe),
    classe: classePreview(classe),
    ...extra,
  };
}

function crearBucketResumCanvis(nom) {
  return {
    nom,
    noves: 0,
    modificades: 0,
    eliminades: 0,
    total: 0,
    horesAfegides: 0,
    horesActualitzades: 0,
    horesEliminades: 0,
    deltaHores: 0,
  };
}

function sumarCanviAResum(map, key, canvi) {
  const nom = key || 'Sense valor';
  if (!map.has(nom)) map.set(nom, crearBucketResumCanvis(nom));
  const bucket = map.get(nom);
  const horesDespres = Number(canvi.horesDespres ?? canvi.classe?.hores ?? 0) || 0;
  const horesAbans = Number(canvi.horesAbans ?? canvi.classeAbans?.hores ?? 0) || 0;

  bucket.total++;
  if (canvi.tipus === 'nova') {
    bucket.noves++;
    bucket.horesAfegides += horesDespres;
    bucket.deltaHores += horesDespres;
  } else if (canvi.tipus === 'eliminada') {
    bucket.eliminades++;
    bucket.horesEliminades += horesAbans || horesDespres;
    bucket.deltaHores -= horesAbans || horesDespres;
  } else if (canvi.tipus === 'modificada') {
    bucket.modificades++;
    bucket.horesActualitzades += horesDespres;
    bucket.deltaHores += horesDespres - horesAbans;
  }
}

function ordenarResumCanvis(map) {
  return [...map.values()]
    .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'ca'));
}

function resumAgrupatClasses(preview) {
  const departaments = new Map();
  const materies = new Map();
  const tots = [
    ...(preview.noves || []),
    ...(preview.modificades || []),
    ...(preview.eliminades || []),
  ];

  tots.forEach((canvi) => {
    const classe = canvi.classe || {};
    sumarCanviAResum(departaments, classe.departament || 'Sense departament', canvi);
    sumarCanviAResum(materies, classe.materia || 'Sense matèria', canvi);
  });

  return {
    departaments: ordenarResumCanvis(departaments),
    materies: ordenarResumCanvis(materies),
  };
}

function resumProfessorCanvi(professor = {}) {
  return [
    professor.nom,
    formatDepartamentsProfessor(professor),
    professor.jornada,
    professor.codiUntis ? `Untis ${professor.codiUntis}` : '',
    professor.idGestib ? `GestIB ${professor.idGestib}` : '',
    professor.email,
    professor.comentariFull,
  ]
    .map((part) => (part ?? '').toString().trim())
    .filter(Boolean)
    .join(' | ');
}

function detallCanvisClasse(existent = {}, nova = {}) {
  const detalls = [];
  const afegir = (camp, abans, despres) => {
    if (n(abans) !== n(despres)) {
      detalls.push(`${camp}: ${valorVisible(abans)} -> ${valorVisible(despres)}`);
    }
  };

  afegir('Curs', existent.curs, nova.curs);
  afegir('Grup', normalitzarGrup(existent.grup), normalitzarGrup(nova.grup));
  afegir('Materia', existent.materia, nova.materia);
  if (Number(existent.hores) !== Number(nova.hores)) {
    detalls.push(`Hores: ${Number(existent.hores) || 0} -> ${Number(nova.hores) || 0}`);
  }
  afegir('Departament', existent.departament, nova.departament);
  afegir('Tipus', existent.tipus || 'Normal', nova.tipus || 'Normal');
  if (!existent.departaments) detalls.push('Departaments interns');

  return detalls;
}

function detallCanvisProfessor(existent = {}, nou = {}) {
  const detalls = [];
  const afegir = (camp, abans, despres) => {
    if (n(abans) !== n(despres)) {
      detalls.push(`${camp}: ${valorVisible(abans)} -> ${valorVisible(despres)}`);
    }
  };

  afegir('Departaments', formatDepartamentsProfessor(existent), formatDepartamentsProfessor(nou));
  afegir('Jornada', existent.jornada, nou.jornada);
  afegir('Codi Untis', existent.codiUntis, nou.codiUntis);
  afegir('ID GestIB', existent.idGestib, nou.idGestib);
  afegir('Email', existent.email, nou.email);
  afegir('Rol', existent.rol, nou.rol);
  afegir('Comentari', existent.comentariFull, nou.comentariFull);
  return detalls;
}

async function calcularDiscrepanciesClasses(cursId, classesSheets) {
  const snapClasses = await getDocs(cc(cursId, 'classes'));

  const existents = snapClasses.docs.map((d) => ({
    id: d.id,
    data: d.data(),
  }));
  const perClauUnica = new Map();
  const perClauBase = new Map();

  existents.forEach((item) => {
    const data = item.data;
    afegirAIndex(perClauUnica, clauUnica(data), item);
    afegirAIndex(perClauBase, clauBase(data), item);
  });
  ordenarIndexPerAssignacio(perClauUnica);
  ordenarIndexPerAssignacio(perClauBase);

  let noves = 0;
  let modificades = 0;
  const idsEmparellats = new Set();
  const detalls = [];
  const preview = {
    noves: [],
    modificades: [],
    eliminades: [],
  };
  const riscos = [];

  classesSheets.forEach((classe) => {
    const exacte = trobarNoEmparellat(
      perClauUnica,
      clauUnica(classe),
      idsEmparellats
    );
    const equivalent = trobarNoEmparellat(
      perClauBase,
      clauBase(classe),
      idsEmparellats
    );
    const existent = exacte || equivalent || null;

    if (!existent) {
      noves++;
      const canvi = crearCanviClasse('nova', classe, {
        horesDespres: Number(classe.hores) || 0,
      });
      detalls.push(canvi);
      preview.noves.push(canvi);
      return;
    }

    idsEmparellats.add(existent.id);

    const campsCanviats = detallCanvisClasse(existent.data, classe);
    if (
      Number(existent.data.hores) !== Number(classe.hores) ||
      n(existent.data.tipus) !== n(classe.tipus) ||
      n(existent.data.curs) !== n(classe.curs) ||
      n(normalitzarGrup(existent.data.grup)) !== n(classe.grup) ||
      n(existent.data.materia) !== n(classe.materia) ||
      n(existent.data.departament) !== n(classe.departament) ||
      !existent.data.departaments
    ) {
      modificades++;
      const assignacio = resumAssignacio(existent.data);
      const canvi = crearCanviClasse('modificada', classe, {
        detall: campsCanviats.join(', '),
        assignacio,
        ambAssignacio: Boolean(assignacio),
        classeAbans: classePreview(existent.data),
        horesAbans: Number(existent.data.hores) || 0,
        horesDespres: Number(classe.hores) || 0,
      });
      detalls.push(canvi);
      preview.modificades.push(canvi);
      if (assignacio && campsCanviats.some((detall) => /Hores|Departament|Tipus/.test(detall))) {
        riscos.push({
          tipus: 'modificacio_assignada',
          severitat: 'avis',
          resum: canvi.resum,
          detall: `${canvi.detall}. Assignació existent: ${assignacio}`,
        });
      }
    }
  });

  const classesEliminades = existents.filter(
    (existent) => !idsEmparellats.has(existent.id)
  );
  classesEliminades.forEach((existent) => {
    const assignacio = resumAssignacio(existent.data);
    const canvi = crearCanviClasse('eliminada', existent.data, {
      assignacio,
      ambAssignacio: Boolean(assignacio),
      classeAbans: classePreview(existent.data),
      horesAbans: Number(existent.data.hores) || 0,
    });
    detalls.push(canvi);
    preview.eliminades.push(canvi);
    if (assignacio) {
      riscos.push({
        tipus: 'eliminacio_assignada',
        severitat: 'critic',
        resum: canvi.resum,
        detall: `S'eliminarà una classe amb assignació existent: ${assignacio}`,
      });
    }
  });

  const eliminades = classesEliminades.length;
  const totalCanvis = noves + eliminades + modificades;
  const resumAgrupat = resumAgrupatClasses(preview);

  return {
    totalSheets: classesSheets.length,
    totalApp: snapClasses.size,
    noves,
    eliminades,
    modificades,
    totalCanvis,
    detalls: detalls.slice(0, 30),
    preview,
    resumPerDepartament: resumAgrupat.departaments,
    resumPerMateria: resumAgrupat.materies,
    riscos,
    resumRiscos: {
      eliminadesAmbAssignacio: preview.eliminades.filter((item) => item.ambAssignacio).length,
      modificadesAmbAssignacio: preview.modificades.filter((item) => item.ambAssignacio).length,
    },
  };
}

async function calcularDiscrepanciesProfessors(cursId, professorsSheets) {
  const snapProfs = await getDocs(cc(cursId, 'professors'));
  const existentsPerNom = new Map(
    snapProfs.docs.map((d) => [n(d.data().nom), { id: d.id, data: d.data() }])
  );

  let noves = 0;
  let modificades = 0;
  let migracions = 0;
  const preview = {
    noves: [],
    modificades: [],
    migracions: [],
    conservatsForaFull: [],
  };

  professorsSheets.forEach((professor) => {
    const existent = existentsPerNom.get(n(professor.nom));
    if (!existent) {
      noves++;
      preview.noves.push({
        tipus: 'nou',
        resum: resumProfessorCanvi(professor),
      });
      return;
    }

    const detalls = detallCanvisProfessor(existent.data, professor);
    const migracio = Boolean(professor.codiUntis && existent.id !== professor.codiUntis);
    if (migracio) {
      migracions++;
      preview.migracions.push({
        tipus: 'migracio',
        resum: resumProfessorCanvi(professor),
        detall: [
          `ID Firestore: ${existent.id} -> ${professor.codiUntis}`,
          ...detalls.filter((detall) => !detall.startsWith('Codi Untis:')),
        ].join(', '),
      });
    } else if (
      detalls.length > 0
    ) {
      modificades++;
      preview.modificades.push({
        tipus: 'modificat',
        resum: resumProfessorCanvi(professor),
        detall: detalls.join(', '),
      });
    }
  });

  const nomsSheetsProfessors = new Set(professorsSheets.map((p) => n(p.nom)));
  snapProfs.docs.forEach((d) => {
    const data = d.data();
    if (!nomsSheetsProfessors.has(n(data.nom))) {
      preview.conservatsForaFull.push({
        tipus: 'conservat',
        resum: resumProfessorCanvi(data),
        detall: data.eliminatDelFull
          ? 'Ja marcat com a eliminat del full.'
          : 'No surt al full Professorat. Es marcarà com a eliminat (ocult).',
      });
    }
  });

  const eliminades = preview.conservatsForaFull.filter((p) => !p.detall.startsWith('Ja')).length;

  return {
    totalSheets: professorsSheets.length,
    totalApp: snapProfs.size,
    noves,
    modificades,
    eliminades,
    migracions,
    totalCanvis: noves + modificades + migracions + eliminades,
    preview,
  };
}

async function calcularDiscrepanciesDepartaments(cursId, professorsSheets) {
  const snapDeps = await getDocs(cc(cursId, 'departaments'));
  const nomsSheets = [...new Set(professorsSheets.flatMap((p) => departamentsProfessor(p)).filter(Boolean))].sort();
  const nomsSheetsNorm = new Set(nomsSheets.map(n));
  const existents = snapDeps.docs.map((d) => ({ id: d.id, data: d.data() }));
  const existentsNorm = new Set(existents.map((item) => n(item.data.nom)));

  const afegits = nomsSheets
    .filter((nom) => !existentsNorm.has(n(nom)))
    .map((nom) => ({ tipus: 'nou', resum: nom }));
  const eliminats = existents
    .filter((item) => !nomsSheetsNorm.has(n(item.data.nom)))
    .map((item) => ({
      tipus: 'eliminat',
      resum: item.data.nom || item.id,
      detall: 'El departament no surt al full Professorat.',
    }));

  return {
    totalSheets: nomsSheets.length,
    totalApp: snapDeps.size,
    afegits: afegits.length,
    eliminats: eliminats.length,
    modificades: 0,
    totalCanvis: afegits.length + eliminats.length,
    preview: { afegits, eliminats },
  };
}

export async function comprovarEstatActualitzacioSheets(cursId, options = {}) {
  if (E2E_AUTH_BYPASS) {
    return {
      desactualitzat: false,
      senseReferencia: false,
      origenCanviat: false,
      sheetsCanviat: false,
      signaturaActual: 'e2e',
      signaturaGuardada: 'e2e',
      totalClasses: getE2ECollection('classes').length,
      totalProfessors: getE2ECollection('professors').length,
      canvisClasses: resumCanvisBuit(),
      canvisProfessors: resumCanvisBuit(),
      ultimaSync: new Date().toISOString(),
      checkedAt: new Date().toISOString(),
    };
  }
  if (!cursId) {
    return {
      desactualitzat: false,
      senseReferencia: true,
      motiu: 'sense_curs',
      checkedAt: new Date().toISOString(),
    };
  }

  const sheetsId = options.sheetsId || DEFAULT_SHEETS_ID;
  const [stateSnap, estatFont] = await Promise.all([
    getDoc(syncStateRef(cursId)),
    llegirEstatFontSheets(sheetsId),
  ]);
  const estatGuardat = stateSnap.exists() ? stateSnap.data() : null;
  const signaturaGuardada = estatGuardat?.classesSignature || '';
  const signaturaProfessorsGuardada = estatGuardat?.professorsSignature || '';
  const signaturaCompletaGuardada = estatGuardat?.sourceSignature || '';
  const teReferencia = Boolean(signaturaCompletaGuardada || signaturaGuardada || signaturaProfessorsGuardada);
  const origenCanviat = Boolean(teReferencia && estatGuardat?.sheetsId && estatGuardat.sheetsId !== sheetsId);
  const classesCanviades = Boolean(signaturaGuardada && signaturaGuardada !== estatFont.signaturaClasses);
  const professorsCanviats = Boolean(signaturaProfessorsGuardada && signaturaProfessorsGuardada !== estatFont.signaturaProfessors);
  const signaturaCanviada = signaturaCompletaGuardada
    ? signaturaCompletaGuardada !== estatFont.signatura
    : classesCanviades || professorsCanviats;
  let senseReferencia = !teReferencia;
  let classes = resumCanvisBuit();
  let professors = resumCanvisBuit();
  let sheetsCanviat = signaturaCanviada;

  if ((senseReferencia || signaturaCanviada) && !origenCanviat) {
    [classes, professors] = await Promise.all([
      calcularDiscrepanciesClasses(cursId, estatFont.classes),
      calcularDiscrepanciesProfessors(cursId, estatFont.professors),
    ]);
    const departaments = await calcularDiscrepanciesDepartaments(cursId, estatFont.professors);
    sheetsCanviat = classes.totalCanvis + professors.totalCanvis + departaments.totalCanvis > 0;
    if (!sheetsCanviat) {
      try {
        await ajustarEstatFontSenseCanvis(cursId, estatFont);
        senseReferencia = false;
      } catch (error) {
        console.warn("No s'ha pogut ajustar l'estat de Google Sheets:", error);
        senseReferencia = false;
      }
    }
  }

  return {
    desactualitzat: origenCanviat || sheetsCanviat,
    senseReferencia,
    origenCanviat,
    sheetsCanviat,
    signaturaCanviada,
    signaturaActual: estatFont.signaturaClasses,
    signaturaGuardada,
    signaturaProfessorsActual: estatFont.signaturaProfessors,
    signaturaProfessorsGuardada,
    signaturaCompletaActual: estatFont.signatura,
    signaturaCompletaGuardada,
    sheetsId,
    sheetsIdGuardat: estatGuardat?.sheetsId || '',
    totalClasses: estatFont.totalClasses,
    totalProfessors: estatFont.totalProfessors,
    canvisClasses: classes,
    canvisProfessors: professors,
    ultimaSync: estatGuardat?.syncedAt || '',
    checkedAt: estatFont.checkedAt,
  };
}

export async function provarConnexioSheets(sheetsId) {
  try {
    const data = await llegirSheets(SHEET_CLASSES, sheetsId);
    if (data.status === 'error') {
      return { ok: false, error: data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || 'Error en llegir el full.' };
    }
    const rows = (data.table?.rows || [])
      .map((row) => ({ materia: row.c[2]?.v?.toString().trim() || '' }))
      .filter((r) => r.materia && r.materia.toLowerCase() !== 'materia');
    if (rows.length === 0) {
      return { ok: false, error: 'La pestanya "Classes" no té dades o no té el format esperat (CURS, GRUP, MATERIA, HORES, DEPARTAMENT, TIPUS).' };
    }
    return { ok: true, totalFiles: rows.length };
  } catch (err) {
    return { ok: false, error: err.message || 'Error de connexió' };
  }
}

export async function comprovarDiscrepancies(cursId, options = {}) {
  if (E2E_AUTH_BYPASS) {
    const classes = {
      totalSheets: getE2ECollection('classes').length,
      totalApp: getE2ECollection('classes').length,
      noves: 0,
      eliminades: 0,
      modificades: 0,
      totalCanvis: 0,
      detalls: [],
      preview: { noves: [], modificades: [], eliminades: [] },
      resumPerDepartament: [],
      resumPerMateria: [],
      riscos: [],
      resumRiscos: { eliminadesAmbAssignacio: 0, modificadesAmbAssignacio: 0 },
    };
    const professors = {
      totalSheets: getE2ECollection('professors').length,
      totalApp: getE2ECollection('professors').length,
      noves: 0,
      modificades: 0,
      eliminades: 0,
      migracions: 0,
      totalCanvis: 0,
      preview: { noves: [], modificades: [], migracions: [], conservatsForaFull: [] },
    };
    const departaments = {
      totalSheets: getE2ECollection('departaments').length,
      totalApp: getE2ECollection('departaments').length,
      afegits: 0,
      eliminats: 0,
      modificades: 0,
      totalCanvis: 0,
      preview: { afegits: [], eliminats: [] },
    };
    return {
      totalSheets: classes.totalSheets,
      totalApp: classes.totalApp,
      noves: 0,
      eliminades: 0,
      modificades: 0,
      totalCanvis: 0,
      detalls: [],
      classes,
      professors,
      departaments,
      riscos: [],
      alDia: true,
      timestamp: new Date().toISOString(),
    };
  }
  if (!cursId) {
    throw new Error('No hi ha cap curs actiu per comprovar la sincronització.');
  }
  const sheetsId = options.sheetsId || DEFAULT_SHEETS_ID;
  const estatFont = await llegirEstatFontSheets(sheetsId);
  return calcularResumCanvis(cursId, estatFont);
}

async function calcularResumCanvis(cursId, estatFont) {
  const [classes, professors, departaments] = await Promise.all([
    calcularDiscrepanciesClasses(cursId, estatFont.classes),
    calcularDiscrepanciesProfessors(cursId, estatFont.professors),
    calcularDiscrepanciesDepartaments(cursId, estatFont.professors),
  ]);
  const totalCanvis = classes.totalCanvis + professors.totalCanvis + departaments.totalCanvis;
  const riscos = classes.riscos || [];

  return {
    totalSheets: classes.totalSheets,
    totalApp: classes.totalApp,
    noves: classes.noves,
    eliminades: classes.eliminades,
    modificades: classes.modificades,
    totalCanvis,
    detalls: classes.detalls,
    classes,
    professors,
    departaments,
    riscos,
    alDia: totalCanvis === 0,
    timestamp: new Date().toISOString(),
  };
}

function limitarArray(items = [], limit = 30) {
  return items.slice(0, limit);
}

function limitarResumPerResultat(resum) {
  const classes = resum.classes || resumCanvisBuit();
  const professors = resum.professors || {};
  const departaments = resum.departaments || {};

  return {
    ...resum,
    detalls: limitarArray(resum.detalls || []),
    classes: {
      ...classes,
      detalls: limitarArray(classes.detalls || []),
      preview: {
        noves: limitarArray(classes.preview?.noves || []),
        modificades: limitarArray(classes.preview?.modificades || []),
        eliminades: limitarArray(classes.preview?.eliminades || []),
      },
      resumPerDepartament: limitarArray(classes.resumPerDepartament || []),
      resumPerMateria: limitarArray(classes.resumPerMateria || []),
    },
    professors: {
      ...professors,
      preview: {
        noves: limitarArray(professors.preview?.noves || []),
        modificades: limitarArray(professors.preview?.modificades || []),
        migracions: limitarArray(professors.preview?.migracions || []),
        conservatsForaFull: limitarArray(professors.preview?.conservatsForaFull || []),
      },
    },
    departaments: {
      ...departaments,
      preview: {
        afegits: limitarArray(departaments.preview?.afegits || []),
        eliminats: limitarArray(departaments.preview?.eliminats || []),
      },
    },
    riscos: limitarArray(resum.riscos || []),
  };
}

// Sincronitzacio principal

export async function sincronitzar(cursId, options = {}) {
  if (E2E_AUTH_BYPASS) {
    return {
      total: getE2ECollection('classes').length,
      afegides: 0,
      actualitzades: 0,
      eliminades: 0,
      assignacionsConservades: 0,
      depsAfegits: 0,
      depsEliminats: 0,
      profsAfegits: 0,
      profsMigrats: 0,
      totalDeps: getE2ECollection('departaments').length,
      totalProfs: getE2ECollection('professors').length,
      timestamp: new Date().toISOString(),
      historialGuardat: true,
      estatFontGuardat: true,
    };
  }
  const sheetsId = options.sheetsId || DEFAULT_SHEETS_ID;

  // 1. Activar Apps Script (per si ha de recalcular el full)
  try {
    await fetch(APPS_SCRIPT_URL, { mode: 'no-cors' });
    await new Promise((r) => setTimeout(r, 3000));
  } catch (_) {}

  // 2. Llegir Classes i Professorat des de Sheets
  const estatFont = await llegirEstatFontSheets(sheetsId);
  const resumCanvis = await calcularResumCanvis(cursId, estatFont);
  const resumResultat = limitarResumPerResultat(resumCanvis);
  const classesNoves = estatFont.classes;
  const professorsNous = estatFont.professors;

  // 4. Sincronitzar departaments
  const nomsDepNous = [...new Set(professorsNous.flatMap((p) => departamentsProfessor(p)))].sort();
  const nomsDepNousNorm = new Set(nomsDepNous.map(n));

  const snapDeps = await getDocs(cc(cursId, 'departaments'));
  const batchDeps = new BatchSplit();
  let depsAfegits = 0, depsEliminats = 0;

  snapDeps.docs.forEach((d) => {
    if (!nomsDepNousNorm.has(n(d.data().nom))) {
      batchDeps.delete(dd(cursId, 'departaments', d.id));
      depsEliminats++;
    }
  });
  const depsExistentsNorm = new Set(snapDeps.docs.map((d) => n(d.data().nom)));
  nomsDepNous.forEach((nom) => {
    if (!depsExistentsNorm.has(n(nom))) {
      batchDeps.set(dd(cursId, 'departaments'), { nom, updatedAt: new Date() });
      depsAfegits++;
    }
  });
  await batchDeps.commit();

  // 5. Sincronitzar professors
  const snapProfs = await getDocs(cc(cursId, 'professors'));
  const profsExistentsPerNom = new Map(
    snapProfs.docs.map((d) => [n(d.data().nom), { id: d.id, data: d.data() }])
  );

  const batchProfs = new BatchSplit();
  let profsAfegits = 0, profsMigrats = 0, profsEliminats = 0;
  const idsEliminatsMigracio = new Set();
  const nomsSheets = new Set(professorsNous.map((p) => n(p.nom)));

  professorsNous.forEach((prof) => {
    const existent = profsExistentsPerNom.get(n(prof.nom));
    const departaments = departamentsProfessor(prof);
    const campsFixos = {
      nom: prof.nom,
      departament: departaments[0] || '',
      departaments,
      jornada: prof.jornada,
      codiUntis: prof.codiUntis,
      idGestib: prof.idGestib || '',
      comentariFull: prof.comentariFull || '',
      eliminatDelFull: false,
      updatedAt: new Date(),
    };

    if (prof.codiUntis) {
      const novaRef = dd(cursId, 'professors', prof.codiUntis);
      if (!existent) {
        batchProfs.set(novaRef, {
          ...campsFixos,
          preferencia: '', motiuAllegat: '', comentaris: '',
          gpAssignades: 0, gcAssignades: 0, palicAssignades: 0, sdAssignades: 0, sdAssignacions: [], ddAssignades: 0, ddAssignacions: [],
        });
        profsAfegits++;
      } else if (existent.id === prof.codiUntis) {
        batchProfs.update(novaRef, campsFixos);
      } else {
        batchProfs.set(novaRef, {
          ...campsFixos,
          preferencia: existent.data.preferencia || '',
          motiuAllegat: existent.data.motiuAllegat || '',
          comentaris: existent.data.comentaris || '',
          gpAssignades: existent.data.gpAssignades || 0,
          gcAssignades: existent.data.gcAssignades || 0,
          palicAssignades: existent.data.palicAssignades || 0,
          sdAssignades: existent.data.sdAssignades || 0,
          sdAssignacions: existent.data.sdAssignacions || [],
          ddAssignades: existent.data.ddAssignades || 0,
          ddAssignacions: existent.data.ddAssignacions || [],
        });
        batchProfs.delete(dd(cursId, 'professors', existent.id));
        idsEliminatsMigracio.add(existent.id);
        profsMigrats++;
      }
    } else {
      if (!existent) {
        batchProfs.set(dd(cursId, 'professors'), {
          ...campsFixos,
          preferencia: '', motiuAllegat: '', comentaris: '',
          gpAssignades: 0, gcAssignades: 0, palicAssignades: 0, sdAssignades: 0, sdAssignacions: [], ddAssignades: 0, ddAssignacions: [],
        });
        profsAfegits++;
      } else {
        batchProfs.update(dd(cursId, 'professors', existent.id), campsFixos);
      }
    }
  });

  // Professors que ja no surten al full → marcar com a eliminats (soft delete)
  snapProfs.docs.forEach((d) => {
    if (!nomsSheets.has(n(d.data().nom)) && !idsEliminatsMigracio.has(d.id)) {
      if (!d.data().eliminatDelFull) {
        batchProfs.update(d.ref, { eliminatDelFull: true });
        profsEliminats++;
      }
    }
  });

  await batchProfs.commit();

  // 6. Sincronitzar classes
  const snapClasses = await getDocs(cc(cursId, 'classes'));

  const existents = snapClasses.docs.map((d) => ({
    id: d.id,
    ref: d.ref,
    data: d.data(),
  }));

  const perClauUnica = new Map();
  // perClauBase conserva assignacions si canvia departament o tipus
  const perClauBase = new Map();

  existents.forEach((item) => {
    const data = item.data;
    afegirAIndex(perClauUnica, clauUnica(data), item);
    afegirAIndex(perClauBase, clauBase(data), item);
  });
  ordenarIndexPerAssignacio(perClauUnica);
  ordenarIndexPerAssignacio(perClauBase);

  const batchClasses = new BatchSplit();
  let afegides = 0, actualitzades = 0, eliminades = 0, assignacionsConservades = 0;
  const idsEmparellats = new Set();

  classesNoves.forEach((classe) => {
    const cu = clauUnica(classe);
    const cb = clauBase(classe);
    const exacte = trobarNoEmparellat(perClauUnica, cu, idsEmparellats);
    const equivalent = trobarNoEmparellat(perClauBase, cb, idsEmparellats);
    const existent = exacte || equivalent || null;

    if (existent) {
      idsEmparellats.add(existent.id);

      const horesCanviat = Number(existent.data.hores) !== Number(classe.hores);
      const tipusCanviat = n(existent.data.tipus) !== n(classe.tipus);
      const cursCanviat = n(existent.data.curs) !== n(classe.curs);
      const grupCanviat = n(normalitzarGrup(existent.data.grup)) !== n(classe.grup);
      const materiaCanviat = n(existent.data.materia) !== n(classe.materia);
      const departamentCanviat = n(existent.data.departament) !== n(classe.departament);
      const faltaDepartaments = !existent.data.departaments;
      const assignacionsNetejades = netejarAssignacionsProfessorsEliminats(existent.data, nomsSheets);

      if (
        horesCanviat ||
        tipusCanviat ||
        cursCanviat ||
        grupCanviat ||
        materiaCanviat ||
        departamentCanviat ||
        faltaDepartaments ||
        assignacionsNetejades
      ) {
        batchClasses.update(dd(cursId, 'classes', existent.id), {
          curs: classe.curs,
          grup: classe.grup,
          materia: classe.materia,
          hores: classe.hores,
          tipus: classe.tipus,
          departament: classe.departament,
          departaments: [classe.departament],
          ...(assignacionsNetejades || {}),
          updatedAt: new Date(),
        });
        actualitzades++;
      }

      if (!exacte && equivalent) assignacionsConservades++;
    } else {
      batchClasses.set(dd(cursId, 'classes'), {
        ...classe,
        departaments: [classe.departament],
        professors: [],
        professorAssignat: '',
        participants: [],
        updatedAt: new Date(),
      });
      afegides++;
    }
  });

  existents.forEach((existent) => {
    if (!idsEmparellats.has(existent.id)) {
      batchClasses.delete(existent.ref);
      eliminades++;
    }
  });

  await batchClasses.commit();

  // 7. Pre-autoritzar professors amb email (columnes EMAIL i ROL del full Professorat)
  const preautoritzats = professorsNous
    .filter((p) => p.email)
    .map((p) => ({ ...p, rol: ROLS_VALIDS.has(p.rol) ? p.rol : 'professor' }));

  // Guard: only sync if we actually have emails — avoids wiping everything if the column is empty.
  if (preautoritzats.length > 0) {
    const snapPre = await getDocs(collection(db, 'preautoritzats'));
    const emailsNous = new Set(preautoritzats.map((p) => p.email));
    for (const d of snapPre.docs) {
      if (!emailsNous.has(d.id)) await deleteDoc(d.ref);
    }
    for (const p of preautoritzats) {
      await setDoc(doc(db, 'preautoritzats', p.email), {
        email: p.email,
        rol: p.rol,
        departament: p.departament || null,
        departaments: departamentsProfessor(p),
        updatedAt: new Date(),
      });
    }
  }

  const resultat = {
    total: classesNoves.length,
    afegides,
    actualitzades,
    eliminades,
    assignacionsConservades,
    depsAfegits,
    depsEliminats,
    profsAfegits,
    profsMigrats,
    profsEliminats,
    totalDeps: nomsDepNous.length,
    totalProfs: professorsNous.length,
    totalCanvis: resumCanvis.totalCanvis,
    detalls: resumResultat.detalls,
    classes: resumResultat.classes,
    professors: resumResultat.professors,
    departaments: resumResultat.departaments,
    riscos: resumResultat.riscos,
    alDia: true,
    timestamp: new Date().toISOString(),
  };

  try {
    await guardarEstatFontSincronitzada(cursId, estatFont, resultat, options.actor);
    resultat.estatFontGuardat = true;
  } catch (error) {
    console.warn("No s'ha pogut guardar l'estat de sincronitzacio:", error);
    resultat.estatFontGuardat = false;
    resultat.errorEstatFont = error.message;
  }

  try {
    await guardarHistorialSincronitzacio(cursId, resultat, options.actor);
    resultat.historialGuardat = true;
  } catch (error) {
    console.warn("No s'ha pogut guardar l'historial de sincronització:", error);
    resultat.historialGuardat = false;
    resultat.errorHistorial = error.message;
  }

  return resultat;
}
