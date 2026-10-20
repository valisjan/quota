import test from 'node:test';
import assert from 'node:assert/strict';
import { correuSemblaDe, validarProfessorat } from '../../src/utils/validacioProfessorat.js';

const tipus = (riscos) => riscos.map((risc) => `${risc.severitat}:${risc.tipus}`);

test('el correu encaixa amb inicials, sobrenoms i les dues formes de la ñ', () => {
  assert.equal(correuSemblaDe('madell@x.com', 'ADELL DOMENECH, MARINA'), true);
  assert.equal(correuSemblaDe('mlbarba@x.com', 'BARBA GALINDO, MARÍA LINAREJOS'), true);
  assert.equal(correuSemblaDe('tadrover@x.com', 'ADROVER GOMILA, BARTOMEU'), true);
  assert.equal(correuSemblaDe('algonzalez@x.com', 'GONZALEZ LOPEZ, ALBA'), true);
  assert.equal(correuSemblaDe('ccanellas@x.com', 'CAÑELLAS ORTEGA, MARIA DEL CARMEN'), true);
  assert.equal(correuSemblaDe('macampanya@x.com', 'CAMPAÑA TOMÀS, MIGUEL ÁNGEL'), true);
  assert.equal(correuSemblaDe('tnavarro@x.com', 'NAVARRO ESCRIBANO, MARIA PILAR'), false);
  assert.equal(correuSemblaDe('psc@x.com', 'ORTEGA RODRÍGUEZ, LAURA'), false);
});

test('detecta la columna de codis desplaçada en ordenar el full', () => {
  const existents = [
    { nom: 'ARQUER PRATS, MERITXELL', codiUntis: 'ARQU' },
    { nom: 'ARRIBAS FERRER, HONORIO', codiUntis: 'ARRI' },
    { nom: 'ARTIGUES MORELL, BERNAT', codiUntis: 'ARTI' },
  ];
  const riscos = validarProfessorat([
    { nom: 'ARQUER PRATS, MERITXELL', codiUntis: 'ARRI' },
    { nom: 'ARRIBAS FERRER, HONORIO', codiUntis: 'ARTI' },
    { nom: 'ARTIGUES MORELL, BERNAT', codiUntis: 'BARB' },
  ], existents);
  assert.deepEqual(tipus(riscos), ['critic:codi_desplacat', 'critic:codi_desplacat']);
});

test('substituts, vacants ocupades i canvis de codi legítims no són crítics', () => {
  const existents = [
    { nom: 'ADELL DOMENECH, MARINA', codiUntis: 'ADEL' },
    { nom: 'MAT4', codiUntis: 'MAT4' },
    { nom: 'SOLER BARRENO, JOSÉ MANUEL', codiUntis: 'SOLE' },
  ];
  const riscos = validarProfessorat([
    { nom: 'ADELL DOMENECH, MARINA', codiUntis: 'ADEL' },
    { nom: 'VIAL YAGÜE, LAURA', codiUntis: 'ADEL' },
    { nom: 'CAMPAÑA TOMÀS, MIGUEL ÁNGEL', codiUntis: 'MAT4' },
    { nom: 'SOLER BARRENO, JOSÉ MANUEL', codiUntis: 'RELI' },
  ], existents);
  assert.deepEqual(riscos, []);
});

test('un correu que és d\'una altra persona del full és crític; un compte genèric només avisa', () => {
  const riscos = validarProfessorat([
    { nom: 'RIGO MAS, NEUS', email: 'jrigo@iesjosepsuredaiblanes.com' },
    { nom: 'RIGO PONS, JAUME', email: 'nrigo@iesjosepsuredaiblanes.com' },
    { nom: 'GONZÁLEZ SASTRE, JOAN', email: 'fjgonzalez@iesjosepsuredaiblanes.com' },
    { nom: 'GONZALEZ PAVON, FCO JAVIER', email: 'jgonzalez@iesjosepsuredaiblanes.com' },
    { nom: 'ORTEGA RODRÍGUEZ, LAURA', email: 'psc@iesjosepsuredaiblanes.com' },
  ]);
  assert.deepEqual(tipus(riscos), [
    'critic:correu_d_altri', 'critic:correu_d_altri', 'critic:correu_d_altri', 'avis:correu_sospitos',
  ]);
  assert.ok(riscos[0].detall.includes('RIGO PONS, JAUME'));
});

test('detecta correus desplaçats en cadena (no només intercanvis de dues files)', () => {
  const riscos = validarProfessorat([
    { nom: 'VILLALONGA MASSUTI, PAU', email: 'fmiralles@iesjosepsuredaiblanes.com' },
    { nom: 'MIRALLES NIELL, FRANCESCA MARIA', email: 'aramon@iesjosepsuredaiblanes.com' },
    { nom: 'RAMON ANEAS, AINA', email: 'pvillalonga@iesjosepsuredaiblanes.com' },
  ]);
  assert.deepEqual(tipus(riscos), ['critic:correu_d_altri', 'critic:correu_d_altri', 'critic:correu_d_altri']);
  assert.ok(riscos[0].detall.includes('MIRALLES NIELL'));
});

test('correus repetits o d un altre domini, noms repetits i rols desconeguts són crítics', () => {
  const riscos = validarProfessorat([
    { nom: 'A, B', email: 'ba@iesjosepsuredaiblanes.com' },
    { nom: 'A, B', email: 'ba@iesjosepsuredaiblanes.com' },
    { nom: 'C, D', email: 'dc@gmail.com' },
    { nom: 'E, F', email: 'fe@iesjosepsuredaiblanes.com', rolsDesconeguts: ['cap_deparament'] },
  ]);
  assert.deepEqual(tipus(riscos).sort(), [
    'critic:correu_invalid', 'critic:correu_repetit', 'critic:nom_repetit', 'critic:rol_desconegut',
  ]);
});
