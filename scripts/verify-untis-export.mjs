import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agruparClassesPerLlicoExport } from '../src/services/lessonBuilder.js';
import {
  codiProfessorExport,
  compararAbreviaturaUntis,
  prepararComponentsGpu002,
  incidenciesCodisProfessorGestib,
} from '../src/services/untisUtils.js';

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

function verifyGroupedLessonHours() {
  const lessons = agruparClassesPerLlicoExport([
    {
      id: 'fq-2eso-ace',
      curs: '2ESO',
      grup: 'A+C+E',
      materia: 'Fisica i quimica',
      hores: 9,
      tipus: '',
      professorAssignat: 'GILI',
    },
  ]);

  assert(lessons.length === 3, 'A+C+E ordinary lessons must export as one Untis lesson per group');
  assert(
    lessons.every((lesson) => Number(lesson.hores) === 3),
    '9 aggregate hours across A+C+E must export as 3 hours per group'
  );
  assert(
    lessons.map((lesson) => lesson.grup).sort().join(',') === 'A,C,E',
    'Grouped ordinary lessons must split into the target groups'
  );
}

function verifyCodocenciaGroupedHours() {
  const lessons = agruparClassesPerLlicoExport([
    {
      id: 'ang-1eso-ace-1',
      curs: '1ESO',
      grup: 'A+C+E',
      materia: 'Angles',
      hores: 9,
      tipus: 'CD',
      professorAssignat: 'ANG1',
    },
    {
      id: 'ang-1eso-ace-2',
      curs: '1ESO',
      grup: 'A+C+E',
      materia: 'Angles',
      hores: 9,
      tipus: 'CD',
      professorAssignat: 'COLO',
    },
  ]);

  assert(lessons.length === 3, 'Codocencia over A+C+E must export one shared lesson per group');
  assert(
    lessons.every((lesson) => Number(lesson.hores) === 3),
    'Codocencia aggregate hours must be divided per group'
  );
  assert(
    lessons.every((lesson) => lesson.professors.includes('ANG1') && lesson.professors.includes('COLO')),
    'Each codocencia group lesson must keep both teachers'
  );
}

function verifyDesdobleAttachedToTitular() {
  const lessons = agruparClassesPerLlicoExport([
    {
      id: 'fq-2eso-ace',
      curs: '2ESO',
      grup: 'A+C+E',
      materia: 'Fisica i quimica',
      hores: 9,
      tipus: '',
      professorAssignat: 'FQ1',
    },
    {
      id: 'fq-2eso-a-desdoble',
      curs: '2ESO',
      grup: 'A',
      materia: 'Fisica i quimica',
      hores: 1,
      tipus: 'D',
      professorAssignat: 'LLOR',
    },
  ]);

  const groupA = lessons.filter((lesson) => lesson.grup === 'A');
  assert(groupA.length === 2, 'A one-hour split must create one attached lesson and one remaining titular lesson');
  assert(
    groupA.some((lesson) => Number(lesson.hores) === 1 && lesson.professors.includes('FQ1') && lesson.professors.includes('LLOR')),
    'The split hour must be attached to the titular FQ teacher'
  );
  assert(
    groupA.some((lesson) => Number(lesson.hores) === 2 && lesson.professors.length === 1 && lesson.professors[0] === 'FQ1'),
    'The remaining titular FQ hours must stay separate'
  );
}

function verifyGpu002ComponentRows() {
  const rows = prepararComponentsGpu002([
    { codiGrups: '1ESO-A', codiProfessor: 'RODR', codiMateria: 'SF-ACE-1E', aula: '', comptaGrup: true },
    { codiGrups: '1ESO-C', codiProfessor: 'RODR', codiMateria: 'SF-ACE-1E', aula: '', comptaGrup: true },
    { codiGrups: '1ESO-E', codiProfessor: 'RODR', codiMateria: 'SF-ACE-1E', aula: '', comptaGrup: true },
    { codiGrups: '1ESO-B', codiProfessor: 'FORT', codiMateria: 'EDM-BDF-1E', aula: '', comptaGrup: true },
    { codiGrups: '1ESO-D', codiProfessor: 'FORT', codiMateria: 'EDM-BDF-1E', aula: '', comptaGrup: true },
    { codiGrups: '1ESO-F', codiProfessor: 'FORT', codiMateria: 'EDM-BDF-1E', aula: '', comptaGrup: true },
  ]);

  assert(rows.length === 6, 'Grouped lessons must keep one GPU002 row per Untis group abbreviation');
  assert(
    rows.every((item) => !item.codiGrups.includes(',')),
    'Untis group abbreviations must not contain comma-separated lists'
  );
  assert(
    rows.map((item) => item.codiGrups).join('|') === '1ESO-A|1ESO-C|1ESO-E|1ESO-B|1ESO-D|1ESO-F',
    'Grouped rows must preserve every target group as a separate abbreviation'
  );
}

function verifyUntisAbbreviationSort() {
  const values = ['2ESO-A', '1ESO-C', '1ESO-A', '1ESO-B', 'ANG2', 'ANG1'];
  const sorted = [...values].sort(compararAbreviaturaUntis);
  assert(
    sorted.join('|') === '1ESO-A|1ESO-B|1ESO-C|2ESO-A|ANG1|ANG2',
    'Untis abbreviations must sort alphabetically with numeric awareness'
  );
}

function verifyTeacherCodes() {
  const places = [{ curta: 'MASS' }, { curta: 'CAÑE' }, { curta: 'GONX' }, { curta: 'GONA' }];
  assert(
    codiProfessorExport({ id: 'internal-id', codiUntis: 'MASS', nom: 'Professor de matematiques' }, places) === 'MASS',
    'The spreadsheet codiUntis value must take precedence over the Firestore document ID'
  );
  assert(
    codiProfessorExport({ codiUntis: 'cañe', nom: 'Professor' }, places) === 'CAÑE',
    'The exported professor code must preserve the exact PLACA curta value from GestIB'
  );
  const incidencies = incidenciesCodisProfessorGestib(
    [
      { nom: 'Professor correcte', codiUntis: 'GONX' },
      { nom: 'Professor incorrecte', codiUntis: 'GONZ' },
      { nom: 'Professor sense codi', codiUntis: '' },
    ],
    places
  );
  assert(
    incidencies.length === 2 && incidencies.some((item) => item.codi === 'GONZ'),
    'Teacher codes missing from PLACA curta must block the GestIB export'
  );
}

verifyActivities();
verifyGpuFiles();
verifyGroupedLessonHours();
verifyCodocenciaGroupedHours();
verifyDesdobleAttachedToTitular();
verifyGpu002ComponentRows();
verifyUntisAbbreviationSort();
verifyTeacherCodes();

console.log('Untis verification OK');
