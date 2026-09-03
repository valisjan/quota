import { localDateString, xmlDayForDate } from './day.js';

export function teachingDatesBetween(from, to) {
  const start = new Date(`${from || ''}T12:00:00`);
  const end = new Date(`${to || ''}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const dates = [];
  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const value = localDateString(current);
    if (['1', '2', '3', '4', '5'].includes(xmlDayForDate(value))) dates.push(value);
  }
  return dates;
}

export function candidateRank(candidate) {
  if (candidate.unavailable) return 3;
  if (candidate.convivencia) return 2;
  if (candidate.released) return 0;
  return 1;
}

export function sortCoverageCandidates(candidates, guardCounts = new Map(), label = (candidate) => candidate.teacherId) {
  return [...candidates].sort((a, b) => {
    const rank = candidateRank(a) - candidateRank(b);
    if (rank) return rank;
    const count = (Number(guardCounts.get(a.teacherId)) || 0) - (Number(guardCounts.get(b.teacherId)) || 0);
    if (count) return count;
    return String(label(a) || '').localeCompare(String(label(b) || ''), 'ca', { numeric: true });
  });
}

export function guardCountDelta(previousAssignments = [], nextAssignments = []) {
  const result = new Map();
  previousAssignments.forEach((teacherId) => result.set(teacherId, (result.get(teacherId) || 0) - 1));
  nextAssignments.forEach((teacherId) => result.set(teacherId, (result.get(teacherId) || 0) + 1));
  return new Map(Array.from(result).filter(([, delta]) => delta !== 0));
}
