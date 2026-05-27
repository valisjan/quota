import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  netejarText, senseAccents, normalitzar, codiBase,
  grupsClasse, codisClasse, codisCurs, compactarGrup, parseGpu002, expandirClassePerGrups,
} from './untisUtils';

function cc(cursId, nom) { return collection(db, 'cursos', cursId, nom); }

function atribut(node, nom) {
  return node?.getAttribute?.(nom) || '';
}

function nodesPerTag(node, tag) {
  const directes = [...(node?.getElementsByTagName?.(tag) || [])];
  if (directes.length) return directes;
  return [...(node?.getElementsByTagName?.('*') || [])].filter(
    (el) => (el.localName || el.nodeName || '').toUpperCase() === tag
  );
}

function primerNodePerTag(node, tag) {
  return nodesPerTag(node, tag)[0] || null;
}

function parseXmlRobust(text) {
  const parser = new DOMParser();
  const net = (text || '').replace(/^﻿/, '').trim();
  let xml = parser.parseFromString(net, 'application/xml');
  let error = xml.querySelector('parsererror');

  if (error) {
    const escapades = net.replace(
      /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[a-fA-F0-9]+;)/g,
      '&amp;'
    );
    xml = parser.parseFromString(escapades, 'application/xml');
    error = xml.querySelector('parsererror');
  }

  if (error) {
    throw new Error(
      `No s'ha pogut llegir l'XML. Revisa que sigui l'exportacioDadesHoraris de GestIB i no un XML d'un altre programa. Detall: ${netejarText(error.textContent).slice(0, 180)}`
    );
  }

  return xml;
}

function sufixMateriaCurs(curs = {}) {
  const desc = senseAccents(curs.descripcio || '').toUpperCase();
  const eso = desc.match(/^([1-4])\D*ESO/);
  if (eso) return `${eso[1]}E`;
  const batx = desc.match(/^([12])\D*BATX?/);
  if (batx) return `${batx[1]}B`;
  return '';
}

function codiCursUntis(curs = {}) {
  const desc = senseAccents(curs.descripcio || '').toUpperCase();
  const eso = desc.match(/^([1-4])\D*ESO/);
  if (eso) return `${eso[1]}ESO`;
  const batx = desc.match(/^([12])\D*BATX?/);
  if (batx) return `${batx[1]}B`;
  return codiBase(curs.descripcio || curs.codi, 'CURS');
}

function senseArticlesCatala(text) {
  return (text || '').replace(/\b(d['']|de |del |l['']|la |les |els )/gi, '');
}

function aliasesCurs(curs = {}) {
  const desc = curs.descripcio || '';
  const codiUntis = codiCursUntis(curs);
  const sufix = sufixMateriaCurs(curs);
  const descNeteja = senseArticlesCatala(desc);
  return [
    desc,
    codiUntis,
    sufix,
    desc.replace(/\./g, ''),
    senseAccents(desc).replace(/\s+/g, ''),
    senseAccents(descNeteja).replace(/\s+/g, ''),
    curs.codi,
  ].map(normalitzar).filter(Boolean);
}

function grupMateria(materia = {}) {
  const text = materia.descripcio || materia.curta || '';
  const match = text.match(/-([A-Za-z0-9]+)$/);
  return match ? match[1].toUpperCase() : '';
}

function baseMateriaGestib(materia = {}) {
  return (materia.descripcio || materia.curta || '').replace(/-[A-Za-z0-9]+$/, '');
}

function codiMateriaGestib(materia, curs) {
  const sufix = sufixMateriaCurs(curs);
  if (sufix) return `${materia.curta}-${sufix}`;
  return `${materia.curta}${curs.descripcio}`;
}

function esActivitatGuardiaPati(text) {
  const norm = (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return (
    norm.includes('pati') &&
    (norm.includes('guardia') || norm.includes('vigilancia') || norm.includes('esplai'))
  );
}

function codiActivitatUntis(curta, descripcio) {
  if (esActivitatGuardiaPati(`${curta} ${descripcio}`)) return 'GP';
  return codiBase(curta || descripcio, 'ACT');
}

export function parseGestibXml(text) {
  if (!text?.trim()) return null;
  const xml = parseXmlRobust(text);
  const centreNode = primerNodePerTag(xml, 'CENTRE');
  if (!centreNode) {
    const arrel = xml.documentElement?.nodeName || 'desconeguda';
    throw new Error(
      `El XML carregat no sembla de GestIB: falta l'etiqueta CENTRE. Arrel detectada: ${arrel}.`
    );
  }

  const cursos = nodesPerTag(xml, 'CURS').map((node) => {
    const curs = {
      codi: atribut(node, 'codi'),
      descripcio: atribut(node, 'descripcio'),
      grups: nodesPerTag(node, 'GRUP').map((grup) => ({
        codi: atribut(grup, 'codi'),
        nom: atribut(grup, 'nom'),
      })),
    };
    curs.codiUntis = codiCursUntis(curs);
    curs.aliases = aliasesCurs(curs);
    return curs;
  });
  const cursosPerCodi = new Map(cursos.map((curs) => [curs.codi, curs]));

  const materies = nodesPerTag(xml, 'MATERIA').map((node) => {
    const curs = cursosPerCodi.get(atribut(node, 'curs')) || {};
    const materia = {
      codiGestib: atribut(node, 'codi'),
      cursCodi: atribut(node, 'curs'),
      cursDescripcio: curs.descripcio || '',
      descripcio: atribut(node, 'descripcio'),
      curta: atribut(node, 'curta'),
      departament: atribut(node, 'departament'),
    };
    materia.grup = grupMateria(materia);
    materia.base = baseMateriaGestib(materia);
    materia.codiUntis = codiMateriaGestib(materia, curs);
    materia.cursAliases = curs.aliases || [];
    return materia;
  });

  const activitatsMap = new Map(
    nodesPerTag(xml, 'ACTIVITAT').map((node) => {
      const curta = atribut(node, 'curta').replace(/^\*/, '').trim();
      const descripcio = atribut(node, 'descripcio').replace(/^\*/, '').trim();
      const codiUntis = codiActivitatUntis(curta, descripcio);
      const activitat = {
        codiGestib: atribut(node, 'codi'),
        descripcio: atribut(node, 'descripcio'),
        curta: atribut(node, 'curta'),
        codiUntis,
        aliases: [normalitzar(descripcio), normalitzar(curta)].filter(Boolean),
      };
      return [codiUntis, activitat];
    })
  );

  return {
    centre: atribut(centreNode, 'codi'),
    any: atribut(centreNode, 'any'),
    cursos,
    places: nodesPerTag(xml, 'PLACA').map((node) => ({
      codiGestib: atribut(node, 'codi'),
      curta: atribut(node, 'curta'),
      descripcio: atribut(node, 'descripcio'),
    })),
    departaments: nodesPerTag(xml, 'DEPARTAMENT'),
    materies,
    activitatsMap,
    activitats: nodesPerTag(xml, 'ACTIVITAT'),
    aules: nodesPerTag(xml, 'AULA'),
  };
}

// Abreviatures GestIB conegudes: nom normalitzat de l'app → array de codis curta GestIB possibles
// FI = Filosofia (no Física); Física standalone = FIS; Alemany ESO = SAL, Batx = EAL1/EAL2
const ABREVIATURES_MATERIA = new Map([
  ['atencioeducativa', ['ae']],
  ['angles', ['a', 'lan1', 'lan2']],
  ['psicologia', ['ps']],
  ['matematiquesaplicadesalescienciessocials', ['map1', 'map2']],
  ['matematiquesaplicades', ['map1', 'map2']],
  ['fisica', ['fis']],
  ['filosofia', ['fi']],
  ['historiadelart', ['ha']],
  ['alemany', ['sal', 'eal1', 'eal2']],
  ['matematiquesi', ['mat1']],
  ['matematiques1', ['mat1']],
  ['matematiquesii', ['mat2']],
  ['matematiques2', ['mat2']],
  ['economia', ['ec']],
]);

function scorarCandidatsGestib(classe, gestib) {
  if (!gestib) return [];
  const cursRaw = codisCurs(classe.curs || '')[0] || classe.curs || '';
  const cursNorm = normalitzar(cursRaw);
  const grupNorm = compactarGrup(classe.grup);
  const grupsNorm = grupsClasse(classe).map((grup) => compactarGrup(grup));
  const materiaNorm = normalitzar(classe.materia);
  const tenimCurs = !!cursNorm;

  const pool = tenimCurs
    ? gestib.materies.filter((m) => m.cursAliases.includes(cursNorm))
    : gestib.materies;

  return pool.map((materia) => {
    let score = tenimCurs ? 100 : 40;
    const grupMat = materia.grup;
    const baseNorm = normalitzar(materia.base);
    const descNorm = normalitzar(materia.descripcio);
    const curtaNorm = normalitzar(materia.curta);

    if (tenimCurs) {
      if (grupMat && grupNorm) {
        // La classe TÉ grup: puntua per coincidència o penalitza si no coincideix
        if (grupMat === grupNorm) score += 90;
        else if (grupsNorm.includes(grupMat)) score += 80;
        else if (grupMat.includes(grupNorm)) score += 45;
        else score -= 70;
      }
      // Si la classe NO té grup, no penalitzem les matèries que sí en tenen:
      // les classes sense grup (tutories, suport, desdobles...) poden correspondre
      // a qualsevol matèria del curs — la descripció serà el criteri decisiu
    }

    if (baseNorm === materiaNorm) score += 140;
    else if (baseNorm.includes(materiaNorm) || materiaNorm.includes(baseNorm)) score += 80;
    else if (materiaNorm.length >= 5 && descNorm.includes(materiaNorm)) score += 90;
    else if (descNorm.includes(materiaNorm) || curtaNorm.includes(materiaNorm)) score += 55;

    const abreviatures = ABREVIATURES_MATERIA.get(materiaNorm);
    if (abreviatures) {
      const codi = normalitzar((materia.curta || '').split('-')[0]);
      if (abreviatures.includes(codi)) score += 130;
    }

    return { materia, score };
  });
}

export function trobarMateriaGestib(classe, referenciaGestib) {
  if (!referenciaGestib) return null;
  const candidates = scorarCandidatsGestib(classe, referenciaGestib)
    .filter((item) => item.score >= 180)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.materia || null;
}

function trobarActivitatGestib(classe, gestib) {
  if (!gestib?.activitatsMap?.size) return null;
  const materiaNorm = normalitzar(classe.materia || '');
  const tipus = netejarText(classe.tipus || '').toUpperCase();
  if (tipus === 'GP') {
    for (const activitat of gestib.activitatsMap.values()) {
      if (activitat.codiUntis === 'GP' || esActivitatGuardiaPati(`${activitat.descripcio} ${activitat.curta}`)) {
        return activitat;
      }
    }
  }
  let millor = null;
  let millorScore = 0;
  for (const activitat of gestib.activitatsMap.values()) {
    const score = activitat.aliases.reduce((s, alias) => {
      if (alias === materiaNorm) return s + 120;
      if (alias.includes(materiaNorm) || materiaNorm.includes(alias)) return s + 60;
      return s;
    }, 0);
    if (score > millorScore) { millorScore = score; millor = activitat; }
  }
  return millorScore >= 60 ? millor : null;
}

export function trobarMateriaGestibAmbOverride(classe, gestib, overrides) {
  if (overrides) {
    const clau = clauOverride(classe);
    const codiUntis = overrides[clau];
    if (codiUntis) {
      const mat = gestib?.materies.find((m) => m.codiUntis === codiUntis);
      if (mat) return mat;
      const act = gestib?.activitatsMap?.get(codiUntis);
      if (act) return { codiUntis: act.codiUntis, descripcio: act.descripcio.replace(/^\*/, '').trim(), cursDescripcio: '' };
      return { codiUntis, descripcio: codiUntis, cursDescripcio: '' };
    }
  }
  const materiaMatch = trobarMateriaGestib(classe, gestib);
  if (materiaMatch) return materiaMatch;
  // Per a classes sense grup (tutories, suport, desdobles...) busquem també
  // entre les ACTIVITATs del XML, que inclouen activitats no lligades a cap grup
  if (!classe.grup) return trobarActivitatGestib(classe, gestib);
  return null;
}

export function clauOverride(classe) {
  return [classe.materia || '', classe.curs || '', classe.grup || ''].join('||');
}

export function trobarCandidatsGestib(classe, gestib, n = 8) {
  const senseAmbdos = !classe.curs && !classe.grup;

  if (senseAmbdos) {
    const materiaNorm = normalitzar(classe.materia || '');
    const candidats = [];
    if (gestib?.activitatsMap?.size) {
      for (const activitat of gestib.activitatsMap.values()) {
        const score = activitat.aliases.reduce((s, alias) => {
          if (alias === materiaNorm) return s + 120;
          if (alias.includes(materiaNorm) || materiaNorm.includes(alias)) return s + 60;
          return s;
        }, 40);
        candidats.push({
          codiUntis: activitat.codiUntis,
          label: `${activitat.codiUntis} · ${activitat.descripcio.replace(/^\*/, '').trim()}`,
          score,
        });
      }
    }
    return candidats.sort((a, b) => b.score - a.score).slice(0, n);
  }

  return scorarCandidatsGestib(classe, gestib)
    .filter((item) => item.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((item) => ({
      codiUntis: item.materia.codiUntis,
      label: `${item.materia.codiUntis} · ${item.materia.descripcio}`,
      score: item.score,
    }));
}

export function totesMateriesGestib(gestib) {
  if (!gestib) return [];
  const materies = gestib.materies.map((m) => ({
    codiUntis: m.codiUntis,
    label: `${m.codiUntis} · ${m.descripcio}`,
    cursDescripcio: m.cursDescripcio || '',
  }));
  const activitats = gestib.activitatsMap
    ? [...gestib.activitatsMap.values()].map((a) => ({
        codiUntis: a.codiUntis,
        label: `[Activitat] ${a.codiUntis} · ${a.descripcio.replace(/^\*/, '').trim()}`,
        cursDescripcio: '',
      }))
    : [];
  return [...materies, ...activitats].sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
}

function resoldreMapeigAmbGpu002(classe, gestib, gpu002Lines) {
  if (!gpu002Lines?.length || !gestib) return null;
  const codisGrup = codisClasse(classe).map((c) => c.toUpperCase());
  if (!codisGrup.length) return null;

  for (const ref of gpu002Lines) {
    if (!ref.materia) continue;
    if (!codisGrup.includes((ref.classe || '').toUpperCase())) continue;
    const mat = gestib.materies.find((m) => m.codiUntis === ref.materia);
    if (mat) return mat;
    const act = gestib.activitatsMap?.get(ref.materia);
    if (act) return { codiUntis: act.codiUntis, descripcio: act.descripcio.replace(/^\*/, '').trim(), cursDescripcio: '' };
  }
  return null;
}

function trobarCoordinacioGestib(gestib) {
  if (!gestib?.activitatsMap) return null;
  for (const act of gestib.activitatsMap.values()) {
    if (normalitzar(act.descripcio).includes('coordinaci')) return act;
  }
  return null;
}

export async function previsualitzarMapeigGestib(cursId, gestibXmlText, gpu002Text = '') {
  const gestib = parseGestibXml(gestibXmlText);
  const snap = await getDocs(cc(cursId, 'classes'));
  const allClasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const gpu002Lines = gpu002Text ? parseGpu002(gpu002Text) : [];

  const seen = new Set();
  const classes = [];

  for (const classeOriginal of allClasses) {
    if (!classeOriginal.materia) continue;
    for (const classe of expandirClassePerGrups(classeOriginal)) {
    const clau = clauOverride(classe);
    if (seen.has(clau)) continue;
    seen.add(clau);

    const senseAmbdos = !classe.curs && !classe.grup;
    const esCoordinacio = netejarText(classe.tipus || '').toUpperCase() === 'C';
    const esActivitat = senseAmbdos || esCoordinacio;

    let estat = 'pendent';
    let autoCodiUntis = null;
    let autoLabel = null;

    if (esCoordinacio) {
      const act = trobarCoordinacioGestib(gestib);
      if (act) {
        estat = 'autoMatch';
        autoCodiUntis = act.codiUntis;
        autoLabel = act.descripcio.replace(/^\*/, '').trim();
      }
    } else if (senseAmbdos) {
      const act = trobarActivitatGestib(classe, gestib);
      if (act) {
        estat = 'autoMatch';
        autoCodiUntis = act.codiUntis;
        autoLabel = act.descripcio.replace(/^\*/, '').trim();
      }
    } else {
      const mat = trobarMateriaGestib(classe, gestib);
      if (mat) {
        estat = 'autoMatch';
        autoCodiUntis = mat.codiUntis;
        autoLabel = mat.descripcio;
      }
    }

    if (estat === 'pendent' && gpu002Lines.length) {
      const gpu002Match = resoldreMapeigAmbGpu002(classe, gestib, gpu002Lines);
      if (gpu002Match) {
        estat = 'autoGpu002';
        autoCodiUntis = gpu002Match.codiUntis;
        autoLabel = gpu002Match.descripcio;
      }
    }

    classes.push({
      clau,
      materia: classe.materia,
      curs: classe.curs || '',
      grup: classe.grup || '',
      senseAmbdos,
      esActivitat,
      estat,
      autoCodiUntis,
      autoLabel,
      candidats: estat === 'pendent' ? trobarCandidatsGestib(classe, gestib) : [],
    });
    } // fi for expandirClassePerGrups
  }

  return { gestib, classes };
}
