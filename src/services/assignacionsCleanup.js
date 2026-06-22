import { collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { BatchSplit } from '../utils/firestoreBatch';

function normalitzarArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function resumAssignacioClasse(data = {}) {
  const professorAssignat = data.professorAssignat || '';
  const professors = normalitzarArray(data.professors);
  const participants = normalitzarArray(data.participants);
  return {
    teAssignacio: Boolean(professorAssignat || professors.length || participants.length),
    professorsCount: professorAssignat || professors.length ? Math.max(professors.length, professorAssignat ? 1 : 0) : 0,
    participantsCount: participants.length,
  };
}

function resumAssignacioProfessor(data = {}) {
  const gpAssignades = Math.max(0, Number(data.gpAssignades) || 0);
  const palicAssignades = Math.max(0, Number(data.palicAssignades) || 0);
  const sdAssignades = Math.max(
    0,
    Array.isArray(data.sdAssignacions)
      ? data.sdAssignacions.length
      : Number(data.sdAssignades) || 0
  );
  return {
    teAssignacio: gpAssignades > 0 || palicAssignades > 0 || sdAssignades > 0,
    gpAssignades,
    palicAssignades,
    sdAssignades,
  };
}

function crearResumBase(cursId) {
  return {
    cursId,
    totalClasses: 0,
    classesAmbAssignacions: 0,
    professorsAssignats: 0,
    participantsCoordinacio: 0,
    totalProfessors: 0,
    professorsAmbExtres: 0,
    gpAssignades: 0,
    palicAssignades: 0,
    sdAssignades: 0,
  };
}

function validarCurs(cursId) {
  if (!cursId) throw new Error('No hi ha cap curs actiu.');
}

async function llegirResum(cursId) {
  validarCurs(cursId);

  const [classesSnap, professorsSnap] = await Promise.all([
    getDocs(collection(db, 'cursos', cursId, 'classes')),
    getDocs(collection(db, 'cursos', cursId, 'professors')),
  ]);

  const resum = crearResumBase(cursId);
  const classes = [];
  const professors = [];

  classesSnap.forEach((docu) => {
    const data = docu.data();
    const assignacio = resumAssignacioClasse(data);
    resum.totalClasses++;
    if (assignacio.teAssignacio) resum.classesAmbAssignacions++;
    resum.professorsAssignats += assignacio.professorsCount;
    resum.participantsCoordinacio += assignacio.participantsCount;
    classes.push({ ref: docu.ref, assignacio });
  });

  professorsSnap.forEach((docu) => {
    const data = docu.data();
    const assignacio = resumAssignacioProfessor(data);
    resum.totalProfessors++;
    if (assignacio.teAssignacio) resum.professorsAmbExtres++;
    resum.gpAssignades += assignacio.gpAssignades;
    resum.palicAssignades += assignacio.palicAssignades;
    resum.sdAssignades += assignacio.sdAssignades;
    professors.push({ ref: docu.ref, assignacio });
  });

  return { resum, classes, professors };
}

export async function obtenirResumAssignacionsCurs(cursId) {
  const { resum } = await llegirResum(cursId);
  return resum;
}

export async function eliminarAssignacionsCurs(cursId) {
  const { resum, classes, professors } = await llegirResum(cursId);
  const batch = new BatchSplit();
  let classesActualitzades = 0;
  let professorsActualitzats = 0;

  for (const classe of classes) {
    if (!classe.assignacio.teAssignacio) continue;
    batch.update(classe.ref, {
      professors: [],
      professorAssignat: '',
      participants: [],
      lastModified: serverTimestamp(),
    });
    classesActualitzades++;
  }

  for (const professor of professors) {
    if (!professor.assignacio.teAssignacio) continue;
    batch.update(professor.ref, {
      gpAssignades: 0,
      palicAssignades: 0,
      sdAssignades: 0,
      sdAssignacions: [],
      lastModified: serverTimestamp(),
    });
    professorsActualitzats++;
  }

  if (classesActualitzades || professorsActualitzats) {
    await batch.commit();
  }

  return {
    ...resum,
    classesActualitzades,
    professorsActualitzats,
    totalActualitzats: classesActualitzades + professorsActualitzats,
  };
}
