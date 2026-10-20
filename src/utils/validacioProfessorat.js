// Comprovacions del full «Professorat» abans de sincronitzar. Un error al full
// (columna desplaçada en ordenar, correus creuats...) no s'ha de poder aplicar sense
// que un administrador ho vegi. Retorna riscos amb el format de la sincronització:
// { tipus, severitat: 'critic' | 'avis', resum, detall }.

const DOMINI = 'iesjosepsuredaiblanes.com';

const normalitzar = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();
const lletres = (s) => normalitzar(s).replace(/[^a-z]/g, '');

// «COGNOM1 COGNOM2, NOM1 NOM2» -> { cognoms: ['cognom1', 'cognom2'], noms: ['nom1', 'nom2'] }
function partsNom(nom) {
  const [cognoms = '', noms = ''] = String(nom || '').split(',');
  const paraules = (text) => normalitzar(text).split(/[\s.-]+/).map(lletres).filter((p) => p.length > 1);
  return { cognoms: paraules(cognoms), noms: paraules(noms) };
}

// Inicials dels sobrenoms habituals als correus del centre (Tomeu, Toni, Tolo, Charo).
const INICIALS_SOBRENOMS = {
  bartomeu: 't', bartolome: 't', bartolomeu: 't', antoni: 't', antonio: 't', rosario: 'c',
};

// El correu és «inicials + cognom»: el cognom hi ha de ser, i el que hi ha davant han
// de ser inicials del nom (o d'un sobrenom habitual) o el començament d'un dels noms.
// La ñ pot aparèixer al correu com a «n» (Cañellas) o com a «ny» (Campaña).
export function correuSemblaDe(email, nom) {
  return [/ñ/gi, null].some((patro) => (
    encaixaCorreu(email, patro ? String(nom || '').replace(patro, 'ny') : nom)
  ));
}

function encaixaCorreu(email, nom) {
  const local = lletres(String(email || '').split('@')[0]);
  const { cognoms, noms } = partsNom(nom);
  if (!local || !cognoms.length) return true;
  const cognom = cognoms.find((c) => c.length >= 3 && local.includes(c));
  if (!cognom) return false;
  const prefix = local.slice(0, local.indexOf(cognom));
  if (!prefix) return true;
  const inicials = noms.flatMap((n) => [n[0], INICIALS_SOBRENOMS[n]].filter(Boolean));
  return [...prefix].every((lletra) => inicials.includes(lletra))
    || noms.some((n) => n.startsWith(prefix));
}

function nomVisible(professor) {
  return professor.nom || '(sense nom)';
}

// professors: files del full ({ nom, email, codiUntis, rolsDesconeguts }).
// existents: documents actuals ({ nom, codiUntis }).
export function validarProfessorat(professors, existents = []) {
  const riscos = [];
  const afegir = (tipus, severitat, resum, detall) => riscos.push({ tipus, severitat, resum, detall });

  // Noms repetits: dues files es fondrien en un sol professor.
  const perNom = new Map();
  professors.forEach((professor) => {
    const clau = normalitzar(professor.nom);
    perNom.set(clau, [...(perNom.get(clau) || []), professor]);
  });
  perNom.forEach((files) => {
    if (files.length > 1) {
      afegir('nom_repetit', 'critic', nomVisible(files[0]), `El nom surt ${files.length} vegades al full.`);
    }
  });

  // Correus: format, domini i repeticions.
  const perCorreu = new Map();
  professors.forEach((professor) => {
    const email = normalitzar(professor.email);
    if (!email) return;
    if (!/^[a-z0-9._-]+@[a-z0-9.-]+$/.test(email) || !email.endsWith(`@${DOMINI}`)) {
      afegir('correu_invalid', 'critic', nomVisible(professor), `Correu no vàlid o d'un altre domini: ${professor.email}`);
    }
    perCorreu.set(email, [...(perCorreu.get(email) || []), professor]);
  });
  perCorreu.forEach((files, email) => {
    if (files.length > 1) {
      afegir('correu_repetit', 'critic', email, `El mateix correu és de: ${files.map(nomVisible).join(' i ')}.`);
    }
  });

  // Rols que no existeixen (errades d'escriptura).
  professors.forEach((professor) => {
    if (professor.rolsDesconeguts?.length) {
      afegir('rol_desconegut', 'critic', nomVisible(professor), `Rol desconegut: ${professor.rolsDesconeguts.join(', ')}`);
    }
  });

  // Codis que salten d'una persona a una altra que continua al full: és el que passa
  // quan s'ordena el full sense la columna del codi. Un substitut (persona nova) o una
  // vacant que s'ocupa (l'anterior ja no hi és) no compten.
  const existentPerNom = new Map(existents.map((item) => [normalitzar(item.nom), item]));
  const nouCodiPerNom = new Map(professors.map((professor) => [normalitzar(professor.nom), professor.codiUntis || '']));
  const titularsPerCodi = new Map();
  existents.forEach((item) => {
    if (!item.codiUntis || !nouCodiPerNom.has(normalitzar(item.nom))) return;
    titularsPerCodi.set(item.codiUntis, [...(titularsPerCodi.get(item.codiUntis) || []), item]);
  });
  professors.forEach((professor) => {
    const actual = existentPerNom.get(normalitzar(professor.nom));
    const codi = professor.codiUntis || '';
    if (!actual || !codi || actual.codiUntis === codi) return;
    const anteriors = (titularsPerCodi.get(codi) || []).filter((item) => (
      normalitzar(item.nom) !== normalitzar(professor.nom)
      && nouCodiPerNom.get(normalitzar(item.nom)) !== codi
    ));
    if (anteriors.length) {
      afegir(
        'codi_desplacat',
        'critic',
        nomVisible(professor),
        `Codi ${actual.codiUntis || '(cap)'} -> ${codi}, que ara és de ${anteriors.map(nomVisible).join(', ')} (que passa a ${anteriors.map((item) => nouCodiPerNom.get(normalitzar(item.nom)) || '(cap)').join(', ')}). Possible columna desplaçada.`,
      );
    }
  });

  // Correus que no semblen de la persona. Si dues files encaixen amb el correu de
  // l'altra, és que s'han creuat (crític); si no, només avís (sobrenoms, comptes genèrics).
  const sospitosos = professors.filter((professor) => (
    professor.email && !correuSemblaDe(professor.email, professor.nom)
  ));
  const creuats = new Set();
  sospitosos.forEach((a) => {
    professors.forEach((b) => {
      if (a === b || !b.email || creuats.has(a) || creuats.has(b)) return;
      if (correuSemblaDe(b.email, a.nom) && correuSemblaDe(a.email, b.nom)) {
        creuats.add(a);
        creuats.add(b);
        afegir('correus_creuats', 'critic', `${nomVisible(a)} i ${nomVisible(b)}`, `Els correus semblen intercanviats: ${a.email} i ${b.email}.`);
      }
    });
  });
  sospitosos.filter((professor) => !creuats.has(professor)).forEach((professor) => {
    afegir('correu_sospitos', 'avis', nomVisible(professor), `El correu ${professor.email} no sembla d'aquesta persona.`);
  });

  return riscos;
}
