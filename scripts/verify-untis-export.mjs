import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const assetsDir = join(root, 'src', 'assets');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

function stripAccents(value) {
  return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function codiBase(value, fallback = 'ACT') {
  const net = stripAccents(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (net || fallback).slice(0, 14);
}

function codiUnic(base, used, maxLength = 14) {
  let code = base || 'X';
  let i = 2;
  while (used.has(code)) {
    const suffix = String(i);
    code = `${base.slice(0, Math.max(1, maxLength - suffix.length))}${suffix}`;
    i++;
  }
  used.add(code);
  return code;
}

function activityCode(curta, descripcio, used) {
  const starred = /^\s*\*/.test(curta || '') || /^\s*\*/.test(descripcio || '');
  const cleanCurta = (curta || '').replace(/^\*/, '').trim();
  const cleanDesc = (descripcio || '').replace(/^\*/, '').trim();
  const base = codiBase(cleanCurta || cleanDesc, 'ACT');
  return codiUnic(starred ? `A${base}`.slice(0, 14) : base, used);
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

function verifyActivities() {
  const xmlName = readdirSync(assetsDir).find((name) => name.endsWith('.xml'));
  assert(xmlName, 'No XML asset found');

  const xml = readFileSync(join(assetsDir, xmlName), 'utf8');
  const tags = [...xml.matchAll(/<ACTIVITAT\b[^>]*\/>/gi)].map((match) => match[0]);
  assert(tags.length > 0, 'No ACTIVITAT tags found');

  const used = new Set();
  const activities = tags.map((tag) => {
    const curta = attr(tag, 'curta');
    const descripcio = attr(tag, 'descripcio');
    return {
      curta,
      descripcio,
      starred: /^\s*\*/.test(curta || '') || /^\s*\*/.test(descripcio || ''),
      code: activityCode(curta, descripcio, used),
    };
  });

  const starred = activities.filter((activity) => activity.starred);
  assert(starred.length > 0, 'Expected starred ACTIVITAT entries');
  assert(new Set(activities.map((activity) => activity.code)).size === activities.length, 'Activity codes must be unique');

  const tutoria = activities.find((activity) => activity.curta === 'Tutoria' || activity.descripcio === 'Tutoria');
  const starredTutoria = activities.find((activity) => activity.curta === '*Tutoria' || activity.descripcio === '*Tutoria');
  assert(tutoria && starredTutoria, 'Expected both Tutoria and *Tutoria activities in XML');
  assert(tutoria.code !== starredTutoria.code, 'Tutoria and *Tutoria must not share the same Untis code');
  assert(starredTutoria.code.startsWith('A'), '*Tutoria should get an activity-prefixed safe code');
}

const gpuReferenceFiles = ['GPU002.TXT', 'GPU003.TXT', 'GPU004.TXT', 'GPU006.TXT'];

function verifyGpuFiles() {
  for (const file of gpuReferenceFiles) {
    const path = join(assetsDir, file);
    const text = readFileSync(path, 'utf8');
    text.split(/\r?\n/).forEach((line, lineIndex) => {
      if (!line.trim()) return;
      const fieldsParsed = parseCsvLine(line);
      fieldsParsed.forEach((value, fieldIndex) => {
        assert(
          !/[;~*|]/.test(value || ''),
          `${file}:${lineIndex + 1} reserved Untis/Windows symbol in field ${fieldIndex + 1}: ${value}`
        );
      });
    });
  }
}

verifyActivities();
verifyGpuFiles();

console.log('Untis verification OK');
