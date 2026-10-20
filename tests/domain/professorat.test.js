import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campsFitxa,
  canvisClassePerNom,
  filtrarProfessors,
  fitxaPerCopiar,
  formulariDe,
  formulariSubstitut,
  ordenarProfessors,
  planDepartaments,
  planPermisos,
  planificacioPlaca,
  validarFitxa,
} from '../../src/utils/professorat.js';

const adell = {
  id: 'ADEL', nom: 'ADELL DOMENECH, MARINA', email: 'madell@iesjosepsuredaiblanes.com', codiUntis: 'ADEL',
  departament: 'Anglès', departaments: ['Anglès'], jornada: '', gpAssignades: 1, sdAssignacions: ['x'],
};
const ortega = {
  id: 'PSI1', nom: 'ORTEGA RODRÍGUEZ, LAURA', email: 'psc@iesjosepsuredaiblanes.com', codiUntis: 'PSI1',
  departaments: ['Orientació (EOSA)'], rols: ['professor', 'psc'],
};
const fornes = {
  id: 'FORN', nom: 'FORNÉS PONS, MARIA APOLONIA', email: 'mfornes', codiUntis: 'FORN',
  departament: 'Economia', rols: ['cap_departament'], jornada: 'm',
};

test('una fitxa es neteja: correu complet, codi en majúscules, rols amb la base de professor', () => {
  const fitxa = campsFitxa({ ...formulariDe(fornes), nom: '  FORNÉS  PONS, MARIA APOLONIA ', codiUntis: ' forn ' });
  assert.equal(fitxa.nom, 'FORNÉS PONS, MARIA APOLONIA');
  assert.equal(fitxa.email, 'mfornes@iesjosepsuredaiblanes.com');
  assert.equal(fitxa.codiUntis, 'FORN');
  assert.equal(fitxa.jornada, 'M');
  assert.deepEqual(fitxa.rols, ['professor', 'cap_departament']);
  assert.equal(fitxa.rol, 'cap_departament');
  assert.deepEqual(campsFitxa({ ...formulariDe(ortega) }).rols, ['professor', 'psc']);
  assert.equal(campsFitxa({ ...formulariDe(ortega) }).rol, 'professor');
});

test('validació: errors que impedeixen desar i avisos', () => {
  const llista = [adell, ortega];
  const buida = validarFitxa(campsFitxa({ nom: '', departaments: [] }), llista);
  assert.equal(buida.errors.length, 2);

  const repetit = validarFitxa(campsFitxa({ nom: 'X, Y', email: 'madell', departaments: ['Anglès'] }), llista);
  assert.ok(repetit.errors.some((error) => error.includes('ADELL')));

  const foraDomini = validarFitxa(campsFitxa({ nom: 'X, Y', email: 'y@gmail.com', departaments: ['A'] }), llista);
  assert.ok(foraDomini.errors.some((error) => error.includes('del centre')));

  // El substitut comparteix plaça: és un avís, no un error.
  const substitut = validarFitxa(campsFitxa({ ...formulariSubstitut(adell), nom: 'VIAL YAGÜE, LAURA', email: 'lvial' }), llista);
  assert.deepEqual(substitut.errors, []);
  assert.ok(substitut.avisos.some((avis) => avis.includes('plaça ADEL')));

  // Editar-se a si mateix no és un duplicat.
  assert.deepEqual(validarFitxa(campsFitxa(formulariDe(adell)), llista, 'ADEL').errors, []);
});

test('un nom que ja és a Anteriors avisa de reactivar-lo en lloc de crear-ne un de nou', () => {
  const anterior = { ...adell, eliminatDelFull: true };
  const resultat = validarFitxa(campsFitxa(formulariDe(adell)), [anterior]);
  assert.deepEqual(resultat.errors, []);
  assert.ok(resultat.avisos.some((avis) => avis.includes('Anteriors')));
});

test('filtres per text, departament, rol i jornada; ordenació per columnes', () => {
  const llista = [adell, ortega, fornes];
  assert.deepEqual(filtrarProfessors(llista, { text: 'psc' }).map((p) => p.id), ['PSI1']);
  assert.deepEqual(filtrarProfessors(llista, { departament: 'angles' }).map((p) => p.id), ['ADEL']);
  assert.deepEqual(filtrarProfessors(llista, { rol: 'psc' }).map((p) => p.id), ['PSI1']);
  assert.deepEqual(filtrarProfessors(llista, { rol: 'professor' }).map((p) => p.id), ['ADEL']);
  assert.deepEqual(filtrarProfessors(llista, { jornada: 'M' }).map((p) => p.id), ['FORN']);
  assert.deepEqual(filtrarProfessors(llista, { jornada: '*' }).length, 3);
  assert.deepEqual(ordenarProfessors(llista, 'nom').map((p) => p.id), ['ADEL', 'FORN', 'PSI1']);
  assert.deepEqual(ordenarProfessors(llista, 'nom', 'desc').map((p) => p.id), ['PSI1', 'FORN', 'ADEL']);
  assert.deepEqual(ordenarProfessors(llista, 'departament').map((p) => p.id), ['ADEL', 'FORN', 'PSI1']);
});

test('els permisos segueixen el professorat actiu', () => {
  const actuals = [
    { id: 'madell@iesjosepsuredaiblanes.com', email: 'madell@iesjosepsuredaiblanes.com', nom: 'ADELL DOMENECH, MARINA', codiUntis: 'ADEL', rol: 'professor', rols: ['professor'], departament: 'Anglès', departaments: ['Anglès'] },
    { id: 'antic@iesjosepsuredaiblanes.com', email: 'antic@iesjosepsuredaiblanes.com', rol: 'professor' },
  ];
  const pla = planPermisos([adell, ortega, { ...fornes, eliminatDelFull: true }], actuals);
  assert.deepEqual(pla.escriure.map((p) => [p.email, p.rol, p.rols]), [
    ['psc@iesjosepsuredaiblanes.com', 'professor', ['professor', 'psc']],
  ]);
  assert.deepEqual(pla.esborrar, ['antic@iesjosepsuredaiblanes.com']);
});

test('els departaments surten del professorat actiu', () => {
  const pla = planDepartaments([adell, ortega, { ...fornes, eliminatDelFull: true }], [
    { id: 'd1', nom: 'Angles' },
    { id: 'd2', nom: 'Economia' },
  ]);
  assert.deepEqual(pla.afegir, ['Orientació (EOSA)']);
  assert.deepEqual(pla.eliminar, ['d2']);
});

test('canviar el nom actualitza les classes que el fan servir', () => {
  const classe = { professors: ['A, B', 'C, D'], participants: ['A, B'], professorAssignat: 'A, B' };
  assert.deepEqual(canvisClassePerNom(classe, 'A, B', 'A, Bea'), {
    professors: ['A, Bea', 'C, D'], participants: ['A, Bea'], professorAssignat: 'A, Bea',
  });
  assert.equal(canvisClassePerNom({ professors: ['C, D'] }, 'A, B', 'A, Bea'), null);
});

test('substitució: el substitut hereta la plaça i la planificació; la còpia de curs no', () => {
  const formulari = formulariSubstitut(adell);
  assert.equal(formulari.codiUntis, 'ADEL');
  assert.deepEqual(formulari.departaments, ['Anglès']);
  const placa = planificacioPlaca(adell);
  assert.equal(placa.gpAssignades, 1);
  assert.deepEqual(placa.sdAssignacions, ['x']);
  assert.deepEqual(placa.ddAssignacions, []);
  const copia = fitxaPerCopiar(adell);
  assert.equal(copia.gpAssignades, 0);
  assert.deepEqual(copia.sdAssignacions, []);
  assert.equal(copia.codiUntis, 'ADEL');
});
