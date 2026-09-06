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

export function normalizeGuardCount(value) {
  if (value && typeof value === 'object') {
    const released = Math.max(0, Number(value.released) || 0);
    const guard = Math.max(0, Number(value.guard) || 0);
    const other = Math.max(0, Number(value.other) || 0);
    return {
      total: Math.max(released + guard + other, Number(value.total) || 0),
      released,
      guard,
      other,
    };
  }
  const total = Math.max(0, Number(value) || 0);
  return { total, released: 0, guard: 0, other: total };
}

export function normalizeCountedAssignment(value) {
  const teacherId = typeof value === 'string' ? value : value?.teacherId;
  if (!teacherId) return null;
  const source = ['released', 'guard'].includes(value?.source) ? value.source : 'other';
  return { teacherId, source };
}

function frequencyBySource(values) {
  return values.reduce((result, raw) => {
    const value = normalizeCountedAssignment(raw);
    if (!value) return result;
    result[value.teacherId] ||= { total: 0, released: 0, guard: 0, other: 0 };
    result[value.teacherId].total += 1;
    result[value.teacherId][value.source] += 1;
    return result;
  }, {});
}

export function updateGuardCounts(currentCounts, previousAssignments, nextAssignments) {
  const previous = frequencyBySource(previousAssignments);
  const next = frequencyBySource(nextAssignments);
  const counts = { ...(currentCounts || {}) };
  new Set([...Object.keys(previous), ...Object.keys(next)]).forEach((teacherId) => {
    const current = normalizeGuardCount(counts[teacherId]);
    const before = previous[teacherId] || { total: 0, released: 0, guard: 0, other: 0 };
    const after = next[teacherId] || { total: 0, released: 0, guard: 0, other: 0 };
    counts[teacherId] = {
      total: Math.max(0, current.total + after.total - before.total),
      released: Math.max(0, current.released + after.released - before.released),
      guard: Math.max(0, current.guard + after.guard - before.guard),
      other: Math.max(0, current.other + after.other - before.other),
    };
  });
  return counts;
}

export function sortCoverageCandidates(candidates, guardCounts = new Map(), label = (candidate) => candidate.teacherId) {
  return [...candidates].sort((a, b) => {
    const rank = candidateRank(a) - candidateRank(b);
    if (rank) return rank;
    const count = normalizeGuardCount(guardCounts.get(a.teacherId)).total
      - normalizeGuardCount(guardCounts.get(b.teacherId)).total;
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
