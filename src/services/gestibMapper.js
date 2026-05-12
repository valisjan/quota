import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  netejarText, senseAccents, normalitzar, codiBase,
  grupsClasse, codisClasse, compactarGrup,
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

function aliasesCurs(curs = {}) {
  const desc = curs.descripcio || '';
  const codiUntis = codiCursUntis(curs);
  const sufix = sufixMateriaCurs(curs);
  return [
    desc,
    codiUntis,
    sufix,
    desc.replace(/\./g, ''),
    senseAccents(desc).replace(/\s+/g, ''),
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
      const codiUntis = codiBase(curta || descripcio, 'ACT');
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

function scorarCandidatsGestib(classe, gestib) {
  if (!gestib) return [];
  const cursNorm = normalitzar(classe.curs);
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
      if (grupMat && grupMat === grupNorm) score += 90;
      else if (grupMat && grupsNorm.includes(grupMat)) score += 80;
      else if (grupMat && grupNorm && grupMat.includes(grupNorm)) score += 45;
      else if (grupMat) score -= 70;
    }

    if (baseNorm === materiaNorm) score += 140;
    else if (baseNorm.includes(materiaNorm) || materiaNorm.includes(baseNorm)) score += 80;
    else if (descNorm.includes(materiaNorm) || curtaNorm.includes(materiaNorm)) score += 55;

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
  if (!classe.curs && !classe.grup) return trobarActivitatGestib(classe, gestib);
  return null;
}

export function clauOverride(classe) {
  return `${classe.materia}||${classe.curs}`;
}

export function trobarCandidatsGestib(classe, gestib, n = 8) {
  const candidatsMat = scorarCandidatsGestib(classe, gestib)
    .filter((item) => item.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((item) => ({
      codiUntis: item.materia.codiUntis,
      label: `${item.materia.codiUntis} · ${item.materia.descripcio}`,
      score: item.score,
    }));

  const candidatsActivitats = [];
  if (gestib?.activitatsMap?.size) {
    const materiaNorm = normalitzar(classe.materia || '');
    for (const activitat of gestib.activitatsMap.values()) {
      const score = activitat.aliases.reduce((s, alias) => {
        if (alias === materiaNorm) return s + 120;
        if (alias.includes(materiaNorm) || materiaNorm.includes(alias)) return s + 60;
        return s;
      }, 40);
      if (score >= 50) {
        candidatsActivitats.push({
          codiUntis: activitat.codiUntis,
          label: `[Activitat] ${activitat.codiUntis} · ${activitat.descripcio.replace(/^\*/, '').trim()}`,
          score,
        });
      }
    }
  }

  return [...candidatsMat, ...candidatsActivitats]
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

export async function previsualitzarMapeigGestib(cursId, gestibXmlText) {
  const gestib = parseGestibXml(gestibXmlText);
  const snap = await getDocs(cc(cursId, 'classes'));
  const classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const vistes = new Set();
  const problemes = [];

  classes
    .filter((c) => c.materia)
    .forEach((classe) => {
      const clau = clauOverride(classe);
      if (vistes.has(clau)) return;
      vistes.add(clau);
      const match = trobarMateriaGestib(classe, gestib)
        || (!classe.curs ? trobarActivitatGestib(classe, gestib) : null);
      if (!match) {
        problemes.push({
          clau,
          materia: classe.materia,
          curs: classe.curs,
          candidats: trobarCandidatsGestib(classe, gestib),
        });
      }
    });

  return { gestib, problemes };
}
