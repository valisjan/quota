import test from 'node:test';
import assert from 'node:assert/strict';
import { planificarProfessors } from '../../src/utils/professorsSync.js';

const ids = (items) => items.map((item) => [item.id, item.professor.nom]);

test('un canvi de codi no mou ni esborra cap document', () => {
  // Codis desplaçats una fila: cadascú conserva el seu document.
  const existents = [
    { id: 'ARQU', nom: 'Arquer', codiUntis: 'ARQU' },
    { id: 'ARRI', nom: 'Arribas', codiUntis: 'ARRI' },
    { id: 'ARTI', nom: 'Artigues', codiUntis: 'ARTI' },
  ];
  const pla = planificarProfessors(existents, [
    { nom: 'Arquer', codiUntis: 'ARRI' },
    { nom: 'Arribas', codiUntis: 'ARTI' },
    { nom: 'Artigues', codiUntis: 'BARB' },
  ]);
  assert.deepEqual(ids(pla.actualitzar), [['ARQU', 'Arquer'], ['ARRI', 'Arribas'], ['ARTI', 'Artigues']]);
  assert.deepEqual(pla.crear, []);
  assert.deepEqual(pla.eliminar, []);
});

test('el substitut comparteix la plaça del titular sense trepitjar-ne el document', () => {
  const existents = [{ id: 'ADEL', nom: 'Adell', codiUntis: 'ADEL' }];
  const pla = planificarProfessors(existents, [
    { nom: 'Adell', codiUntis: 'ADEL' },
    { nom: 'Vial', codiUntis: 'ADEL' },
  ]);
  assert.deepEqual(ids(pla.actualitzar), [['ADEL', 'Adell']]);
  assert.deepEqual(ids(pla.crear), [[null, 'Vial']]);
  assert.deepEqual(pla.eliminar, []);
});

test('la persona que arriba a una vacant n hereta el document', () => {
  // «MAT4» era una vacant amb assignacions; ara la fila és de la persona que l'ocupa.
  const existents = [{ id: 'MAT4', nom: 'MAT4', codiUntis: 'MAT4' }, { id: 'X9', nom: 'ANGORI', codiUntis: 'ANGO' }];
  const pla = planificarProfessors(existents, [
    { nom: 'Campaña Tomàs, Miguel Ángel', codiUntis: 'MAT4' },
    { nom: 'Campillo Munné, Cristina', codiUntis: 'ANGO' },
  ]);
  assert.deepEqual(pla.actualitzar.map((item) => [item.id, item.professor.nom, item.ocupaPlaca]), [
    ['MAT4', 'Campaña Tomàs, Miguel Ángel', true],
    ['X9', 'Campillo Munné, Cristina', true],
  ]);
  assert.deepEqual(pla.crear, []);
  assert.deepEqual(pla.eliminar, []);
});

test('una vacant només l ocupa una persona; la resta tenen document propi', () => {
  const existents = [{ id: 'RAMO', nom: 'RAMO', codiUntis: 'RAMO' }];
  const pla = planificarProfessors(existents, [
    { nom: 'Titular', codiUntis: 'RAMO' },
    { nom: 'Substitut', codiUntis: 'RAMO' },
  ]);
  assert.deepEqual(ids(pla.actualitzar), [['RAMO', 'Titular']]);
  assert.deepEqual(ids(pla.crear), [[null, 'Substitut']]);
});

test('dos professors nous amb la mateixa plaça: només un pren el codi com a identificador', () => {
  const pla = planificarProfessors([], [
    { nom: 'Titular', codiUntis: 'RAMO' },
    { nom: 'Substitut', codiUntis: 'RAMO' },
    { nom: 'Sense codi', codiUntis: '' },
  ]);
  assert.deepEqual(ids(pla.crear), [['RAMO', 'Titular'], [null, 'Substitut'], [null, 'Sense codi']]);
});

test('quan torna el titular i s esborra la fila del substitut, aquest queda per eliminar', () => {
  const existents = [{ id: 'ADEL', nom: 'Adell', codiUntis: 'ADEL' }, { id: 'auto1', nom: 'Vial', codiUntis: 'ADEL' }];
  const pla = planificarProfessors(existents, [{ nom: 'Adell', codiUntis: 'ADEL' }]);
  assert.deepEqual(pla.eliminar, ['auto1']);
});

test('titular de baixa (codi «-») amb substitut: el substitut ocupa la plaça i el titular en surt', () => {
  const existents = [
    { id: 'ADEL', nom: 'ADELL DOMENECH, MARINA', codiUntis: 'ADEL' },
    { id: 'MIRA', nom: 'MIRALLES NIELL, FRANCESCA MARIA', codiUntis: 'MIRA' },
  ];
  const pla = planificarProfessors(existents, [
    { nom: 'ADELL DOMENECH, MARINA', codiUntis: '', senseCodi: true },
    { nom: 'VIAL YAGÜE, LAURA', codiUntis: 'ADEL' },
    // Guió però ningú no porta la seva plaça: és una fila normal sense codi.
    { nom: 'MIRALLES NIELL, FRANCESCA MARIA', codiUntis: '', senseCodi: true },
    // Persona nova sense codi.
    { nom: 'VILLALONGA MASSUTI, PAU', codiUntis: '', senseCodi: true },
  ]);
  assert.deepEqual(pla.actualitzar.map((item) => [item.id, item.professor.nom, item.ocupaPlaca]), [
    ['ADEL', 'VIAL YAGÜE, LAURA', true],
    ['MIRA', 'MIRALLES NIELL, FRANCESCA MARIA', false],
  ]);
  assert.deepEqual(ids(pla.crear), [[null, 'VILLALONGA MASSUTI, PAU']]);
  assert.deepEqual(pla.eliminar, []);
  assert.deepEqual(pla.titularsDeBaixa.map((baixa) => [baixa.professor.nom, baixa.docId, baixa.codiUntis, baixa.substitut?.nom]), [
    ['ADELL DOMENECH, MARINA', 'ADEL', 'ADEL', 'VIAL YAGÜE, LAURA'],
  ]);
});

test('els noms es comparen sense distingir majúscules ni espais als extrems', () => {
  const pla = planificarProfessors([{ id: 'X1', nom: 'Pol Font, Marta', codiUntis: 'POL' }], [{ nom: '  POL FONT, MARTA ', codiUntis: 'PRO1' }]);
  assert.deepEqual(ids(pla.actualitzar), [['X1', '  POL FONT, MARTA ']]);
});
