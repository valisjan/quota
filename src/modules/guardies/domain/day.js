export function xmlDayForDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDay();
  return day === 0 ? '7' : String(day);
}
export function localDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function dateForXmlDayInSameWeek(baseValue, xmlDay) {
  const base = new Date(`${baseValue || localDateString(new Date())}T12:00:00`);
  const target = xmlDay === '7' ? 0 : Number(xmlDay);
  if (Number.isNaN(base.getTime()) || !Number.isInteger(target) || target < 0 || target > 6) return '';
  base.setDate(base.getDate() + target - base.getDay());
  return localDateString(base);
}

export function selectedAbsencesForDate(absences, date) {
  const day = xmlDayForDate(date);
  return Array.from(absences?.values?.() || []).filter((item) => item.dia === day);
}

export function isTeacherAbsentAtSlot(absences, day, hour, teacherId) {
  return Array.from(absences?.values?.() || [])
    .some((item) => item.dia === day && item.hora === hour && item.placa === teacherId);
}

const STANDARD_TEACHING_STARTS = [480, 535, 590, 675, 730, 785, 840];

function minutesFromHour(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function hourFromMinutes(value, padded) {
  const hours = String(Math.floor(value / 60));
  const minutes = String(value % 60).padStart(2, '0');
  return `${padded ? hours.padStart(2, '0') : hours}:${minutes}`;
}

export function completeGuardDutyHours(values = []) {
  const source = Array.from(new Set(values.filter((value) => value && value !== 'PATI')));
  const byMinutes = new Map();
  source.forEach((value) => {
    const minutes = minutesFromHour(value);
    if (minutes !== null && !byMinutes.has(minutes)) byMinutes.set(minutes, value);
  });
  const standardMatches = STANDARD_TEACHING_STARTS.filter((minutes) => byMinutes.has(minutes)).length;
  const padded = source.some((value) => /^0\d:\d{2}$/.test(String(value)));
  const teachingHours = standardMatches >= 4
    ? STANDARD_TEACHING_STARTS.map((minutes) => byMinutes.get(minutes) || hourFromMinutes(minutes, padded))
    : source.sort((a, b) => {
      const minutesA = minutesFromHour(a);
      const minutesB = minutesFromHour(b);
      if (minutesA !== null && minutesB !== null) return minutesA - minutesB;
      if (minutesA !== null) return -1;
      if (minutesB !== null) return 1;
      return String(a).localeCompare(String(b), 'ca', { numeric: true });
    });

  teachingHours.splice(Math.min(3, teachingHours.length), 0, 'PATI');
  return teachingHours;
}

function sorted(values) {
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
}

export function groupTeachingBlocks(sessions) {
  const blocks = new Map();
  sessions.forEach((session) => {
    const key = [session.placa, session.dia, session.hora].join('|');
    if (!blocks.has(key)) {
      blocks.set(key, {
        id: `released|${key}`,
        placa: session.placa,
        dia: session.dia,
        diaLabel: session.diaLabel,
        hora: session.hora,
        materias: new Set(),
        materiasLabels: new Set(),
        aules: new Set(),
        aulesLabels: new Set(),
        cursos: new Set(),
        cursosVisibles: new Set(),
        grups: new Set(),
        grupsVisibles: new Set(),
        sessions: [],
      });
    }
    const block = blocks.get(key);
    if (session.materia) block.materias.add(session.materia);
    if (session.materiaCurta || session.materiaNom) block.materiasLabels.add(session.materiaCurta || session.materiaNom);
    if (session.aula) block.aules.add(session.aula);
    if (session.aulaNom) block.aulesLabels.add(session.aulaNom);
    if (session.curs) block.cursos.add(session.curs);
    if (session.cursVisible) block.cursosVisibles.add(session.cursVisible);
    if (session.grup) block.grups.add(session.grup);
    if (session.grupVisible) block.grupsVisibles.add(session.grupVisible);
    block.sessions.push(session);
  });

  return Array.from(blocks.values()).map((block) => ({
    ...block,
    materia: sorted(block.materias).join('|'),
    materiaCurta: sorted(block.materiasLabels).join(' + '),
    materiaNom: '',
    aula: sorted(block.aules).join('|'),
    aulaNom: sorted(block.aulesLabels).join(' + '),
    cursos: sorted(block.cursos),
    cursosVisibles: sorted(block.cursosVisibles),
    grups: sorted(block.grups),
    grupsVisibles: sorted(block.grupsVisibles),
  }));
}

export function releasedTeachingBlocks({ sessions, date, groupsOut, enabledTeachersByGroup }) {
  const day = xmlDayForDate(date);
  if (!groupsOut?.size || !day) return [];
  return groupTeachingBlocks(sessions.filter((session) => session.dia === day && session.teClasse))
    .filter((block) => block.grups.length && block.grups.every((groupId) => (
      groupsOut.has(groupId) && enabledTeachersByGroup.get(groupId)?.has(`${block.hora}|${block.placa}`)
    )));
}
