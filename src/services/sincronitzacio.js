import { db } from '../firebase';
import { collection, writeBatch, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { normalitzarJornada } from '../utils/horesProfessor';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbykQQXn6_oZ1iTtkASuHSA1P1kr5eSqGlIEdm5IBfuxSvr0wDh2I6Ec_yjILnHCXDKe/exec';
export const DEFAULT_SHEETS_ID = '1uKYDn_2-KyHVJrlfLAHWvZ-YvPIRpv2SlSDUhdQfnA0';
const SHEET_CLASSES = 'Classes';
const SHEET_PROFESSORAT = 'Professorat';
const SYNC_STATE_DOC = 'sync_state';

// Helpers

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
  return (data.table?.rows || [])
    .map((row) => ({
      nom:          valorCel(row, 0),
      departament: valorCel(row, 1),
      jornada:      normalitzarJornada(valorCel(row, 2)),
      codiUntis:    valorCel(row, 3),
      email:        completarEmail(valorCel(row, 4)),
      rol:          valorCel(row, 5),
    }))
    .filter((p) => p.nom && n(p.nom) !== 'nom' && p.departament);
}

function textSignatura(valor) {
  return (valor ?? '').toString().trim();
}

function signaturaDadesSheets(classes, professors) {
  const filesClasses = classes
    .map((c) => [
      textSignatura(c.curs),
      textSignatura(normalitzarGrup(c.grup)),
      textSignatura(c.materia),
      Number(c.hores) || 0,
      textSignatura(c.departament),
      textSignatura(c.tipus),
    ].join('\u001f'))
    .sort();

  const filesProfessors = professors
    .map((p) => [
      textSignatura(p.nom),
      textSignatura(p.departament),
      textSignatura(p.jornada),
      textSignatura(p.codiUntis),
      textSignatura(p.email),
      textSignatura(p.rol),
    ].join('\u001f'))
    .sort();

  return hashText(JSON.stringify({ classes: filesClasses, professors: filesProfessors }));
}

// Clau completa: per detectar coincidències exactes
function clauUnica(c) {
  return `${n(c.curs)}|${n(normalitzarGrup(c.grup))}|${n(c.materia)}|${n(c.departament)}|${n(c.tipus)}`;
}

// Clau base: curs+grup+materia, per recuperar assignació quan canvia dept o tipus
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
  return Boolean(data.professorAssignat || data.professors?.length);
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

// Batch amb auto-split (limit Firestore: 500 ops)

class BatchSplit {
  constructor() {
    this._batches = [writeBatch(db)];
    this._count = 0;
  }

  _current() {
    if (this._count >= 450) {
      this._batches.push(writeBatch(db));
      this._count = 0;
    }
    return this._batches[this._batches.length - 1];
  }

  delete(ref) { this._current().delete(ref); this._count++; }
  set(ref, data) { this._current().set(ref, data); this._count++; }
  update(ref, data) { this._current().update(ref, data); this._count++; }

  async commit() {
    for (const b of this._batches) await b.commit();
  }
}

async function guardarHistorialSincronitzacio(cursId, resultat, actor) {
  await addDoc(collection(db, 'cursos', cursId, 'sync_history'), {
    ...resultat,
    actor: actor || 'admin',
    createdAt: new Date().toISOString(),
  });
}

// Helpers per subcol.leccions de curs

function cc(cursId, nom) { return collection(db, 'cursos', cursId, nom); }
function dd(cursId, nom, id) { return id ? doc(db, 'cursos', cursId, nom, id) : doc(cc(cursId, nom)); }
function syncStateRef(cursId) { return doc(db, 'cursos', cursId, 'config', SYNC_STATE_DOC); }

// Lectura de Sheets

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
    totalClasses: classes.length,
    totalProfessors: professors.length,
    checkedAt: new Date().toISOString(),
  };
}

export function subscribeEstatSincronitzacio(cursId, callback, onError = console.error) {
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
  return { noves: 0, modificades: 0, eliminades: 0, totalCanvis: 0 };
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
      return;
    }

    idsEmparellats.add(existent.id);

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
    }
  });

  const eliminades = existents.filter(
    (existent) => !idsEmparellats.has(existent.id)
  ).length;

  return {
    totalSheets: classesSheets.length,
    totalApp: snapClasses.size,
    noves,
    eliminades,
    modificades,
    totalCanvis: noves + eliminades + modificades,
  };
}

async function calcularDiscrepanciesProfessors(cursId, professorsSheets) {
  const snapProfs = await getDocs(cc(cursId, 'professors'));
  const existentsPerNom = new Map(
    snapProfs.docs.map((d) => [n(d.data().nom), d.data()])
  );

  let noves = 0;
  let modificades = 0;

  professorsSheets.forEach((professor) => {
    const existent = existentsPerNom.get(n(professor.nom));
    if (!existent) {
      noves++;
      return;
    }

    if (
      n(existent.departament) !== n(professor.departament) ||
      n(existent.jornada) !== n(professor.jornada) ||
      n(existent.codiUntis) !== n(professor.codiUntis)
    ) {
      modificades++;
    }
  });

  return {
    totalSheets: professorsSheets.length,
    totalApp: snapProfs.size,
    noves,
    modificades,
    eliminades: 0,
    totalCanvis: noves + modificades,
  };
}

export async function comprovarEstatActualitzacioSheets(cursId, options = {}) {
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
  const signaturaGuardada = estatGuardat?.sourceSignature || '';
  const origenCanviat = Boolean(signaturaGuardada && estatGuardat?.sheetsId && estatGuardat.sheetsId !== sheetsId);
  const signaturaCanviada = Boolean(signaturaGuardada && signaturaGuardada !== estatFont.signatura);
  const senseReferencia = !signaturaGuardada;
  let classes = resumCanvisBuit();
  let professors = resumCanvisBuit();
  let sheetsCanviat = signaturaCanviada;

  if (signaturaCanviada && !origenCanviat) {
    [classes, professors] = await Promise.all([
      calcularDiscrepanciesClasses(cursId, estatFont.classes),
      calcularDiscrepanciesProfessors(cursId, estatFont.professors),
    ]);
    sheetsCanviat = classes.totalCanvis > 0 || professors.totalCanvis > 0;
    if (!sheetsCanviat) {
      try {
        await ajustarEstatFontSenseCanvis(cursId, estatFont);
      } catch (error) {
        console.warn("No s'ha pogut ajustar l'estat de Google Sheets:", error);
      }
    }
  }

  return {
    desactualitzat: origenCanviat || sheetsCanviat,
    senseReferencia,
    origenCanviat,
    sheetsCanviat,
    signaturaCanviada,
    signaturaActual: estatFont.signatura,
    signaturaGuardada,
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

// Sincronitzacio principal

// Comprovacio de discrepancies (sense escriure)

export async function comprovarDiscrepancies(cursId, options = {}) {
  const sheetsId = options.sheetsId || DEFAULT_SHEETS_ID;
  const jsonClasses = await llegirSheets(SHEET_CLASSES, sheetsId);
  const classesSheets = llegirClassesDeResposta(jsonClasses);

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
    const existent =
      exacte || equivalent || null;

    if (!existent) {
      noves++;
      return;
    }

    idsEmparellats.add(existent.id);

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
    }
  });

  const eliminades = existents.filter(
    (existent) => !idsEmparellats.has(existent.id)
  ).length;

  return {
    totalSheets: classesSheets.length,
    totalApp: snapClasses.size,
    noves,
    eliminades,
    modificades,
    alDia: noves === 0 && eliminades === 0 && modificades === 0,
    timestamp: new Date().toISOString(),
  };
}

// Sincronitzacio principal

export async function sincronitzar(cursId, options = {}) {
  const sheetsId = options.sheetsId || DEFAULT_SHEETS_ID;

  // 1. Activar Apps Script (per si ha de recalcular el full)
  try {
    await fetch(APPS_SCRIPT_URL, { mode: 'no-cors' });
    await new Promise((r) => setTimeout(r, 3000));
  } catch (_) {}

  // 2. Llegir Classes i Professorat des de Sheets
  const estatFont = await llegirEstatFontSheets(sheetsId);
  const classesNoves = estatFont.classes;
  const professorsNous = estatFont.professors;

  // 4. Sincronitzar departaments
  const nomsDepNous = [...new Set(professorsNous.map((p) => p.departament))].sort();
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
  let profsAfegits = 0, profsMigrats = 0;

  professorsNous.forEach((prof) => {
    const existent = profsExistentsPerNom.get(n(prof.nom));
    const campsFixos = {
      nom: prof.nom,
      departament: prof.departament,
      jornada: prof.jornada,
      codiUntis: prof.codiUntis,
      updatedAt: new Date(),
    };

    if (prof.codiUntis) {
      const novaRef = dd(cursId, 'professors', prof.codiUntis);
      if (!existent) {
        batchProfs.set(novaRef, {
          ...campsFixos,
          preferencia: '', motiuAllegat: '', comentaris: '',
          gpAssignades: 0, palicAssignades: 0,
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
          palicAssignades: existent.data.palicAssignades || 0,
        });
        batchProfs.delete(dd(cursId, 'professors', existent.id));
        profsMigrats++;
      }
    } else {
      if (!existent) {
        batchProfs.set(dd(cursId, 'professors'), {
          ...campsFixos,
          preferencia: '', motiuAllegat: '', comentaris: '',
          gpAssignades: 0, palicAssignades: 0,
        });
        profsAfegits++;
      } else {
        batchProfs.update(dd(cursId, 'professors', existent.id), campsFixos);
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

  // Index per clauUnica (match exacte)
  const perClauUnica = new Map();
  // Index per clauBase (curs+grup+materia), per conservar assignacions si canvia dept o tipus.
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

  // Primer emparellam i actualitzam. Les assignacions no es toquen.
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

      if (
        horesCanviat ||
        tipusCanviat ||
        cursCanviat ||
        grupCanviat ||
        materiaCanviat ||
        departamentCanviat ||
        faltaDepartaments
      ) {
        batchClasses.update(dd(cursId, 'classes', existent.id), {
          curs: classe.curs,
          grup: classe.grup,
          materia: classe.materia,
          hores: classe.hores,
          tipus: classe.tipus,
          departament: classe.departament,
          departaments: [classe.departament],
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

  // Finalment eliminam només allò que no s'ha emparellat amb cap fila del full.
  existents.forEach((existent) => {
    if (!idsEmparellats.has(existent.id)) {
      batchClasses.delete(existent.ref);
      eliminades++;
    }
  });

  await batchClasses.commit();

  // 7. Sincronitzar usuaris pre-autoritzats (columnes EMAIL i ROL del full Professorat)
  // Tots els professors amb email → preautoritzats. Rol per defecte: 'professor'.
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
    totalDeps: nomsDepNous.length,
    totalProfs: professorsNous.length,
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
