// Gestió del professorat des de Quota (substitueix la pestanya «Professorat» del full).
// Funcions pures: preparar i validar fitxes, filtrar i ordenar, i calcular què cal
// actualitzar als permisos d'accés, als departaments i a les classes.

import { normalitzarDepartament, separarDepartaments } from './departaments.js';
import { llegirRols, rolQuota } from './rolsProfessorat.js';
import { correuSemblaDe } from './validacioProfessorat.js';

export const DOMINI_CENTRE = 'iesjosepsuredaiblanes.com';

export const JORNADES = [
  { valor: '', etiqueta: 'Completa' },
  { valor: 'M', etiqueta: 'Mitja jornada' },
  { valor: 'T', etiqueta: "Reducció d'1/3" },
];

// «professor» és la base de tothom; la resta hi sumen drets.
export const ROLS_FITXA = [
  { valor: 'admin', etiqueta: 'Administració', ajuda: 'Gestiona Quota, Guàrdies i Retards.' },
  { valor: 'cap_departament', etiqueta: 'Cap de departament', ajuda: 'Reparteix les hores del seu departament.' },
  { valor: 'departament', etiqueta: 'Compte de departament', ajuda: 'Accés del departament sense ser-ne cap.' },
  { valor: 'psc', etiqueta: 'PSC', ajuda: 'Entra a Retards. A Quota i Guàrdies compta com a professor/a.' },
];

// Camps de la planificació que són de la plaça (no de la persona): passen al substitut.
export const CAMPS_PLACA = [
  'gpAssignades', 'gcAssignades', 'palicAssignades',
  'sdAssignades', 'sdAssignacions', 'ddAssignades', 'ddAssignacions',
];

export const MOTIUS_BAIXA = ['Baixa', 'Fi de nomenament', 'Trasllat', 'Jubilació', 'Altres'];

const normalitzarText = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim();

export const clauNom = (nom) => normalitzarText(nom).replace(/\s+/g, ' ');

export function completarEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email) return '';
  return email.includes('@') ? email : `${email}@${DOMINI_CENTRE}`;
}

export function normalitzarJornada(valor) {
  const jornada = String(valor || '').trim().toUpperCase();
  return jornada === 'M' || jornada === 'T' ? jornada : '';
}

export function etiquetaJornada(valor) {
  return JORNADES.find((jornada) => jornada.valor === normalitzarJornada(valor))?.etiqueta || 'Completa';
}

// Rols d'una fitxa: els del document o, si encara no en té, el rol únic antic.
export function rolsDe(professor = {}) {
  const rols = Array.isArray(professor.rols) && professor.rols.length
    ? llegirRols(professor.rols.join(',')).rols
    : llegirRols(professor.rol || '').rols;
  const extres = rols.filter((rol) => rol !== 'professor');
  return extres.length ? extres : [];
}

export function departamentsDe(professor = {}) {
  return separarDepartaments([
    ...(Array.isArray(professor.departaments) ? professor.departaments : []),
    professor.departament,
  ]);
}

// Valors nets d'un formulari, a punt per desar. Els rols guardats sempre inclouen
// «professor», que és la base, i el rol de Quota és el de més drets.
export function campsFitxa(form = {}) {
  const departaments = separarDepartaments(form.departaments || []);
  const extres = llegirRols((form.rols || []).join(',')).rols.filter((rol) => rol !== 'professor');
  const rols = ['professor', ...extres];
  return {
    nom: String(form.nom || '').trim().replace(/\s+/g, ' '),
    email: completarEmail(form.email),
    // «-» és «sense plaça» al full: aquí queda buit.
    codiUntis: /^[-–—]+$/.test(String(form.codiUntis || '').trim()) ? '' : String(form.codiUntis || '').trim().toUpperCase(),
    departaments,
    departament: departaments[0] || '',
    jornada: normalitzarJornada(form.jornada),
    rols,
    rol: rolQuota(rols),
    comentariFull: String(form.comentariFull || '').trim(),
    exempteGuardies: Boolean(form.exempteGuardies),
  };
}

export function formulariDe(professor = {}) {
  return {
    nom: professor.nom || '',
    email: professor.email || '',
    codiUntis: professor.codiUntis || '',
    departaments: departamentsDe(professor),
    jornada: normalitzarJornada(professor.jornada),
    rols: rolsDe(professor),
    comentariFull: professor.comentariFull || '',
    exempteGuardies: Boolean(professor.exempteGuardies),
  };
}

export const esActiu = (professor) => !professor?.eliminatDelFull;

// Errors (no es pot desar) i avisos d'una fitxa respecte de la resta del professorat.
export function validarFitxa(fitxa, professors = [], idActual = null) {
  const errors = [];
  const avisos = [];
  const altres = professors.filter((professor) => professor.id !== idActual);
  const actius = altres.filter(esActiu);

  if (!fitxa.nom) errors.push('Cal el nom (COGNOMS, NOM).');
  else if (!fitxa.nom.includes(',')) avisos.push('El nom no té el format «COGNOMS, NOM».');

  if (!fitxa.departaments.length) errors.push('Cal almenys un departament.');

  if (fitxa.email) {
    if (!/^[a-z0-9._-]+@[a-z0-9.-]+$/.test(fitxa.email) || !fitxa.email.endsWith(`@${DOMINI_CENTRE}`)) {
      errors.push(`El correu ha de ser del centre (@${DOMINI_CENTRE}).`);
    } else if (fitxa.nom && !correuSemblaDe(fitxa.email, fitxa.nom)) {
      avisos.push(`El correu ${fitxa.email} no sembla d'aquesta persona.`);
    }
    const repetit = actius.find((professor) => completarEmail(professor.email) === fitxa.email);
    if (repetit) errors.push(`El correu ja és de ${repetit.nom}.`);
  } else {
    avisos.push('Sense correu no podrà entrar a les aplicacions.');
  }

  if (fitxa.nom) {
    const mateixNom = altres.filter((professor) => clauNom(professor.nom) === clauNom(fitxa.nom));
    if (mateixNom.some(esActiu)) errors.push('Ja hi ha un professor actiu amb aquest nom.');
    else if (mateixNom.length && !idActual) avisos.push('Hi ha un professor amb aquest nom a Anteriors: potser cal reactivar-lo.');
  }

  if (fitxa.codiUntis) {
    const comparteixen = actius.filter((professor) => professor.codiUntis === fitxa.codiUntis);
    if (comparteixen.length) {
      avisos.push(`Comparteix la plaça ${fitxa.codiUntis} amb ${comparteixen.map((p) => p.nom).join(', ')}.`);
    }
  }
  return { errors, avisos };
}

// Filtres i ordenació de la taula.
export function filtrarProfessors(professors, filtres = {}) {
  const text = normalitzarText(filtres.text);
  const departament = normalitzarDepartament(filtres.departament);
  return professors.filter((professor) => {
    if (text) {
      const camps = [professor.nom, professor.email, professor.codiUntis, professor.comentariFull]
        .map(normalitzarText).join(' ');
      if (!camps.includes(text)) return false;
    }
    if (departament && !departamentsDe(professor).some((d) => normalitzarDepartament(d) === departament)) return false;
    if (filtres.rol && !(filtres.rol === 'professor' ? !rolsDe(professor).length : rolsDe(professor).includes(filtres.rol))) {
      return false;
    }
    if (filtres.jornada !== undefined && filtres.jornada !== '*' && filtres.jornada !== null
      && normalitzarJornada(professor.jornada) !== filtres.jornada) return false;
    return true;
  });
}

const VALOR_ORDRE = {
  nom: (p) => clauNom(p.nom),
  codiUntis: (p) => normalitzarText(p.codiUntis) || '￿',
  departament: (p) => normalitzarText(departamentsDe(p).join(', ')) || '￿',
  jornada: (p) => JORNADES.findIndex((j) => j.valor === normalitzarJornada(p.jornada)),
  rols: (p) => (rolsDe(p).length ? normalitzarText(rolsDe(p).join(',')) : '￿'),
  email: (p) => normalitzarText(p.email) || '￿',
  baixa: (p) => p.desactivatAt || '',
};

export function ordenarProfessors(professors, clau = 'nom', sentit = 'asc') {
  const valor = VALOR_ORDRE[clau] || VALOR_ORDRE.nom;
  const factor = sentit === 'desc' ? -1 : 1;
  return [...professors].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    const diferencia = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ca', { numeric: true });
    return (diferencia || clauNom(a.nom).localeCompare(clauNom(b.nom), 'ca')) * factor;
  });
}

// Permisos d'accés (col·lecció global «preautoritzats») que corresponen al professorat actiu.
export function permisDe(professor) {
  const rols = ['professor', ...rolsDe(professor)];
  return {
    email: completarEmail(professor.email),
    nom: professor.nom || '',
    codiUntis: professor.codiUntis || '',
    rol: rolQuota(rols),
    rols,
    departament: departamentsDe(professor)[0] || null,
    departaments: departamentsDe(professor),
  };
}

// «professor» és la base de tothom: es compara només la resta de rols.
const firmaPermis = (permis = {}) => JSON.stringify([
  permis.email, permis.nom, permis.codiUntis || '', permis.rol,
  [...new Set(permis.rols || [permis.rol])].filter((rol) => rol && rol !== 'professor').sort(),
  permis.departament || null, permis.departaments || [],
]);

// Què cal escriure i esborrar perquè els permisos coincideixin amb el professorat actiu.
export function planPermisos(professors, actuals = []) {
  const desitjats = new Map();
  professors.filter(esActiu).forEach((professor) => {
    const permis = permisDe(professor);
    if (permis.email && !desitjats.has(permis.email)) desitjats.set(permis.email, permis);
  });
  const perEmail = new Map(actuals.map((permis) => [completarEmail(permis.email || permis.id), permis]));
  const escriure = [...desitjats.values()].filter((permis) => firmaPermis(permis) !== firmaPermis(perEmail.get(permis.email)));
  const esborrar = [...perEmail.keys()].filter((email) => !desitjats.has(email));
  return { escriure, esborrar };
}

// Departaments que han d'existir segons el professorat actiu (com feia la sincronització).
export function planDepartaments(professors, existents = []) {
  const desitjats = new Map();
  professors.filter(esActiu).flatMap(departamentsDe).forEach((nom) => {
    const clau = normalitzarDepartament(nom);
    if (clau && !desitjats.has(clau)) desitjats.set(clau, nom);
  });
  const clausExistents = new Set(existents.map((dep) => normalitzarDepartament(dep.nom)));
  return {
    afegir: [...desitjats].filter(([clau]) => !clausExistents.has(clau)).map(([, nom]) => nom).sort((a, b) => a.localeCompare(b, 'ca')),
    eliminar: existents.filter((dep) => !desitjats.has(normalitzarDepartament(dep.nom))).map((dep) => dep.id),
  };
}

// Les classes guarden el professorat pel nom: en canviar-lo, cal actualitzar-les.
export function canvisClassePerNom(classe, nomAntic, nomNou) {
  const canvis = {};
  const substitueix = (llista) => (Array.isArray(llista) && llista.includes(nomAntic)
    ? llista.map((nom) => (nom === nomAntic ? nomNou : nom))
    : null);
  const professors = substitueix(classe.professors);
  const participants = substitueix(classe.participants);
  if (professors) canvis.professors = professors;
  if (participants) canvis.participants = participants;
  if (classe.professorAssignat === nomAntic) canvis.professorAssignat = nomNou;
  return Object.keys(canvis).length ? canvis : null;
}

// Planificació de la plaça que passa d'una fitxa a una altra (substitució o retorn).
export function planificacioPlaca(professor = {}) {
  return Object.fromEntries(CAMPS_PLACA.map((camp) => [
    camp,
    Array.isArray(professor[camp]) ? [...professor[camp]] : (professor[camp] ?? (camp.endsWith('Assignacions') ? [] : 0)),
  ]));
}

export function planificacioBuida() {
  return planificacioPlaca({});
}

export function tePlanificacio(professor = {}) {
  return CAMPS_PLACA.some((camp) => (Array.isArray(professor[camp]) ? professor[camp].length : Number(professor[camp] || 0)) > 0);
}

// Fitxa nova per a un substitut: hereta la plaça (codi), els departaments i la jornada.
export function formulariSubstitut(titular = {}) {
  return {
    ...formulariDe({}),
    codiUntis: titular.codiUntis || '',
    departaments: departamentsDe(titular),
    jornada: normalitzarJornada(titular.jornada),
  };
}

// Camps d'una fitxa per copiar-la a un altre curs: la persona sí, la planificació no.
export function fitxaPerCopiar(professor = {}) {
  return {
    ...campsFitxa(formulariDe(professor)),
    preferencia: '',
    motiuAllegat: '',
    comentaris: '',
    ...planificacioBuida(),
    eliminatDelFull: false,
  };
}
