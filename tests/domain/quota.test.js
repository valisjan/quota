import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campsClasse,
  canvisClasse,
  classePerCopiar,
  compararClasses,
  errorsClasse,
  formatDecimal,
  formatProfessorat,
  llegirFilesEnganxades,
  llegirTipus,
  novaClasse,
  resumDepartaments,
  totalsQuota,
} from '../../src/utils/quota.js';

test('el tipus s\'accepta pel codi o amb el text de la pestanya Tipus del full', () => {
  assert.equal(llegirTipus('o1'), 'O1');
  assert.equal(llegirTipus('O - Optativa 1a franja'), 'O1');
  assert.equal(llegirTipus('O - Optativa 3a frnaja'), 'O3');
  assert.equal(llegirTipus('O - Optativa 1r i 2n ESO'), 'O');
  assert.equal(llegirTipus('SD - Suport divisible'), 'SD');
  assert.equal(llegirTipus('CO - Coordinació sense membres'), 'CO');
  assert.equal(llegirTipus('Codocència'), 'CD');
  assert.equal(llegirTipus('Normal'), '');
  assert.equal(llegirTipus(''), '');
  assert.equal(llegirTipus('A2'), 'A2');
});

test('una fila es neteja com ho feia la sincronització del full', () => {
  assert.deepEqual(campsClasse({ curs: ' 2eso ', grup: 'bdf', materia: ' Cultura  clàssica I ', hores: '2', tipus: 'O' }), {
    curs: '2ESO', grup: 'B+D+F', materia: 'Cultura clàssica I', hores: 2, tipus: 'O',
  });
  assert.equal(campsClasse({ grup: 'A+C' }).grup, 'A+C');
  assert.equal(campsClasse({ hores: '1,5' }).hores, 1.5);
  assert.deepEqual(errorsClasse(campsClasse({ materia: 'Tutoria', hores: '0' })), ['Cal un nombre d\'hores més gran que 0.']);
  assert.deepEqual(errorsClasse(campsClasse({ hores: 3 })), ['Cal la matèria.']);
});

test('una classe nova no té professorat i porta el departament de la targeta', () => {
  const classe = novaClasse(campsClasse({ curs: '1ESO', grup: 'ACE', materia: 'Geografia i història', hores: 9 }), 'Geografia i Història');
  assert.equal(classe.departament, 'Geografia i Història');
  assert.deepEqual(classe.departaments, ['Geografia i Història']);
  assert.deepEqual(classe.professors, []);
  assert.equal(classe.professorAssignat, '');
  assert.equal(classe.grup, 'A+C+E');
});

test('una edició només desa el que canvia i moure de departament actualitza tots dos camps', () => {
  const classe = { id: 'x', curs: '1ESO', grup: 'A', materia: 'Matemàtiques', hores: 4, tipus: 'F', departament: 'Matemàtiques', departaments: ['Matemàtiques'], professors: ['PERE'] };
  assert.deepEqual(canvisClasse(classe, { hores: '4', materia: 'Matemàtiques' }), {});
  assert.deepEqual(canvisClasse(classe, { hores: '5' }), { hores: 5 });
  assert.deepEqual(canvisClasse(classe, { hores: '0' }), {});
  assert.deepEqual(canvisClasse(classe, { grup: 'ab' }), { grup: 'A+B' });
  assert.deepEqual(canvisClasse(classe, { tipus: '' }), { tipus: '' });
  assert.deepEqual(canvisClasse(classe, { departament: 'Física i Química' }), {
    departament: 'Física i Química', departaments: ['Física i Química'],
  });
});

test('una classe multicurs conserva curs, grup i matèria i les hores passen a les subclasses', () => {
  const classe = {
    curs: 'AGA22+AGA23+AGA25', grup: 'B', materia: 'Anglès professional', hores: 2, tipus: '',
    subclasses: [{ curs: 'AGA22', grup: 'B', materia: 'Anglès professional-BAGA22', hores: 2 }],
  };
  assert.deepEqual(canvisClasse(classe, { curs: 'AGA22', materia: 'Altra' }), {});
  assert.deepEqual(canvisClasse(classe, { hores: 3 }), {
    hores: 3,
    subclasses: [{ curs: 'AGA22', grup: 'B', materia: 'Anglès professional-BAGA22', hores: 3 }],
  });
});

test('copiar la quota d\'un altre curs no copia el repartiment', () => {
  const copia = classePerCopiar({
    id: 'vella', curs: '1BAT', grup: 'B', materia: 'LLATÍ I', hores: 4, tipus: 'O1', departament: 'Cultura Clàssica',
    professors: ['ANNA'], professorAssignat: 'ANNA', participants: ['ANNA'], lastModified: 'ahir',
  });
  assert.equal(copia.id, undefined);
  assert.equal(copia.lastModified, undefined);
  assert.deepEqual(copia.professors, []);
  assert.equal(copia.professorAssignat, '');
  assert.deepEqual(copia.departaments, ['Cultura Clàssica']);
  assert.equal(copia.tipus, 'O1');
});

test('es poden enganxar files de la pestanya Quota o d\'una taula de quatre o cinc columnes', () => {
  const text = [
    'CURS\tGRUP\tMATÈRIA\t\tDEPARTAMENT\tTIPUS',
    '2ESO\tBDF\tCultura clàssica I\t2\tCultura Clàssica\tO - Optativa 1r i 2n ESO',
    '\t\tCap de subdepartament\t1\tCultura Clàssica\t',
    '1BAT\tB\tLLATÍ I\t4\tO1',
    '4ESO\tA\tLlatí\t3',
    '',
    '\t\tFila buida d\'hores\t\tCultura Clàssica\t',
  ].join('\r\n');
  const { files, ignorades } = llegirFilesEnganxades(text);
  assert.deepEqual(files, [
    { curs: '2ESO', grup: 'B+D+F', materia: 'Cultura clàssica I', hores: 2, tipus: 'O' },
    { curs: '', grup: '', materia: 'Cap de subdepartament', hores: 1, tipus: '' },
    { curs: '1BAT', grup: 'B', materia: 'LLATÍ I', hores: 4, tipus: 'O1' },
    { curs: '4ESO', grup: 'A', materia: 'Llatí', hores: 3, tipus: '' },
  ]);
  assert.equal(ignorades.length, 1);
  assert.equal(ignorades[0].fila, 7);
});

test('les classes s\'ordenen per etapa, nivell, grup i matèria, i les de sense curs al final', () => {
  const classes = [
    { curs: '', materia: 'Cap de departament' },
    { curs: '2BAT', grup: 'A', materia: 'Història' },
    { curs: 'AGA22', grup: 'B', materia: 'Anglès' },
    { curs: '2ESO', grup: 'B', materia: 'Tecno' },
    { curs: '1ESO', grup: 'A', materia: 'Mates' },
    { curs: '2ESO', grup: 'A', materia: 'Tecno' },
  ].sort(compararClasses);
  assert.deepEqual(classes.map((classe) => `${classe.curs}${classe.grup || ''}`), ['1ESOA', '2ESOA', '2ESOB', '2BATA', 'AGA22B', '']);
});

test('cada departament suma les hores com el TOTAL del full i les compara amb el seu professorat', () => {
  const classes = [
    { id: '1', departament: 'Música', hores: 18 },
    { id: '2', departament: 'Música', hores: 12 },
    { id: '3', departament: 'Música', hores: 6 },
    { id: '4', departament: 'Filosofia', hores: 19 },
  ];
  const professors = [
    { nom: 'A', departaments: ['Música'], jornada: '' },
    { nom: 'B', departament: 'musica', jornada: 'M' },
    { nom: 'C', departaments: ['Música', 'Filosofia'], jornada: '', eliminatDelFull: true },
    { nom: 'D', departaments: ['Filosofia'], jornada: '' },
  ];
  const resums = resumDepartaments(classes, professors, ['Alemany', 'Música']);
  assert.deepEqual(resums.map((resum) => resum.nom), ['Alemany', 'Filosofia', 'Música']);
  const musica = resums.find((resum) => resum.nom === 'Música');
  assert.equal(musica.hores, 36);
  assert.equal(musica.places, 2);
  assert.equal(musica.professors, 2);
  assert.equal(formatProfessorat(musica), '1+1');
  assert.equal(musica.capacitat, 27);
  assert.equal(musica.balanc, -9);
  const filosofia = resums.find((resum) => resum.nom === 'Filosofia');
  assert.equal(formatDecimal(filosofia.places), '1,1');
  assert.equal(filosofia.balanc, -1);
  assert.equal(resums.find((resum) => resum.nom === 'Alemany').classes.length, 0);

  const totals = totalsQuota(resums);
  assert.equal(totals.hores, 55);
  assert.equal(totals.professors, 3);
  assert.equal(totals.balanc, -10);
});

test('les xifres es mostren amb coma i sense decimals sobrers', () => {
  assert.equal(formatDecimal(127 / 18), '7,1');
  assert.equal(formatDecimal(2), '2');
  assert.equal(formatDecimal(9.96), '10');
  assert.equal(formatDecimal(-3.5), '-3,5');
});
