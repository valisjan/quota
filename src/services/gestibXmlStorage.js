import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { parseGestibXml } from './gestibMapper';
import { E2E_AUTH_BYPASS } from './e2e';

const MAX_XML_BYTES = 750 * 1024;
const XML_E2E_PREFIX = 'quota-e2e-gestib-xml:';

function referenciaXml(cursId) {
  if (!cursId) throw new Error('No hi ha cap curs actiu seleccionat.');
  return doc(db, 'cursos', cursId, 'untis', 'gestib_xml');
}

function obtenirXmlE2E(cursId) {
  const text = sessionStorage.getItem(`${XML_E2E_PREFIX}${cursId}`);
  return text ? JSON.parse(text) : null;
}

function desarXmlE2E(cursId, item) {
  sessionStorage.setItem(`${XML_E2E_PREFIX}${cursId}`, JSON.stringify(item));
}

function dataIso(valor) {
  if (!valor) return '';
  if (typeof valor.toDate === 'function') return valor.toDate().toISOString();
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '' : data.toISOString();
}

function infoDocument(data) {
  if (!data) return null;
  return {
    nom: data.nom || 'exportacioDadesHoraris.xml',
    mida: Number(data.mida) || 0,
    actualitzat: dataIso(data.updatedAt),
    generacio: dataIso(data.updatedAt),
    anyGestib: data.anyGestib || '',
    centreGestib: data.centreGestib || '',
  };
}

export function validarXmlGestibPerDesar(text) {
  const xmlText = (text || '').toString();
  const mida = new TextEncoder().encode(xmlText).byteLength;
  if (!xmlText.trim()) throw new Error("L'XML de GestIB esta buit.");
  if (mida > MAX_XML_BYTES) throw new Error("L'XML de GestIB supera el limit de 750 KB.");
  const gestib = parseGestibXml(xmlText);
  return { gestib, mida };
}

export async function obtenirInfoXmlGestibRemot(cursId) {
  if (E2E_AUTH_BYPASS) return infoDocument(obtenirXmlE2E(cursId));
  const snap = await getDoc(referenciaXml(cursId));
  return snap.exists() ? infoDocument(snap.data()) : null;
}

export async function carregarXmlGestibRemot(cursId) {
  if (E2E_AUTH_BYPASS) return obtenirXmlE2E(cursId);
  const snap = await getDoc(referenciaXml(cursId));
  if (!snap.exists()) return null;
  const data = snap.data();
  validarXmlGestibPerDesar(data.xml || '');
  return { ...infoDocument(data), text: data.xml };
}

export async function desarXmlGestibRemot(cursId, { text, nom }) {
  const { gestib, mida } = validarXmlGestibPerDesar(text);
  const data = {
    xml: text,
    nom: (nom || 'exportacioDadesHoraris.xml').toString().slice(0, 180),
    mida,
    anyGestib: (gestib.any || '').toString(),
    centreGestib: (gestib.centre || '').toString(),
    updatedAt: E2E_AUTH_BYPASS ? new Date().toISOString() : serverTimestamp(),
  };

  if (E2E_AUTH_BYPASS) {
    const item = { ...infoDocument(data), text, ...data };
    desarXmlE2E(cursId, item);
    return infoDocument(data);
  }

  await setDoc(referenciaXml(cursId), data);
  return obtenirInfoXmlGestibRemot(cursId);
}
