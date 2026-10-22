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
  planUsuaris,
  planificacioPlaca,
  treuAdministracioPropia,
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

test('la fitxa d\'usuari pren el rol de Professorat i perd l\'accés qui no hi és actiu', () => {
  const professors = [
    { ...fornes, email: 'mfornes@iesjosepsuredaiblanes.com' },
    ortega,
    { ...adell, rols: ['professor', 'admin'] },
    { id: 'BAIX', nom: 'BAIXA, CAP', email: 'cap.baixa@iesjosepsuredaiblanes.com', rols: ['cap_departament'], departaments: ['Català'], eliminatDelFull: true },
  ];
  const usuaris = [
    { id: 'u1', email: 'mfornes@iesjosepsuredaiblanes.com', rol: 'professor', departament: null, departaments: [] },
    { id: 'u2', email: 'psc@iesjosepsuredaiblanes.com', rol: 'professor', departament: 'Orientació (EOSA)', departaments: ['Orientació (EOSA)'] },
    { id: 'u3', email: 'cap.baixa@iesjosepsuredaiblanes.com', rol: 'cap_departament', departament: 'Català', departaments: ['Català'] },
    { id: 'u4', email: 'antic@iesjosepsuredaiblanes.com', rol: 'cap_departament', departament: 'Música', departaments: ['Música'] },
    { id: 'u5', email: 'manual.admin@iesjosepsuredaiblanes.com', rol: 'admin' },
    { id: 'u6', email: 'madell@iesjosepsuredaiblanes.com', rol: 'professor', departament: 'Anglès', departaments: ['Anglès'] },
    { id: 'u7', email: 'pendent@iesjosepsuredaiblanes.com', rol: null },
  ];
  const canvis = Object.fromEntries(planUsuaris(usuaris, professors).map((canvi) => [canvi.uid, canvi.nou]));
  assert.deepEqual(canvis.u1, { rol: 'cap_departament', departament: 'Economia', departaments: ['Economia'] }, 'pren el rol de la fitxa activa');
  assert.equal(canvis.u2, undefined, 'la PSC ja és professora: res a canviar');
  assert.deepEqual(canvis.u3, { rol: null, departament: null, departaments: [] }, 'a Anteriors: sense accés');
  assert.deepEqual(canvis.u4, { rol: null, departament: null, departaments: [] }, 'sense fitxa i sense ser administració: sense accés');
  assert.equal(canvis.u5, undefined, 'l\'administració afegida a mà no es toca');
  assert.equal(canvis.u6.rol, 'admin', 'també es pot donar l\'administració');
  assert.equal(canvis.u7, undefined, 'qui no té fitxa ni rol continua igual');

  const exAdmin = [{ id: 'u8', email: 'madell@iesjosepsuredaiblanes.com', rol: 'admin' }];
  const senseAdmin = [{ ...adell, rols: ['professor'] }];
  assert.equal(planUsuaris(exAdmin, senseAdmin)[0].nou.rol, 'professor', 'treure l\'administració a una altra persona funciona');
  assert.deepEqual(planUsuaris(exAdmin, senseAdmin, { actorEmail: 'madell@iesjosepsuredaiblanes.com' }), [], 'però mai a qui fa el canvi');
});

test('ningú no es pot treure l\'administració a si mateix des de Professorat', () => {
  const sessio = { email: 'madell@iesjosepsuredaiblanes.com', rol: 'admin' };
  const jo = { ...adell, rols: ['professor', 'admin'] };
  assert.equal(treuAdministracioPropia({ sessio, abans: jo, despres: { ...jo, rols: ['professor'] } }), true, 'treure\'s el rol');
  assert.equal(treuAdministracioPropia({ sessio, abans: jo, despres: { ...jo, eliminatDelFull: true } }), true, 'passar-se a Anteriors');
  assert.equal(treuAdministracioPropia({ sessio, abans: jo, despres: { ...jo, email: 'altre@iesjosepsuredaiblanes.com' } }), true, 'canviar-se el correu');
  assert.equal(treuAdministracioPropia({ sessio, abans: jo, despres: { ...jo, nom: 'ADELL, MARINA' } }), false, 'canviar-se el nom sí');
  assert.equal(treuAdministracioPropia({ sessio, abans: ortega, despres: { ...ortega, eliminatDelFull: true } }), false, 'tocar una altra fitxa sí');
  assert.equal(treuAdministracioPropia({ sessio, abans: null, despres: { ...ortega, email: sessio.email } }), true, 'posar el meu correu a una fitxa sense administració');
  assert.equal(treuAdministracioPropia({ sessio: { ...sessio, rol: 'cap_departament' }, abans: jo, despres: { ...jo, rols: ['professor'] } }), false, 'qui no és administració no en perd');
});
