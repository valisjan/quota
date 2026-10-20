import test from 'node:test';
import assert from 'node:assert/strict';
import { llegirRols, rolQuota } from '../../src/utils/rolsProfessorat.js';

test('llegeix diversos rols separats per comes, amb espais o sense', () => {
  assert.deepEqual(llegirRols('cap_departament, PSC').rols, ['cap_departament', 'psc']);
  assert.deepEqual(llegirRols('admin,psc').rols, ['admin', 'psc']);
  assert.deepEqual(llegirRols('  Admin ,  PSC  ').rols, ['admin', 'psc']);
  assert.deepEqual(llegirRols('psc; cap_departament').rols, ['psc', 'cap_departament']);
});

test('accepta majúscules, espais i guions dins del nom del rol', () => {
  assert.deepEqual(llegirRols('Cap departament').rols, ['cap_departament']);
  assert.deepEqual(llegirRols('cap-departament').rols, ['cap_departament']);
});

test('cel·les buides, repeticions i rols desconeguts', () => {
  assert.deepEqual(llegirRols(''), { rols: [], desconeguts: [] });
  assert.deepEqual(llegirRols(', ,').rols, []);
  assert.deepEqual(llegirRols('psc, PSC').rols, ['psc']);
  assert.deepEqual(llegirRols('cap_deparament, psc'), { rols: ['psc'], desconeguts: ['cap_deparament'] });
});

test('el rol de Quota és el de més drets; la PSC hi compta com a professora', () => {
  assert.equal(rolQuota(['psc']), 'professor');
  assert.equal(rolQuota([]), 'professor');
  assert.equal(rolQuota(['psc', 'cap_departament']), 'cap_departament');
  assert.equal(rolQuota(['professor', 'admin']), 'admin');
  assert.equal(rolQuota(llegirRols('departament, cap_departament').rols), 'cap_departament');
});
