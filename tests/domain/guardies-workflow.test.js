import test from 'node:test';
import assert from 'node:assert/strict';
import { guardCountDelta, sortCoverageCandidates, teachingDatesBetween } from '../../src/modules/guardies/domain/workflow.js';

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
