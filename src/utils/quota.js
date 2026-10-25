// Quota: les classes de cada departament (curs, grup, matèria, hores i tipus), que abans
// es picaven a la pestanya «Quota» del full. Funcions pures del panell de la quota.

import { normalitzarDepartament } from './departaments.js';
import { limitsHoresProfessor } from './horesProfessor.js';

// Hores lectives d'una plaça completa: el full mostrava les hores del departament / 18.
export const HORES_PLACA = 18;

export const TIPUS_QUOTA = [
  { codi: '', etiqueta: 'Normal' },
  { codi: 'O', etiqueta: 'Optativa' },
  { codi: 'O1', etiqueta: 'Optativa 1a franja' },
  { codi: 'O2', etiqueta: 'Optativa 2a franja' },
  { codi: 'O3', etiqueta: 'Optativa 3a franja' },
  { codi: 'O4', etiqueta: 'Optativa 4a franja' },
  { codi: 'T', etiqueta: 'Optativa compartida' },
  { codi: 'A1', etiqueta: 'Autodesdoblament' },
  { codi: 'D', etiqueta: 'Desdoblament' },
  { codi: 'DD', etiqueta: 'Desdoblament divisible' },
  { codi: 'CD', etiqueta: 'Codocència' },
  { codi: 'F', etiqueta: 'Flexible' },
  { codi: 'S', etiqueta: 'Suport' },
  { codi: 'SD', etiqueta: 'Suport divisible' },
  { codi: 'C', etiqueta: 'Coordinació' },
  { codi: 'CO', etiqueta: 'Coordinació sense membres' },
  { codi: 'PALIC', etiqueta: 'PALIC' },
];

const senseAccents = (valor) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toUpperCase()
  .replace(/\s+/g, ' ')
  .trim();

// Descripcions del full (pestanya Tipus), amb les seves errades, que es poden enganxar.
const TIPUS_PER_TEXT = new Map([
  ...TIPUS_QUOTA.filter((tipus) => tipus.codi).map((tipus) => [senseAccents(tipus.etiqueta), tipus.codi]),
  ['OPTATIVA 1R I 2N ESO', 'O'],
  ['OPATATIVA', 'O'],
  ['OPTATIVA 3A FRNAJA', 'O3'],
  ['AUTODESBOBLAMENT', 'A1'],
  ['COORDINACIO', 'C'],
]);

// «O1», «O - Optativa 1a franja», «Suport divisible»... → el codi. Buit o «Normal» → ''.
export function llegirTipus(valor) {
  const text = senseAccents(valor);
  if (!text || text === 'NORMAL') return '';
  if (TIPUS_QUOTA.some((tipus) => tipus.codi === text)) return text;
  const [codi, ...resta] = text.split(' - ');
  const descripcio = resta.join(' - ').trim();
  if (descripcio && TIPUS_PER_TEXT.has(descripcio)) return TIPUS_PER_TEXT.get(descripcio);
  if (TIPUS_PER_TEXT.has(text)) return TIPUS_PER_TEXT.get(text);
  return codi.trim() === 'NORMAL' ? '' : codi.trim();
}

export function etiquetaTipus(codi) {
  return TIPUS_QUOTA.find((tipus) => tipus.codi === codi)?.etiqueta || codi || 'Normal';
}

// Com la sincronització del full: «BDF» → «B+D+F».
export function normalitzarGrup(valor) {
  const grup = String(valor ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!grup || grup.includes('+') || grup.length <= 1) return grup;
  if (/^[A-Z]+$/.test(grup)) return grup.split('').join('+');
  return grup;
}

export function llegirHores(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : NaN;
  const text = String(valor ?? '').trim().replace(',', '.');
  if (!text) return NaN;
  const nombre = Number(text);
  return Number.isFinite(nombre) ? Math.round(nombre * 100) / 100 : NaN;
}

// Valors nets d'una fila, a punt per desar.
export function campsClasse(fila = {}) {
  return {
    curs: String(fila.curs ?? '').trim().toUpperCase(),
    grup: normalitzarGrup(fila.grup),
    materia: String(fila.materia ?? '').trim().replace(/\s+/g, ' '),
    hores: llegirHores(fila.hores),
    tipus: llegirTipus(fila.tipus),
  };
}

// Igual que el full: una fila sense matèria o sense hores no és una classe.
export function errorsClasse(camps = {}) {
  const errors = [];
  if (!camps.materia) errors.push('Cal la matèria.');
  if (!(camps.hores > 0)) errors.push('Cal un nombre d\'hores més gran que 0.');
  return errors;
}

// Document nou de la col·lecció «classes», sense professorat assignat.
export function novaClasse(camps, departament) {
  return {
    curs: camps.curs || '',
    grup: camps.grup || '',
    materia: camps.materia || '',
    hores: camps.hores,
    tipus: camps.tipus || '',
    departament,
    departaments: [departament],
    subclasses: [],
    multicurs: false,
    multicursTipus: '',
    professors: [],
    professorAssignat: '',
    participants: [],
  };
}

// Canvis d'una edició respecte de la classe guardada (només el que canvia). Una classe
// multicurs (p. ex. Anglès professional d'AGA) conserva curs, grup i matèria, i les
// hores de cada subclasse segueixen les de la classe.
export function canvisClasse(classe = {}, edicio = {}) {
  const canvis = {};
  const multicurs = Boolean(classe.subclasses?.length);
  ['curs', 'grup', 'materia', 'tipus'].forEach((camp) => {
    if (!(camp in edicio)) return;
    if (multicurs && camp !== 'tipus') return;
    const valor = campsClasse({ ...classe, [camp]: edicio[camp] })[camp];
    if (valor !== (classe[camp] || '')) canvis[camp] = valor;
  });
  if ('hores' in edicio) {
    const hores = llegirHores(edicio.hores);
    if (hores > 0 && hores !== Number(classe.hores)) {
      canvis.hores = hores;
      if (multicurs) canvis.subclasses = classe.subclasses.map((subclasse) => ({ ...subclasse, hores }));
    }
  }
  if ('departament' in edicio) {
    const departament = String(edicio.departament || '').trim();
    if (departament && departament !== classe.departament) {
      canvis.departament = departament;
      canvis.departaments = [departament];
    }
  }
  return canvis;
}

export function teAssignacio(classe = {}) {
  return Boolean(classe.professorAssignat || classe.professors?.length || classe.participants?.length);
}

// Còpia d'una classe d'un altre curs: la quota sí, el repartiment (professorat) no.
export function classePerCopiar(classe = {}) {
  const departament = classe.departament || classe.departaments?.[0] || '';
  return {
    curs: classe.curs || '',
    grup: classe.grup || '',
    materia: classe.materia || '',
    hores: Number(classe.hores) || 0,
    tipus: classe.tipus || '',
    departament,
    departaments: departament ? [departament] : [],
    subclasses: (classe.subclasses || []).map((subclasse) => ({ ...subclasse })),
    multicurs: Boolean(classe.multicurs),
    multicursTipus: classe.multicursTipus || '',
    professors: [],
    professorAssignat: '',
    participants: [],
    // La correspondència amb GestIB passa al curs nou (es revisa si GestIB ha canviat codis).
    ...(classe.gestib?.codis?.length ? { gestib: { tipus: classe.gestib.tipus, codis: [...classe.gestib.codis] } } : {}),
  };
}

// Files enganxades des d'un full de càlcul (columnes separades per tabuladors):
// CURS · GRUP · MATÈRIA · HORES, i després TIPUS o DEPARTAMENT · TIPUS (com la pestanya
// Quota). Les files van al departament on s'enganxen.
export function llegirFilesEnganxades(text) {
  const files = [];
  const ignorades = [];
  String(text ?? '')
    .split(/\r?\n/)
    .forEach((linia, index) => {
      const columnes = linia.split('\t').map((cel) => cel.trim());
      if (!columnes.some(Boolean)) return;
      const [curs = '', grup = '', materia = '', hores = ''] = columnes;
      if (['MATERIA', 'MATÈRIA'].includes(materia.toUpperCase()) || curs.toUpperCase() === 'CURS') return;
      const tipus = columnes.length >= 6 ? columnes[5] : columnes[4] || '';
      const camps = campsClasse({ curs, grup, materia, hores, tipus });
      const errors = errorsClasse(camps);
      if (errors.length) ignorades.push({ fila: index + 1, text: columnes.filter(Boolean).join(' · '), motiu: errors.join(' ') });
      else files.push(camps);
    });
  return { files, ignorades };
}

// Ordre de lectura: ESO, Batxillerat i la resta de cursos; després grup i matèria. Les
// files sense curs (coordinacions, càrrecs, reduccions) van al final.
const ETAPES = ['ESO', 'BAT'];
function clauCurs(curs = '') {
  const text = String(curs).toUpperCase();
  if (!text) return [9, 0, ''];
  const etapa = ETAPES.findIndex((nom) => text.endsWith(nom));
  const nivell = Number.parseInt(text, 10);
  return [etapa >= 0 ? etapa : 2, Number.isNaN(nivell) ? 0 : nivell, text];
}

export function compararClasses(a, b) {
  const [ea, na, ta] = clauCurs(a.curs);
  const [eb, nb, tb] = clauCurs(b.curs);
  return ea - eb || na - nb || ta.localeCompare(tb, 'ca')
    || String(a.grup || '').localeCompare(String(b.grup || ''), 'ca')
    || String(a.materia || '').localeCompare(String(b.materia || ''), 'ca')
    || String(a.id || '').localeCompare(String(b.id || ''));
}

const arrodonir = (valor) => Math.round(valor * 100) / 100;

function departamentPrincipal(professor = {}) {
  return (Array.isArray(professor.departaments) && professor.departaments[0]) || professor.departament || '';
}

// Una targeta per departament: les seves classes, les hores (com el TOTAL del full), les
// places que suposen (hores / 18) i el professorat actiu que hi té el departament principal,
// amb les hores que pot fer segons la jornada. Balanç > 0: sobren hores de professorat.
export function resumDepartaments(classes = [], professors = [], noms = []) {
  const perClau = new Map();
  const assegura = (nom) => {
    const clau = normalitzarDepartament(nom);
    if (!perClau.has(clau)) {
      perClau.set(clau, { nom, classes: [], hores: 0, professors: 0, complets: 0, parcials: 0, capacitat: 0 });
    }
    return perClau.get(clau);
  };
  noms.filter(Boolean).forEach(assegura);
  classes.forEach((classe) => {
    const resum = assegura(classe.departament || classe.departaments?.[0] || 'Sense departament');
    resum.classes.push(classe);
    resum.hores += Number(classe.hores) || 0;
  });
  professors
    .filter((professor) => !professor.eliminatDelFull)
    .forEach((professor) => {
      const departament = departamentPrincipal(professor);
      if (!departament) return;
      const resum = assegura(departament);
      resum.professors += 1;
      if (professor.jornada === 'M' || professor.jornada === 'T') resum.parcials += 1;
      else resum.complets += 1;
      resum.capacitat += limitsHoresProfessor(professor).ideal;
    });
  return [...perClau.values()]
    .map((resum) => ({
      ...resum,
      classes: [...resum.classes].sort(compararClasses),
      hores: arrodonir(resum.hores),
      places: arrodonir(resum.hores / HORES_PLACA),
      balanc: arrodonir(resum.capacitat - resum.hores),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
}

export function totalsQuota(resums = []) {
  const hores = arrodonir(resums.reduce((suma, resum) => suma + resum.hores, 0));
  const capacitat = resums.reduce((suma, resum) => suma + resum.capacitat, 0);
  return {
    classes: resums.reduce((suma, resum) => suma + resum.classes.length, 0),
    hores,
    places: arrodonir(hores / HORES_PLACA),
    professors: resums.reduce((suma, resum) => suma + resum.professors, 0),
    capacitat,
    balanc: arrodonir(capacitat - hores),
  };
}

// «7,1»: una xifra decimal, amb coma.
export function formatDecimal(valor, decimals = 1) {
  const nombre = Number(valor) || 0;
  const text = Number.isInteger(nombre) ? String(nombre) : nombre.toFixed(decimals).replace(/\.?0+$/, '');
  return text.replace('.', ',');
}

// «6+1»: professorat a jornada completa més el que té jornada parcial, com el full.
export function formatProfessorat(resum = {}) {
  if (!resum.professors) return '0';
  return resum.parcials ? `${resum.complets}+${resum.parcials}` : String(resum.complets);
}
