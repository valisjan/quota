import test from 'node:test';
import assert from 'node:assert/strict';
import {
  guardCountDelta,
  normalizeGuardCount,
  sortCoverageCandidates,
  teachingDatesBetween,
  updateGuardCounts,
} from '../../src/modules/guardies/domain/workflow.js';

test('genera només dies lectius dins un interval', () => {
  assert.deepEqual(teachingDatesBetween('2026-09-04', '2026-09-08'), [
    '2026-09-04', '2026-09-07', '2026-09-08',
  ]);
});

test('ordena alliberats, guàrdies i convivència pel recompte anual', () => {
  const candidates = [
    { teacherId: 'conv', convivencia: true },
    { teacherId: 'g2' },
    { teacherId: 'rel', released: true },
    { teacherId: 'g1' },
  ];
  const counts = new Map([['g1', 8], ['g2', 2], ['rel', 20], ['conv', 0]]);
  assert.deepEqual(sortCoverageCandidates(candidates, counts).map((item) => item.teacherId), ['rel', 'g2', 'g1', 'conv']);
});

test('calcula el delta en reobrir i tornar a tancar una jornada', () => {
  assert.deepEqual(Object.fromEntries(guardCountDelta(['A', 'B'], ['B', 'C', 'C'])), { A: -1, C: 2 });
});

test('conserva separats els recomptes com a alliberat i com a guàrdia', () => {
  assert.deepEqual(normalizeGuardCount({ total: 5, released: 2, guard: 3 }), {
    total: 5,
    released: 2,
    guard: 3,
    other: 0,
  });
  assert.deepEqual(normalizeGuardCount(4), {
    total: 4,
    released: 0,
    guard: 0,
    other: 4,
  });

  const closed = updateGuardCounts({}, [], [
    { teacherId: 'A', source: 'released' },
    { teacherId: 'A', source: 'guard' },
  ]);
  assert.deepEqual(closed.A, { total: 2, released: 1, guard: 1, other: 0 });

  const corrected = updateGuardCounts(closed, [
    { teacherId: 'A', source: 'released' },
    { teacherId: 'A', source: 'guard' },
  ], [
    { teacherId: 'A', source: 'guard' },
  ]);
  assert.deepEqual(corrected.A, { total: 1, released: 0, guard: 1, other: 0 });
});
