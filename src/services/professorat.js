// Escriptures de la pàgina Professorat (Quota com a font del professorat, sense la
// pestanya del full). Cada canvi deixa coherents la fitxa, les classes (que guarden el
// professorat pel nom), els permisos d'accés, els departaments i el directori de Guàrdies.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BatchSplit } from '../utils/firestoreBatch';
import { academicCourseIdForDate } from '../utils/academicCourse';
import {
  campsFitxa,
  canvisClassePerNom,
  completarEmail,
  esActiu,
  fitxaPerCopiar,
  planDepartaments,
  planPermisos,
  planUsuaris,
  planificacioBuida,
  planificacioPlaca,
  treuAdministracioPropia,
} from '../utils/professorat';
import { subscribeAppSettings, updateAppSettings } from './appSettings';
import { E2E_AUTH_BYPASS, getE2ECollection } from './e2e';

const professorsRef = (cursId) => collection(db, 'cursos', cursId, 'professors');
const classesRef = (cursId) => collection(db, 'cursos', cursId, 'classes');
const departamentsRef = (cursId) => collection(db, 'cursos', cursId, 'departaments');
const preautoritzatsRef = () => collection(db, 'preautoritzats');
const usuarisRef = () => collection(db, 'usuaris');
const directoriVersionRef = (cursId) => doc(db, 'cursos', cursId, 'guardies', 'directoriVersion');

const ambId = (d) => ({ id: d.id, ...d.data() });
const ara = () => new Date();

// Els permisos d'accés són globals: només els canvia el curs vigent, perquè preparar
// el curs següent no tregui l'accés a ningú abans d'hora.
export function esCursVigent(cursId, data = new Date()) {
  return cursId === academicCourseIdForDate(data);
}

// ---------------------------------------------------------------------------
// Mode de prova (E2E): tot en memòria.

let memoria = null;
const oients = new Set();

function memoriaE2E() {
  if (!memoria) {
    memoria = {
      professors: getE2ECollection('professors').map((professor) => ({ eliminatDelFull: false, ...professor })),
      preautoritzats: [],
      usuaris: getE2ECollection('usuaris'),
      departaments: getE2ECollection('departaments'),
      gestioAQuota: false,
    };
  }
  return memoria;
}

function notificaE2E() {
  oients.forEach((oient) => oient());
}

function subscriuE2E(llegir, callback) {
  const oient = () => callback(llegir(memoriaE2E()));
  oients.add(oient);
  oient();
  return () => oients.delete(oient);
}

function desaE2E(id, dades, { nou = false } = {}) {
  const estat = memoriaE2E();
  const index = estat.professors.findIndex((professor) => professor.id === id);
  if (nou || index < 0) estat.professors.push({ id, ...dades });
  else estat.professors[index] = { ...estat.professors[index], ...dades };
  const { afegir, eliminar } = planDepartaments(estat.professors, estat.departaments);
  estat.departaments = [
    ...estat.departaments.filter((dep) => !eliminar.includes(dep.id)),
    ...afegir.map((nom) => ({ id: `e2e-dep-${nom}`, nom })),
  ];
  notificaE2E();
}

// ---------------------------------------------------------------------------
// Lectura en temps real.

export function subscriureProfessorat(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) return subscriuE2E((estat) => estat.professors.map((p) => ({ ...p })), callback);
  if (!cursId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(professorsRef(cursId), (snap) => callback(snap.docs.map(ambId)), onError);
}

export function subscriurePermisos(callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) return subscriuE2E((estat) => estat.preautoritzats.map((p) => ({ ...p })), callback);
  return onSnapshot(preautoritzatsRef(), (snap) => callback(snap.docs.map(ambId)), onError);
}

// Si el professorat ja es gestiona des de Quota (i no des de la pestaña del full).
export function subscriureGestioProfessorat(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) return subscriuE2E((estat) => estat.gestioAQuota, callback);
  return subscribeAppSettings(cursId, (settings) => callback(Boolean(settings.professoratAQuota)), onError);
}

// ---------------------------------------------------------------------------
// Efectes de cada canvi.

async function llegirProfessors(cursId) {
  return (await getDocs(professorsRef(cursId))).docs.map(ambId);
}

// Classes on surt el nom antic: professors, participants i professor assignat. També
// la fa servir la sincronització quan algú ocupa una plaça (vacant o titular de baixa).
export async function reanomenarAClasses(cursId, nomAntic, nomNou) {
  if (!nomAntic || !nomNou || nomAntic === nomNou) return 0;
  const consultes = await Promise.all([
    getDocs(query(classesRef(cursId), where('professors', 'array-contains', nomAntic))),
    getDocs(query(classesRef(cursId), where('participants', 'array-contains', nomAntic))),
    getDocs(query(classesRef(cursId), where('professorAssignat', '==', nomAntic))),
  ]);
  const classes = new Map(consultes.flatMap((snap) => snap.docs).map((d) => [d.id, d]));
  const batch = new BatchSplit();
  let canviades = 0;
  classes.forEach((d) => {
    const canvis = canvisClassePerNom(d.data(), nomAntic, nomNou);
    if (!canvis) return;
    batch.update(d.ref, canvis);
    canviades += 1;
  });
  if (canviades) await batch.commit();
  return canviades;
}

// Només els permisos dels correus indicats (l'antic i el nou d'una fitxa).
async function actualitzarPermisosDe(cursId, emails, professors) {
  const objectius = [...new Set(emails.map(completarEmail).filter(Boolean))];
  if (!objectius.length || !esCursVigent(cursId)) return { escrits: 0, esborrats: 0, omesos: !esCursVigent(cursId) };
  const actuals = await Promise.all(objectius.map(async (email) => {
    const snap = await getDoc(doc(preautoritzatsRef(), email));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }));
  const professorsObjectiu = professors.filter((professor) => objectius.includes(completarEmail(professor.email)));
  const pla = planPermisos(professorsObjectiu, actuals.filter(Boolean));
  const batch = new BatchSplit();
  pla.escriure.forEach((permis) => batch.set(doc(preautoritzatsRef(), permis.email), { ...permis, updatedAt: ara() }));
  pla.esborrar.forEach((email) => batch.delete(doc(preautoritzatsRef(), email)));
  if (pla.escriure.length || pla.esborrar.length) await batch.commit();
  return { escrits: pla.escriure.length, esborrats: pla.esborrar.length, omesos: false };
}

// La còpia del rol a les fitxes d'usuari d'aquests correus (vegeu planUsuaris): dar o
// treure un rol s'aplica de seguida a totes les aplicacions, no quan la persona torni a
// entrar a Quota.
async function actualitzarUsuarisDe(cursId, emails, professors, sessio) {
  const objectius = [...new Set(emails.map(completarEmail).filter(Boolean))];
  if (!objectius.length || !esCursVigent(cursId)) return 0;
  const snap = await getDocs(query(usuarisRef(), where('email', 'in', objectius)));
  const canvis = planUsuaris(snap.docs.map(ambId), professors, { actorEmail: sessio?.email });
  if (!canvis.length) return 0;
  const batch = new BatchSplit();
  canvis.forEach((canvi) => batch.update(doc(usuarisRef(), canvi.uid), { ...canvi.nou, updatedAt: ara() }));
  await batch.commit();
  return canvis.length;
}

async function actualitzarDepartaments(cursId, professors) {
  const deps = await getDocs(departamentsRef(cursId));
  // Mai no es buida la llista per una lectura incompleta.
  if (!professors.some(esActiu)) return;
  const { afegir, eliminar } = planDepartaments(professors, deps.docs.map(ambId));
  if (!afegir.length && !eliminar.length) return;
  const batch = new BatchSplit();
  afegir.forEach((nom) => batch.set(doc(departamentsRef(cursId)), { nom, updatedAt: ara() }));
  eliminar.forEach((id) => batch.delete(doc(departamentsRef(cursId), id)));
  await batch.commit();
}

// Guàrdies guarda el directori en memòria cau: aquest document li diu que el refresqui.
async function avisarGuardies(cursId) {
  await setDoc(directoriVersionRef(cursId), { version: Date.now(), updatedAt: serverTimestamp(), updatedBy: '' });
}

// Els efectes secundaris no han de fer perdre la fitxa ja desada: es recullen com a avisos.
// reanomenaments: [[nomAntic, nomNou]] — canvi de nom o traspàs de les classes d'una plaça.
async function efectes(cursId, { emails = [], reanomenaments = [], sessio = null } = {}) {
  const avisos = [];
  const resultat = { classesReanomenades: 0, permisos: null, usuaris: 0 };
  for (const [nomAntic, nomNou] of reanomenaments) {
    try {
      resultat.classesReanomenades += await reanomenarAClasses(cursId, nomAntic, nomNou);
    } catch (error) {
      avisos.push(`No s'han pogut passar les classes de ${nomAntic} a ${nomNou}: ${error.message}`);
    }
  }
  let professors = null;
  try {
    professors = await llegirProfessors(cursId);
  } catch (error) {
    avisos.push(`No s'ha pogut llegir el professorat per actualitzar els permisos: ${error.message}`);
  }
  if (professors) {
    try {
      resultat.permisos = await actualitzarPermisosDe(cursId, emails, professors);
    } catch (error) {
      avisos.push(`No s'han pogut actualitzar els permisos d'accés: ${error.message}`);
    }
    try {
      resultat.usuaris = await actualitzarUsuarisDe(cursId, emails, professors, sessio);
    } catch (error) {
      avisos.push(`No s'ha pogut aplicar el rol als comptes que ja havien entrat: ${error.message}`);
    }
  }
  try {
    if (professors) await actualitzarDepartaments(cursId, professors);
  } catch (error) {
    avisos.push(`No s'ha pogut actualitzar la llista de departaments: ${error.message}`);
  }
  try {
    await avisarGuardies(cursId);
  } catch (error) {
    avisos.push(`Guàrdies no s'ha pogut avisar del canvi: ${error.message}`);
  }
  return { ...resultat, avisos };
}

// ---------------------------------------------------------------------------
// Operacions de la pàgina.

const metadades = (actor) => ({ updatedAt: ara(), updatedBy: actor || 'admin' });

// sessio: { email, rol } de qui fa el canvi. Ningú no es pot treure l'administració a si mateix.
function comprovaAdministracioPropia(sessio, abans, despres) {
  if (treuAdministracioPropia({ sessio, abans, despres })) {
    throw new Error("No et pots treure l'administració a tu mateix/a. Demana-ho a una altra persona de l'administració.");
  }
}

// En mode de prova, la còpia del rol de les fitxes d'usuari es manté en memòria.
function actualitzarUsuarisE2E(emails, sessio) {
  const estat = memoriaE2E();
  const objectius = new Set(emails.map(completarEmail).filter(Boolean));
  const afectats = estat.usuaris.filter((usuari) => objectius.has(completarEmail(usuari.email)));
  const canvis = planUsuaris(afectats, estat.professors, { actorEmail: sessio?.email });
  canvis.forEach((canvi) => Object.assign(estat.usuaris.find((usuari) => usuari.id === canvi.uid), canvi.nou));
  if (canvis.length) notificaE2E();
}

export async function desarProfessor({ cursId, professor = null, form, actor, sessio = null }) {
  const fitxa = campsFitxa(form);
  comprovaAdministracioPropia(sessio, professor, { ...(professor || { eliminatDelFull: false }), ...fitxa });
  if (E2E_AUTH_BYPASS) {
    const id = professor?.id || `e2e-prof-${Date.now()}`;
    desaE2E(id, { ...fitxa, ...(professor ? {} : { eliminatDelFull: false, ...planificacioBuida() }) }, { nou: !professor });
    actualitzarUsuarisE2E([professor?.email, fitxa.email], sessio);
    return { id, avisos: [] };
  }
  const ref = professor ? doc(professorsRef(cursId), professor.id) : doc(professorsRef(cursId));
  if (professor) {
    const batch = new BatchSplit();
    batch.update(ref, { ...fitxa, ...metadades(actor) });
    await batch.commit();
  } else {
    await setDoc(ref, {
      ...fitxa,
      preferencia: '', motiuAllegat: '', comentaris: '',
      ...planificacioBuida(),
      eliminatDelFull: false,
      createdAt: ara(),
      ...metadades(actor),
    });
  }
  const resultat = await efectes(cursId, {
    emails: [professor?.email, fitxa.email],
    reanomenaments: professor ? [[professor.nom, fitxa.nom]] : [],
    sessio,
  });
  return { id: ref.id, ...resultat };
}

export async function desactivarProfessor({ cursId, professor, motiu, actor, sessio = null }) {
  comprovaAdministracioPropia(sessio, professor, { ...professor, eliminatDelFull: true });
  const canvis = {
    eliminatDelFull: true,
    desactivatAt: ara().toISOString(),
    desactivatPer: actor || 'admin',
    motiuBaixa: motiu || 'Altres',
  };
  if (E2E_AUTH_BYPASS) {
    desaE2E(professor.id, canvis);
    actualitzarUsuarisE2E([professor.email], sessio);
    return { avisos: [] };
  }
  const batch = new BatchSplit();
  batch.update(doc(professorsRef(cursId), professor.id), { ...canvis, ...metadades(actor) });
  await batch.commit();
  return efectes(cursId, { emails: [professor.email], sessio });
}

// Torna a l'actiu. Si hi ha un substitut a la seva plaça, se'l pot desactivar i
// retornar-li la planificació actual de la plaça.
export async function reactivarProfessor({ cursId, professor, substitut = null, retornarPlaca = false, actor, sessio = null }) {
  if (substitut && retornarPlaca) comprovaAdministracioPropia(sessio, substitut, { ...substitut, eliminatDelFull: true });
  const canvis = {
    eliminatDelFull: false,
    desactivatAt: null,
    desactivatPer: null,
    motiuBaixa: '',
    substituitPer: null,
    substitutId: null,
    ...(substitut && retornarPlaca ? planificacioPlaca(substitut) : {}),
  };
  const canvisSubstitut = substitut && retornarPlaca ? {
    eliminatDelFull: true,
    desactivatAt: ara().toISOString(),
    desactivatPer: actor || 'admin',
    motiuBaixa: 'Fi de la substitució',
  } : null;
  if (E2E_AUTH_BYPASS) {
    desaE2E(professor.id, canvis);
    if (canvisSubstitut) desaE2E(substitut.id, canvisSubstitut);
    actualitzarUsuarisE2E([professor.email, canvisSubstitut ? substitut.email : ''], sessio);
    return { avisos: [] };
  }
  const batch = new BatchSplit();
  batch.update(doc(professorsRef(cursId), professor.id), { ...canvis, ...metadades(actor) });
  if (canvisSubstitut) batch.update(doc(professorsRef(cursId), substitut.id), { ...canvisSubstitut, ...metadades(actor) });
  await batch.commit();
  return efectes(cursId, {
    emails: [professor.email, canvisSubstitut ? substitut.email : ''],
    // El titular recupera les classes de la plaça.
    reanomenaments: canvisSubstitut ? [[substitut.nom, professor.nom]] : [],
    sessio,
  });
}

// Alta d'un substitut a la plaça del titular, que passa a Anteriors.
export async function substituirProfessor({ cursId, titular, form, traspassarPlaca = true, motiu = 'Baixa', actor, sessio = null }) {
  const fitxa = campsFitxa(form);
  comprovaAdministracioPropia(sessio, titular, { ...titular, eliminatDelFull: true });
  comprovaAdministracioPropia(sessio, null, { ...fitxa, eliminatDelFull: false });
  const ref = E2E_AUTH_BYPASS ? { id: `e2e-prof-${Date.now()}` } : doc(professorsRef(cursId));
  const substitut = {
    ...fitxa,
    preferencia: '', motiuAllegat: '', comentaris: '',
    ...(traspassarPlaca ? planificacioPlaca(titular) : planificacioBuida()),
    substitueixA: titular.id,
    eliminatDelFull: false,
  };
  const canvisTitular = {
    eliminatDelFull: true,
    desactivatAt: ara().toISOString(),
    desactivatPer: actor || 'admin',
    motiuBaixa: motiu || 'Baixa',
    substituitPer: fitxa.nom,
    substitutId: ref.id,
  };
  if (E2E_AUTH_BYPASS) {
    desaE2E(ref.id, substitut, { nou: true });
    desaE2E(titular.id, canvisTitular);
    actualitzarUsuarisE2E([titular.email, fitxa.email], sessio);
    return { id: ref.id, avisos: [] };
  }
  const batch = new BatchSplit();
  batch.set(ref, { ...substitut, createdAt: ara(), ...metadades(actor) });
  batch.update(doc(professorsRef(cursId), titular.id), { ...canvisTitular, ...metadades(actor) });
  await batch.commit();
  const resultat = await efectes(cursId, {
    emails: [titular.email, fitxa.email],
    // El substitut fa l'horari de la plaça: n'hereta les classes assignades.
    reanomenaments: traspassarPlaca ? [[titular.nom, fitxa.nom]] : [],
    sessio,
  });
  return { id: ref.id, ...resultat };
}

// Deixa de llegir la pestanya Professorat del full: a partir d'ara mana Quota. Les
// fitxes sense rols els prenen dels permisos actuals (que venien de la columna ROL).
export async function activarGestioQuota({ cursId, actor }) {
  if (E2E_AUTH_BYPASS) {
    memoriaE2E().gestioAQuota = true;
    notificaE2E();
    return { fitxesAmbRols: 0 };
  }
  const [professors, permisos] = await Promise.all([
    llegirProfessors(cursId),
    getDocs(preautoritzatsRef()),
  ]);
  const perEmail = new Map(permisos.docs.map((d) => [completarEmail(d.id), d.data()]));
  const batch = new BatchSplit();
  let fitxesAmbRols = 0;
  professors.forEach((professor) => {
    if (Array.isArray(professor.rols) && professor.rols.length) return;
    const permis = perEmail.get(completarEmail(professor.email));
    const rols = permis?.rols?.length ? permis.rols : [permis?.rol || 'professor'];
    const fitxa = campsFitxa({ rols, departaments: [] });
    batch.update(doc(professorsRef(cursId), professor.id), { rols: fitxa.rols, rol: fitxa.rol });
    fitxesAmbRols += 1;
  });
  if (fitxesAmbRols) await batch.commit();
  await updateAppSettings(cursId, {
    professoratAQuota: true,
    professoratAQuotaDes: ara().toISOString(),
    professoratAQuotaPer: actor || 'admin',
  });
  return { fitxesAmbRols };
}

// Permisos de tot el professorat del curs: primer es calcula, després s'aplica.
export async function revisarPermisos(cursId, sessio = null) {
  if (E2E_AUTH_BYPASS) {
    const estat = memoriaE2E();
    return {
      ...planPermisos(estat.professors, estat.preautoritzats),
      usuaris: planUsuaris(estat.usuaris, estat.professors, { actorEmail: sessio?.email }),
    };
  }
  const [professors, permisos, usuaris] = await Promise.all([
    llegirProfessors(cursId), getDocs(preautoritzatsRef()), getDocs(usuarisRef()),
  ]);
  if (!professors.some(esActiu)) throw new Error('El curs no té professorat actiu: no es toquen els permisos.');
  return {
    ...planPermisos(professors, permisos.docs.map(ambId)),
    usuaris: planUsuaris(usuaris.docs.map(ambId), professors, { actorEmail: sessio?.email }),
  };
}

// Fitxes d'usuari de qui ja ha entrat a Quota, per avisar si alguna té el rol desfasat.
export async function llegirUsuaris() {
  if (E2E_AUTH_BYPASS) return memoriaE2E().usuaris.map((usuari) => ({ ...usuari }));
  return (await getDocs(usuarisRef())).docs.map(ambId);
}

export async function aplicarPermisos(cursId, pla) {
  if (!esCursVigent(cursId) && !E2E_AUTH_BYPASS) throw new Error('Només el curs vigent pot canviar els permisos d\'accés.');
  const usuaris = pla.usuaris || [];
  if (E2E_AUTH_BYPASS) {
    const estat = memoriaE2E();
    estat.preautoritzats = [
      ...estat.preautoritzats.filter((p) => !pla.esborrar.includes(p.email) && !pla.escriure.some((n) => n.email === p.email)),
      ...pla.escriure.map((p) => ({ id: p.email, ...p })),
    ];
    usuaris.forEach((canvi) => Object.assign(estat.usuaris.find((usuari) => usuari.id === canvi.uid) || {}, canvi.nou));
    notificaE2E();
    return;
  }
  const batch = new BatchSplit();
  pla.escriure.forEach((permis) => batch.set(doc(preautoritzatsRef(), permis.email), { ...permis, updatedAt: ara() }));
  pla.esborrar.forEach((email) => batch.delete(doc(preautoritzatsRef(), email)));
  usuaris.forEach((canvi) => batch.update(doc(usuarisRef(), canvi.uid), { ...canvi.nou, updatedAt: ara() }));
  await batch.commit();
  await avisarGuardies(cursId);
}

// Curs nou sense full: es copia el professorat actiu d'un altre curs, sense planificació.
export async function copiarProfessoratDeCurs({ origen, desti, actor }) {
  if (E2E_AUTH_BYPASS) return { copiats: 0 };
  const [deOrigen, aDesti] = await Promise.all([llegirProfessors(origen), llegirProfessors(desti)]);
  if (aDesti.length) throw new Error('El curs de destinació ja té professorat.');
  const actius = deOrigen.filter(esActiu);
  const batch = new BatchSplit();
  actius.forEach((professor) => {
    batch.set(doc(professorsRef(desti)), { ...fitxaPerCopiar(professor), createdAt: ara(), ...metadades(actor) });
  });
  await batch.commit();
  await actualitzarDepartaments(desti);
  await avisarGuardies(desti);
  await updateAppSettings(desti, {
    professoratAQuota: true,
    professoratAQuotaDes: ara().toISOString(),
    professoratAQuotaPer: actor || 'admin',
  });
  return { copiats: actius.length };
}

