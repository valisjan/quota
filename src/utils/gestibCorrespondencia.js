// Correspondència entre les files de la quota i el catàleg de GestIB del curs (matèries i
// activitats). GestIB es prepara abans que la quota, amb totes les matèries i activitats que
// s'impartiran. Cada fila de la quota guarda a quins elements del catàleg correspon (camp
// «gestib») i l'exportació a Untis ho fa servir tal qual, sense endevinar.
//
// Fila: { curs, grup, materia, tipus, departament, gestib?: { tipus: 'materia'|'activitat', codis: [...] } }
// Catàleg (el de parseGestibXml): { materies: [{ curta, descripcio, cursDescripcio }],
//   activitats: [{ codiGestib, curta, descripcio, teAsterisc, codiUntis }] }
// Les matèries s'identifiquen per l'abreviatura curta (MAT-A-1E), que es manté d'un curs a
// l'altre tret que hi hagi un canvi de currículum. Les activitats, pel codi de GestIB: dues
// activitats poden tenir la mateixa abreviatura (tutoria FCT presencial i no presencial).

import { codisCurs, grupsClasse, normalitzar, senseAccents } from '../services/untisUtils.js';

const majuscules = (valor) => (valor || '').toString().trim().toUpperCase();

// ─── Lectura d'una matèria de GestIB ─────────────────────────────────────────

const RE_SUFIX_CURS = /^([1-4]E|[12]B)$/i;
const RE_GRUPS = /^[A-H]{1,8}\d?$/;

// «Tècniques experimentals-AB-FQ-1B» → { base: 'Tècniques experimentals', grups: ['A','B'], extres: ['FQ'] }
// «Anglès professional-BAGA22» (grup enganxat al curs) → grups ['B'].
export function analitzarMateriaGestib(materia = {}) {
  // Els guions amb espais formen part del nom («Llengua estrangera - Anglès-A-1E»).
  const parts = (materia.descripcio || materia.curta || '').split(/(?<! )-(?! )/).map((part) => part.trim()).filter(Boolean);
  const cursNet = normalitzar(materia.cursDescripcio).toUpperCase();
  let grups = [];
  const extres = [];
  let index = parts.length - 1;

  const ultim = parts[index] || '';
  if (index > 0 && RE_SUFIX_CURS.test(ultim)) {
    index -= 1;
  } else if (index > 0 && cursNet && majuscules(ultim).endsWith(cursNet) && ultim.length > cursNet.length) {
    const davant = majuscules(ultim).slice(0, -cursNet.length);
    if (RE_GRUPS.test(davant)) grups = davant.replace(/\d$/, '').split('');
    else extres.push(davant);
    index -= 1;
  }
  while (index > 0) {
    const part = majuscules(parts[index]);
    if (!grups.length && RE_GRUPS.test(part)) grups = part.replace(/\d$/, '').split('');
    else extres.unshift(part);
    index -= 1;
  }
  return { base: parts.slice(0, index + 1).join('-') || parts[0] || '', grups, extres };
}

export function cursMateriaGestib(materia = {}) {
  return majuscules(codisCurs(materia.cursDescripcio || '')[0] || materia.cursDescripcio);
}

export const cursFila = (fila) => majuscules(codisCurs(fila.curs || '')[0] || fila.curs);
const grupsFila = (fila) => [...new Set(grupsClasse(fila).map(majuscules))];

// ─── Semblança de noms ───────────────────────────────────────────────────────

const PARAULES_BUIDES = new Set(['les', 'els', 'del', 'dels', 'per', 'amb', 'una', 'uns', 'als']);

// Marques que distingeixen matèries del mateix nom: la lletra o el número del final
// («Matemàtiques A/B») i els números romans en majúscula («Llengua estrangera I - Anglès»).
const esMarca = (paraula) => /^([a-z]|i{1,3}|iv|\d)$/.test(paraula);

function paraules(text) {
  const original = senseAccents(text || '').replace(/['’]/g, ' ');
  const totMajuscules = original === original.toUpperCase();
  const totes = original.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return totes
    .map((paraula, index) => {
      const minuscula = paraula.toLowerCase();
      const romana = !totMajuscules && /^(I|II|III|IV)$/.test(paraula);
      const darrera = totes.length > 1 && index === totes.length - 1 && esMarca(minuscula);
      if (romana || darrera) return minuscula;
      if ((minuscula.length >= 2 || /^\d$/.test(minuscula)) && !PARAULES_BUIDES.has(minuscula)
        && !['de', 'la', 'el', 'en', 'al', 'a', 'i'].includes(minuscula)) return minuscula;
      return '';
    })
    .filter(Boolean);
}

// Sigles fetes amb les inicials de les paraules: IPO, EDMN...
function inicials(text) {
  return paraules(text).filter((paraula) => !esMarca(paraula)).map((paraula) => paraula[0]).join('');
}

function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const files = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) files[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      files[i][j] = Math.min(files[i - 1][j] + 1, files[i][j - 1] + 1, files[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return files[a.length][b.length];
}

// Dues paraules «són la mateixa»: iguals, una errada (consum «reponsable»), o romans/àrabs.
const ROMANS = { i: '1', ii: '2', iii: '3', iv: '4' };
function mateixaParaula(a, b) {
  if (a === b) return true;
  if ((ROMANS[a] || a) === (ROMANS[b] || b)) return true;
  return a.length >= 6 && b.length >= 6 && distancia(a, b) <= 1;
}

// Quina part del nom de la quota surt al nom de GestIB (0..1). 1 vol dir que hi és tot.
export function semblancaNom(nomQuota, nomGestib) {
  if (normalitzar(nomQuota) && normalitzar(nomQuota) === normalitzar(nomGestib)) return 1;
  const deQuota = paraules(nomQuota);
  const deGestib = paraules(nomGestib);
  if (!deQuota.length || !deGestib.length) return 0;
  const hiEs = (paraula) => deGestib.some((altra) => mateixaParaula(paraula, altra));
  // Només amb una marca en comú («I», «A») no són la mateixa matèria.
  if (!deQuota.some((paraula) => !esMarca(paraula) && hiEs(paraula))) return 0;
  return deQuota.filter(hiEs).length / deQuota.length;
}

// Quina part del nom de GestIB surt a la quota: desempata «Matemàtiques» entre
// «Matemàtiques» i «Taller de matemàtiques».
function exactitudNom(nomQuota, nomGestib) {
  if (normalitzar(nomQuota) && normalitzar(nomQuota) === normalitzar(nomGestib)) return 1;
  return semblancaNom(nomGestib, nomQuota);
}

// Abreviatures del departament que GestIB afegeix a algunes matèries (TE-AB-FQ-1B, TE-AB-BIO-1B).
function marquesDepartament(departament) {
  const net = senseAccents(departament || '').toUpperCase();
  const parentesi = [...net.matchAll(/\(([A-Z]+)\)/g)].map((match) => match[1]);
  const senseParentesi = net.replace(/\([^)]*\)/g, ' ');
  const inicials = senseParentesi.split(/[^A-Z]+/).filter((paraula) => paraula.length > 2).map((paraula) => paraula[0]).join('');
  const primeres = senseParentesi.replace(/[^A-Z]/g, '').slice(0, 3);
  return new Set([inicials, primeres, ...parentesi].filter((marca) => marca.length >= 2));
}

// ─── Proposta per a una fila ─────────────────────────────────────────────────

export function esFilaActivitat(fila = {}) {
  return (!fila.curs && !fila.grup) || (fila.materia || '').toString().trim().startsWith('*');
}

// Regles per a les activitats més habituals de la quota. La primera que encaixa mana; es
// prefereix la versió lectiva (amb asterisc) de l'activitat.
const REGLES_ACTIVITAT = [
  { fila: /^>\s*55|majors de 55/i, activitat: /majors de 55/i },
  { fila: /^cap de subdepartament/i, activitat: /subdepartament/i },
  { fila: /^cap de departament/i, activitat: /dedicaci[oó] a cap de departament|dedicaci[oó] al departament/i },
  { fila: /^(cap d'estudis|ce adjunt)/i, activitat: /prefectura/i },
  { fila: /^director/i, activitat: /direcci[oó]/i },
  { fila: /^secretari/i, activitat: /secretaria/i },
  { fila: /^(orientador|psc\d*$)/i, activitat: /orientaci[oó]/i },
  { fila: /^(fempo|fct)\b|formaci[oó] en empresa/i, activitat: /tutoria formaci[oó] en empresa/i },
  { fila: /tutoria/i, activitat: /^\*?tutoria$/i },
  { fila: /^(pale|palic)\b/i, activitat: /palic/i },
  { fila: /^(suport|refor)/i, activitat: /refor[cç]/i, confianca: 'probable' },
  { fila: /desdoblament/i, activitat: /desdoblaments de grups/i, confianca: 'probable' },
  { fila: /proa/i, activitat: /proa/i },
  { fila: /^coord/i, activitat: /^\*?(dedicaci[oó] a )?coordinaci[oó]$/i },
];

export const codiActivitat = (activitat) => String(activitat.codiGestib || activitat.curta);
const textActivitat = (activitat) => [activitat.descripcio, activitat.curta].filter(Boolean).join(' ');

function proposarActivitat(fila, cataleg) {
  const activitats = cataleg?.activitats || [];
  if (!activitats.length) return null;
  const nom = (fila.materia || '').toString().replace(/^\*/, '').trim();
  const lectives = (llista) => [...llista].sort((a, b) => Number(Boolean(b.teAsterisc)) - Number(Boolean(a.teAsterisc)));

  if ((fila.tipus || '').toUpperCase() === 'GP') {
    const pati = activitats.find((activitat) => /guàrdia de pati|guardia de pati/i.test(textActivitat(activitat)));
    if (pati) return { tipus: 'activitat', codis: [codiActivitat(pati)], confianca: 'segura', motiu: 'Guàrdia de pati' };
  }
  const regla = REGLES_ACTIVITAT.find((item) => item.fila.test(nom));
  if (regla) {
    const activitat = lectives(activitats.filter((item) => regla.activitat.test(item.descripcio.replace(/^\*/, '').trim())
      || regla.activitat.test((item.curta || '').replace(/^\*/, '').trim())))[0];
    if (activitat) return { tipus: 'activitat', codis: [codiActivitat(activitat)], confianca: regla.confianca || 'segura', motiu: 'Regla per a aquesta activitat' };
  }
  const millor = lectives(activitats)
    .map((activitat) => ({ activitat, semblanca: Math.max(semblancaNom(nom, activitat.descripcio), semblancaNom(nom, activitat.curta)) }))
    .sort((a, b) => b.semblanca - a.semblanca)[0];
  if (millor && millor.semblanca >= 0.66) {
    return {
      tipus: 'activitat',
      codis: [codiActivitat(millor.activitat)],
      confianca: millor.semblanca === 1 ? 'segura' : 'probable',
      motiu: millor.semblanca === 1 ? 'Mateix nom' : 'Nom semblant',
    };
  }
  return null;
}

function proposarMateria(fila, cataleg, usats) {
  const curs = cursFila(fila);
  const grups = grupsFila(fila);
  const marques = marquesDepartament(fila.departament);
  const candidates = (cataleg?.materies || [])
    .filter((materia) => cursMateriaGestib(materia) === curs)
    .map((materia) => {
      const analisi = analitzarMateriaGestib(materia);
      // A la quota sovint s'escriuen les sigles de l'abreviatura de GestIB (AE, EPVA, FOPP...).
      const nomFila = normalitzar(fila.materia);
      const sigles = nomFila === normalitzar((materia.curta || '').split('-')[0])
        || (nomFila.length >= 2 && nomFila.length <= 6 && /^[A-ZÀ-Ú.\s]+$/.test(fila.materia || '') && nomFila === inicials(analisi.base));
      const semblanca = sigles ? 1 : Math.max(semblancaNom(fila.materia, analisi.base), semblancaNom(fila.materia, materia.descripcio) * 0.9);
      const exactitud = sigles ? 1 : exactitudNom(fila.materia, analisi.base);
      const grupsMateria = analisi.grups;
      const dins = !grups.length || !grupsMateria.length || grupsMateria.every((grup) => grups.includes(grup));
      const departament = analisi.extres.some((extra) => marques.has(extra)) ? 1 : analisi.extres.length ? -1 : 0;
      return { materia, analisi, semblanca, exactitud, dins, departament };
    })
    .filter((item) => item.semblanca >= 0.5 && item.dins);
  if (!candidates.length) return null;

  // Primer el nom (i el més exacte); si n'hi ha diverses del mateix nom, la del departament de
  // la fila i la que encara no fa servir cap altra fila (blocs paral·lels, EDM-ACE1 i EDM-ACE2).
  const ordenar = (a, b) => b.semblanca - a.semblanca
    || b.exactitud - a.exactitud
    || b.departament - a.departament
    || Number(usats.has(a.materia.curta)) - Number(usats.has(b.materia.curta))
    || a.materia.curta.localeCompare(b.materia.curta);
  candidates.sort(ordenar);
  const millorSemblanca = candidates[0].semblanca;
  const millorExactitud = candidates[0].exactitud;
  const delMateixNom = candidates.filter((item) => item.semblanca === millorSemblanca && item.exactitud === millorExactitud);

  // Un bloc que és exactament la fila (TFCR-BD-3E per a 3r B+D) o, si no, una matèria per grup.
  const clauGrupsFila = [...grups].sort().join('');
  const blocExacte = delMateixNom.find((item) => [...item.analisi.grups].sort().join('') === clauGrupsFila);
  let triades = [];
  if (blocExacte || !grups.length) {
    triades = [blocExacte || delMateixNom[0]];
  } else {
    const perCobrir = new Set(grups);
    delMateixNom.forEach((item) => {
      if (item.analisi.grups.some((grup) => perCobrir.has(grup)) && item.analisi.grups.every((grup) => perCobrir.has(grup))) {
        triades.push(item);
        item.analisi.grups.forEach((grup) => perCobrir.delete(grup));
      }
    });
    if (perCobrir.size) {
      return {
        tipus: 'materia',
        codis: triades.map((item) => item.materia.curta),
        confianca: 'probable',
        motiu: `No hi ha matèria de GestIB per al grup ${[...perCobrir].join(', ')}`,
      };
    }
  }
  // Segura: mateix nom, cap marca d'un altre departament i cap alternativa igual de bona
  // (un altre bloc paral·lel lliure dels mateixos grups i el mateix departament).
  const segura = millorSemblanca === 1 && triades.every((item) => item.departament >= 0)
    && delMateixNom.filter((item) => !triades.includes(item) && !usats.has(item.materia.curta)
      && item.departament >= triades[0].departament
      && [...item.analisi.grups].sort().join('') === [...triades[0].analisi.grups].sort().join('')).length === 0;
  return {
    tipus: 'materia',
    codis: triades.map((item) => item.materia.curta),
    confianca: segura ? 'segura' : 'probable',
    motiu: millorSemblanca === 1 ? 'Mateix nom' : 'Nom semblant',
  };
}

// Correspondències manuals d'abans (pàgina Untis, «Mapeig»): clau «matèria||curs||grup» →
// codi Untis (la curta de la matèria o el codi Untis de l'activitat).
function proposarDesMapeig(fila, cataleg, mapeig) {
  if (!mapeig) return null;
  const claus = [
    [fila.materia || '', fila.curs || '', fila.grup || ''].join('||'),
    ...grupsFila(fila).map((grup) => [fila.materia || '', fila.curs || '', grup].join('||')),
  ];
  const codis = [...new Set(claus.map((clau) => mapeig[clau]).filter(Boolean))];
  if (!codis.length) return null;
  const activitat = (cataleg?.activitats || []).find((item) => item.codiUntis === codis[0]);
  if (activitat) return { tipus: 'activitat', codis: [codiActivitat(activitat)], confianca: 'segura', motiu: 'Mapeig manual anterior' };
  const curtes = codis.filter((codi) => (cataleg?.materies || []).some((materia) => materia.curta === codi));
  return curtes.length ? { tipus: 'materia', codis: curtes, confianca: 'segura', motiu: 'Mapeig manual anterior' } : null;
}

// Proposta per a una fila sense enllaç. usats: curtes ja enllaçades a altres files.
export function proposarCorrespondencia(fila, cataleg, { mapeig = null, usats = new Set() } = {}) {
  const manual = proposarDesMapeig(fila, cataleg, mapeig);
  if (manual) return manual;
  if (esFilaActivitat(fila) || (fila.tipus || '').toUpperCase() === 'GP') return proposarActivitat(fila, cataleg);
  return proposarMateria(fila, cataleg, usats) || null;
}

// Propostes per a totes les files sense enllaç, de manera que dues files no es quedin el
// mateix bloc paral·lel (EDM-ACE1 i EDM-ACE2).
export function proposarCorrespondencies(files, cataleg, { mapeig = null } = {}) {
  const usats = new Set(files.flatMap((fila) => (fila.gestib?.tipus === 'materia' ? fila.gestib.codis || [] : [])));
  return files
    .filter((fila) => !fila.gestib?.codis?.length)
    .map((fila) => {
      const proposta = proposarCorrespondencia(fila, cataleg, { mapeig, usats });
      if (proposta?.tipus === 'materia') proposta.codis.forEach((codi) => usats.add(codi));
      return { fila, proposta };
    });
}

// ─── Estat i resolució d'un enllaç desat ─────────────────────────────────────

const materiaPerCurta = (cataleg, curta) => (cataleg?.materies || []).find((materia) => materia.curta === curta);
const activitatPerCodi = (cataleg, codi) => (cataleg?.activitats || []).find((activitat) => codiActivitat(activitat) === String(codi));

// 'sense' | 'ok' | 'trencat' (algun codi ja no és a GestIB o no cobreix els grups de la fila).
export function estatEnllac(fila, cataleg) {
  const codis = fila.gestib?.codis || [];
  if (!codis.length) return { estat: 'sense', motiu: 'Sense correspondència amb GestIB' };
  if (!cataleg) return { estat: 'ok', motiu: '' };
  if (fila.gestib.tipus === 'activitat') {
    return activitatPerCodi(cataleg, codis[0])
      ? { estat: 'ok', motiu: '' }
      : { estat: 'trencat', motiu: `L'activitat ${codis[0]} ja no és a GestIB` };
  }
  const desaparegudes = codis.filter((codi) => !materiaPerCurta(cataleg, codi));
  if (desaparegudes.length) return { estat: 'trencat', motiu: `Ja no són a GestIB: ${desaparegudes.join(', ')}` };
  const grups = grupsFila(fila);
  const coberts = new Set(codis.flatMap((codi) => analitzarMateriaGestib(materiaPerCurta(cataleg, codi)).grups));
  const sense = grups.filter((grup) => coberts.size && !coberts.has(grup));
  if (sense.length) return { estat: 'trencat', motiu: `Cap matèria enllaçada no és del grup ${sense.join(', ')}` };
  return { estat: 'ok', motiu: '' };
}

// L'element del catàleg que toca a una línia d'exportació (una fila o el tros d'un grup).
// Retorna la matèria o l'activitat del catàleg, o null si l'enllaç no hi és o no encaixa.
export function resoldreEnllac(fila, cataleg) {
  const codis = fila.gestib?.codis || [];
  if (!codis.length || !cataleg) return null;
  if (fila.gestib.tipus === 'activitat') return activitatPerCodi(cataleg, codis[0]) || null;
  const materies = codis.map((codi) => materiaPerCurta(cataleg, codi)).filter(Boolean);
  if (materies.length <= 1) return materies[0] || null;
  const grups = grupsFila(fila);
  const curs = cursFila(fila);
  const ambGrups = materies
    .map((materia) => ({ materia, analisi: analitzarMateriaGestib(materia) }))
    .filter(({ analisi }) => !grups.length || !analisi.grups.length || grups.every((grup) => analisi.grups.includes(grup)))
    .sort((a, b) => a.analisi.grups.length - b.analisi.grups.length);
  // Primer les del mateix curs; una fila de diversos cursos (p. ex. AGA2X) pren la primera.
  const delCurs = ambGrups.filter(({ materia }) => cursMateriaGestib(materia) === curs);
  return (delCurs[0] || (materies.every((materia) => cursMateriaGestib(materia) !== curs) ? ambGrups[0] : null))?.materia || null;
}
