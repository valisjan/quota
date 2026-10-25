import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analitzarMateriaGestib,
  estatEnllac,
  proposarCorrespondencia,
  proposarCorrespondencies,
  resoldreEnllac,
  semblancaNom,
} from '../../src/utils/gestibCorrespondencia.js';

// Un tros de catàleg amb els mateixos patrons que l'XML de GestIB del centre.
const materia = (curta, descripcio, cursDescripcio) => ({ curta, descripcio, cursDescripcio });
const CATALEG = {
  materies: [
    materia('MAT-A-1E', 'Matemàtiques-A-1E', '1r ESO'),
    materia('MAT-B-1E', 'Matemàtiques-B-1E', '1r ESO'),
    materia('MAT-C-1E', 'Matemàtiques-C-1E', '1r ESO'),
    materia('MAT-E-1E', 'Matemàtiques-E-1E', '1r ESO'),
    materia('TM-ACE-1E', 'Taller de matemàtiques-ACE-1E', '1r ESO'),
    materia('LAN1-A-1B', 'Llengua estrangera I - Anglès-A-1B', '1r Batx.'),
    materia('LLA1-A-1B', 'Llatí I-A-1B', '1r Batx.'),
    materia('IPO-AAGA11', "Itinerari personal per a l'ocupabilitat-AAGA11", 'AGA11'),
    materia('AE-A-1E', 'Atenció educativa-A-1E', '1r ESO'),
    materia('EDM-ACE1-1E', 'Entorns digitals i multimèdia-ACE1-1E', '1r ESO'),
    materia('EDM-ACE2-1E', 'Entorns digitals i multimèdia-ACE2-1E', '1r ESO'),
    materia('EDM-BDF-1E', 'Entorns digitals i multimèdia-BDF-1E', '1r ESO'),
    materia('TFCR-BD-3E', 'Taller de finances i consum reponsable-BD-3E', '3r ESO'),
    materia('TFCR-ACE-3E', 'Taller de finances i consum reponsable-ACE-3E', '3r ESO'),
    materia('AE-B-3E', 'Atenció educativa-B-3E', '3r ESO'),
    materia('CT-E-3E', 'Àmbit científic i tecnològic-E-3E', '3r ESO'),
    materia('TE-AB-FQ-1B', 'Tècniques experimentals-AB-FQ-1B', '1r Batx.'),
    materia('TE-AB-BIO-1B', 'Tècniques experimentals-AB-BIO-1B', '1r Batx.'),
    materia('AE-A-1B', 'Atenció educativa-A-1B', '1r Batx.'),
    materia('Anglès professional-BAGA22', 'Anglès professional-BAGA22', 'AGA22'),
  ],
  activitats: [
    { codiGestib: '101', curta: 'Majors de 55 anys', descripcio: 'Majors de 55 anys', teAsterisc: false, codiUntis: 'MAJORSDE55ANYS' },
    { codiGestib: '102', curta: '*Majors de 55 anys', descripcio: '*Majors de 55 anys', teAsterisc: true, codiUntis: 'AMAJORSDE55ANY' },
    { codiGestib: '103', curta: '*Dedicació al departament', descripcio: '*Dedicació a cap de departament', teAsterisc: true, codiUntis: 'ADEDICACIOALDE' },
    { codiGestib: '104', curta: '*Dedicació a subdepartament', descripcio: '*Dedicació a subdepartament', teAsterisc: true, codiUntis: 'ADEDICACIOASUB' },
    { codiGestib: '105', curta: 'Coordinació', descripcio: 'Dedicació a coordinació', teAsterisc: false, codiUntis: 'COORDINACIO' },
    { codiGestib: '106', curta: '*Coordinació', descripcio: '*Dedicació a coordinació', teAsterisc: true, codiUntis: 'ACOORDINACIO' },
    { codiGestib: '107', curta: '*Dedicació a PROA+', descripcio: '*Dedicació a PROA+', teAsterisc: true, codiUntis: 'ADEDICACIOAPRO' },
    { codiGestib: '108', curta: '*Tutoria', descripcio: '*Tutoria', teAsterisc: true, codiUntis: 'ATUTORIA' },
    { codiGestib: '109', curta: 'Guàrdia de pati', descripcio: 'Guàrdia de pati', teAsterisc: false, codiUntis: 'GUARDIADEPATI' },
  ],
};

const fila = (camps) => ({ curs: '', grup: '', tipus: '', departament: '', ...camps });
const curtaActivitat = (codi) => CATALEG.activitats.find((activitat) => activitat.codiGestib === codi)?.curta || codi;

test('es llegeixen el nom, els grups i les marques de les matèries de GestIB', () => {
  assert.deepEqual(analitzarMateriaGestib(CATALEG.materies[0]), { base: 'Matemàtiques', grups: ['A'], extres: [] });
  assert.deepEqual(analitzarMateriaGestib(materia('x', 'Entorns digitals i multimèdia-ACE1-1E', '1r ESO')).grups, ['A', 'C', 'E']);
  assert.deepEqual(analitzarMateriaGestib(materia('x', 'Tècniques experimentals-AB-FQ-1B', '1r Batx.')), { base: 'Tècniques experimentals', grups: ['A', 'B'], extres: ['FQ'] });
  assert.deepEqual(analitzarMateriaGestib(materia('x', 'Anglès professional-BAGA22', 'AGA22')).grups, ['B']);
  assert.deepEqual(analitzarMateriaGestib(materia('x', 'CCS I-A-ANGAGA11', 'AGA11')), { base: 'CCS I', grups: ['A'], extres: ['ANG'] });
});

test('la semblança de noms tolera articles, números romans i una errada', () => {
  assert.equal(semblancaNom('Matemàtiques', 'Matemàtiques'), 1);
  assert.equal(semblancaNom('Consum Responsable', 'Taller de finances i consum reponsable'), 1);
  assert.equal(semblancaNom('Anglès II', 'Anglès 2'), 1);
  assert.equal(semblancaNom('Tècniques experimentals', 'Atenció educativa'), 0);
});

test('un bloc de grups enllaça una matèria per grup o el bloc sencer si GestIB el té', () => {
  const mates = proposarCorrespondencia(fila({ curs: '1ESO', grup: 'A+C+E', materia: 'Matemàtiques' }), CATALEG);
  assert.deepEqual(mates.codis, ['MAT-A-1E', 'MAT-C-1E', 'MAT-E-1E']);
  assert.equal(mates.confianca, 'segura');

  const consum = proposarCorrespondencia(fila({ curs: '3ESO', grup: 'B+D', materia: 'Consum Responsable', tipus: 'O2' }), CATALEG);
  assert.deepEqual(consum.codis, ['TFCR-BD-3E']);
});

test("la matèria de cada departament va a la seva fila (Tècniques experimentals FQ i BIO)", () => {
  const fq = proposarCorrespondencia(fila({ curs: '1BAT', grup: 'A+B', materia: 'Tècniques experimentals', tipus: 'T', departament: 'Física i Química' }), CATALEG);
  const bio = proposarCorrespondencia(fila({ curs: '1BAT', grup: 'A+B', materia: 'Tècniques experimentals', tipus: 'T', departament: 'Biologia i Geologia' }), CATALEG);
  assert.deepEqual(fq.codis, ['TE-AB-FQ-1B']);
  assert.deepEqual(bio.codis, ['TE-AB-BIO-1B']);
});

test('sense semblança de nom no es proposa res (abans sortia «Atenció educativa»)', () => {
  assert.equal(proposarCorrespondencia(fila({ curs: '1BAT', grup: 'A', materia: 'Física de prova' }), CATALEG), null);
});

test('casos reals: el nom exacte guanya, la marca «I» no basta i les sigles valen', () => {
  // «Matemàtiques» no és «Taller de matemàtiques», encara que el taller sigui un bloc ACE exacte.
  assert.deepEqual(proposarCorrespondencia(fila({ curs: '1ESO', grup: 'A+C+E', materia: 'Matemàtiques' }), CATALEG).codis, ['MAT-A-1E', 'MAT-C-1E', 'MAT-E-1E']);
  // «Anglès I» és la llengua estrangera I, no «Llatí I».
  assert.deepEqual(proposarCorrespondencia(fila({ curs: '1BAT', grup: 'A', materia: 'Anglès I' }), CATALEG).codis, ['LAN1-A-1B']);
  // Sigles: les de l'abreviatura (AE) o les inicials del nom (IPO).
  assert.deepEqual(proposarCorrespondencia(fila({ curs: '1ESO', grup: 'A', materia: 'AE' }), CATALEG).codis, ['AE-A-1E']);
  assert.deepEqual(proposarCorrespondencia(fila({ curs: 'AGA11', grup: 'A', materia: 'IPO' }), CATALEG).codis, ['IPO-AAGA11']);
});

test('dues files del mateix bloc paral·lel no es queden la mateixa matèria', () => {
  const files = [
    fila({ curs: '1ESO', grup: 'A+C+E', materia: 'Entorns digitals i multimèdia', tipus: 'O' }),
    fila({ curs: '1ESO', grup: 'A+C+E', materia: 'Entorns digitals i multimèdia', tipus: 'O' }),
  ];
  const propostes = proposarCorrespondencies(files, CATALEG);
  assert.deepEqual(propostes.map(({ proposta }) => proposta.codis), [['EDM-ACE1-1E'], ['EDM-ACE2-1E']]);
});

test('les activitats de la quota es tradueixen per regla, sense correspondències persona a persona', () => {
  const codi = (materiaQuota, extra = {}) => curtaActivitat(proposarCorrespondencia(fila({ materia: materiaQuota, ...extra }), CATALEG)?.codis[0]);
  assert.equal(codi('>55 SERRANO'), '*Majors de 55 anys');
  assert.equal(codi('>55 V. MARTÍNEZ'), '*Majors de 55 anys');
  assert.equal(codi('Cap de departament'), '*Dedicació al departament');
  assert.equal(codi('Cap de subdepartament'), '*Dedicació a subdepartament');
  assert.equal(codi('COORD LLIBRES'), '*Coordinació');
  assert.equal(codi('Coord TIC'), '*Coordinació');
  assert.equal(codi('COORD PROA+'), '*Dedicació a PROA+');
  assert.equal(codi('*Tutoria 2ESOA', { curs: '2ESO' }), '*Tutoria');
  assert.equal(codi('Guàrdia de pati', { tipus: 'GP' }), 'Guàrdia de pati');
});

test("el mapeig manual d'abans es fa servir com a proposta segura", () => {
  const mapeig = {
    'ERASMUS||||': 'ADEDICACIOALDE',
    'Anglès professional||AGA||B': 'Anglès professional-BAGA22',
  };
  assert.deepEqual(proposarCorrespondencia(fila({ materia: 'ERASMUS' }), CATALEG, { mapeig }), {
    tipus: 'activitat', codis: ['103'], confianca: 'segura', motiu: 'Mapeig manual anterior',
  });
  assert.deepEqual(proposarCorrespondencia(fila({ curs: 'AGA', grup: 'B', materia: 'Anglès professional' }), CATALEG, { mapeig }).codis, ['Anglès professional-BAGA22']);
});

test("l'enllaç desat resol la matèria de cada grup i avisa quan ja no encaixa", () => {
  const enllacada = fila({ curs: '1ESO', grup: 'A+C+E', materia: 'Matemàtiques', gestib: { tipus: 'materia', codis: ['MAT-A-1E', 'MAT-C-1E', 'MAT-E-1E'] } });
  assert.equal(resoldreEnllac({ ...enllacada, grup: 'C' }, CATALEG).curta, 'MAT-C-1E');
  assert.equal(estatEnllac(enllacada, CATALEG).estat, 'ok');
  // S'ha canviat el grup a la quota: l'enllaç ja no cobreix B.
  assert.equal(estatEnllac({ ...enllacada, grup: 'A+B' }, CATALEG).estat, 'trencat');
  assert.equal(resoldreEnllac({ ...enllacada, grup: 'B' }, CATALEG), null);
  // Canvi de currículum: el codi ja no existeix.
  assert.match(estatEnllac({ ...enllacada, gestib: { tipus: 'materia', codis: ['MAT-Z-1E'] } }, CATALEG).motiu, /MAT-Z-1E/);
  // Un bloc: tots dos grups resolen la mateixa matèria.
  const consum = fila({ curs: '3ESO', grup: 'B+D', materia: 'Consum', gestib: { tipus: 'materia', codis: ['TFCR-BD-3E'] } });
  assert.equal(resoldreEnllac({ ...consum, grup: 'D' }, CATALEG).curta, 'TFCR-BD-3E');
  assert.equal(estatEnllac(fila({ materia: 'Res' }), CATALEG).estat, 'sense');
  assert.equal(resoldreEnllac(fila({ materia: '>55 X', gestib: { tipus: 'activitat', codis: ['102'] } }), CATALEG).codiUntis, 'AMAJORSDE55ANY');
});
