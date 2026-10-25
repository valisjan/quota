import { expect, test } from '@playwright/test';
import { CLASSES, GESTIB_XML, PROFESSORS } from './fixtures/untis-curs.js';

// Exportació a Untis amb un curs inventat complet (fixtures/untis-curs.js) i un XML de
// GestIB amb la mateixa estructura que el real. El generador s'executa al navegador perquè
// llegeix l'XML amb DOMParser, igual que a la pàgina Untis.

// Una línia GPU: camps separats per comes; els textos van entre cometes i poden portar comes.
function campsGpu(linia) {
  const camps = [];
  let actual = '';
  let dinsCometes = false;
  for (const caracter of linia) {
    if (caracter === '"') dinsCometes = !dinsCometes;
    else if (caracter === ',' && !dinsCometes) {
      camps.push(actual);
      actual = '';
    } else actual += caracter;
  }
  camps.push(actual);
  return camps;
}

const linies = (contingut) => contingut.split('\r\n').filter(Boolean);
const fitxer = (exportacio, nom) => exportacio.fitxers.find((item) => item.nom === nom)?.contingut || '';

async function generar(page, opcions) {
  return page.evaluate(async ({ classes, professors, xml }) => {
    const { generarExportUntis } = await import('/src/services/gpuFormatter.js');
    try {
      const exportacio = generarExportUntis({ classes, professors, referenciaGestibXmlText: xml });
      return { fitxers: exportacio.fitxers, pendents: exportacio.pendents.map((p) => `${p.motiu}: ${p.classe.materia}`) };
    } catch (error) {
      return { error: error.message };
    }
  }, opcions);
}

// GPU002, camps (comptant des de 0): 0 número de lliçó, 2 hores que compten al grup,
// 3 hores que compten al professor, 4 grup, 5 professor, 6 matèria.
function sumaPer(gpu002, filtre, camp) {
  return linies(gpu002)
    .map(campsGpu)
    .filter(filtre)
    .reduce((suma, camps) => suma + (Number(camps[camp]) || 0), 0);
}

test.describe('Exportació a Untis', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-mobile', 'Prova de dades: n\'hi ha prou amb un navegador.');
    await page.goto('/');
  });

  test('genera els fitxers GPU amb els codis de GestIB i les hores ben repartides', async ({ page }) => {
    const exportacio = await generar(page, { classes: CLASSES, professors: PROFESSORS, xml: GESTIB_XML });
    expect(exportacio.error).toBeUndefined();
    expect(exportacio.fitxers.map((item) => item.nom)).toEqual([
      'GPU003.TXT', 'GPU004.TXT', 'GPU006.TXT', 'GPU002.TXT', 'GPU000_REVISIO_EXPORTACIO.TXT',
    ]);
    // Untis espera salts de línia de Windows.
    exportacio.fitxers.forEach((item) => expect(item.contingut.replace(/\r\n/g, '')).not.toMatch(/\n/));

    // GPU003: els grups. GPU004: el professorat actiu amb el codi de la seva plaça i la jornada.
    expect(linies(fitxer(exportacio, 'GPU003.TXT')).map((linia) => campsGpu(linia)[0])).toEqual(['1ESO-A', '1ESO-B']);
    const professorat = linies(fitxer(exportacio, 'GPU004.TXT')).map(campsGpu);
    expect(professorat.map((camps) => [camps[0], camps[1], camps[14]])).toEqual([
      ['CAT1', 'COLL VIDAL, CLARA', '18'],
      ['MAT1', 'ARNAU ROS, ANNA', '18'],
      ['MAT2', 'BOSCH PONS, BERNAT', '9'],
      ['TEC1', 'DURAN MAS, DAVID', '18'],
    ]);

    // GPU006: les matèries amb l'abreviatura curta de GestIB.
    const materies = linies(fitxer(exportacio, 'GPU006.TXT')).map((linia) => campsGpu(linia)[0]);
    expect(materies).toEqual(expect.arrayContaining(['MAT-A-1E', 'MAT-B-1E', 'LCL-A-1E', 'TEC-AB-1E']));

    const gpu002 = fitxer(exportacio, 'GPU002.TXT');
    linies(gpu002).forEach((linia) => expect(campsGpu(linia)).toHaveLength(47));
    const ambGrup = (grup, materia) => (camps) => camps[4] === grup && camps[6] === materia;

    // Matemàtiques de 1r A: 4 h de grup (3 h amb ANNA i 1 h desdoblada amb BERNAT, comptada un cop).
    expect(sumaPer(gpu002, ambGrup('1ESO-A', 'MAT-A-1E'), 2)).toBe(4);
    expect(sumaPer(gpu002, (c) => ambGrup('1ESO-A', 'MAT-A-1E')(c) && c[5] === 'MAT1', 3)).toBe(4);
    expect(sumaPer(gpu002, (c) => ambGrup('1ESO-A', 'MAT-A-1E')(c) && c[5] === 'MAT2', 3)).toBe(1);
    const desdoblament = linies(gpu002).map(campsGpu).filter((c) => ambGrup('1ESO-A', 'MAT-A-1E')(c) && c[1] === '1');
    expect(new Set(desdoblament.map((c) => c[0])).size).toBe(1);
    expect(desdoblament.map((c) => c[5]).sort()).toEqual(['MAT1', 'MAT2']);

    // Una classe de dos grups (Tecnologia A+B, 2 h) és 1 h a cada grup, totes del mateix professor.
    expect(sumaPer(gpu002, ambGrup('1ESO-A', 'TEC-AB-1E'), 2)).toBe(1);
    expect(sumaPer(gpu002, ambGrup('1ESO-B', 'TEC-AB-1E'), 2)).toBe(1);
    expect(sumaPer(gpu002, (c) => c[4] && c[5] === 'TEC1', 3)).toBe(2);

    // Hores lectives amb grup de cada professor, com a la quota.
    expect(sumaPer(gpu002, (c) => c[4] && c[5] === 'MAT1', 3)).toBe(4);
    expect(sumaPer(gpu002, (c) => c[4] && c[5] === 'MAT2', 3)).toBe(5);
    expect(sumaPer(gpu002, (c) => c[4] && c[5] === 'CAT1', 3)).toBe(3);

    // Activitats sense grup: càrrec de cap de departament, tutoria, guàrdia de pati i, per a
    // tothom, l'hora d'atenció a famílies i la de reunió de departament.
    expect(sumaPer(gpu002, (c) => !c[4] && c[5] === 'CAT1' && c[6] === 'ADEDICACIOALDE', 3)).toBe(3);
    expect(sumaPer(gpu002, (c) => !c[4] && c[5] === 'MAT1' && c[6] === 'ATUTORIA', 3)).toBe(1);
    expect(sumaPer(gpu002, (c) => c[5] === 'MAT1' && c[6] === 'GP', 3)).toBe(1);
    ['MAT1', 'MAT2', 'CAT1', 'TEC1'].forEach((codi) => {
      expect(sumaPer(gpu002, (c) => c[5] === codi && c[17] === 'Reunió departament', 3)).toBe(1);
    });

    // El que no s'exporta: la classe sense professor (surt a la revisió), la coordinació (no
    // lectiva) i el professorat que ja no és al centre.
    expect(gpu002).not.toContain('LCL-B-1E');
    expect(gpu002).not.toContain('OLD1');
    expect(fitxer(exportacio, 'GPU004.TXT')).not.toContain('OLD1');
    expect(exportacio.pendents).toEqual(['Sense professor assignat: Llengua catalana i literatura']);
    expect(fitxer(exportacio, 'GPU000_REVISIO_EXPORTACIO.TXT')).toContain('Sense professor assignat: 1ESO | B | Llengua catalana i literatura | 3h');
  });

  test('avisa quan una matèria només es tradueix pel curs i el grup, sense semblança de nom', async ({ page }) => {
    const classes = [...CLASSES, {
      id: 'llati', curs: '1ESO', grup: 'A', materia: 'Llatí de prova', hores: 2, tipus: '', departament: 'Matemàtiques',
      departaments: ['Matemàtiques'], subclasses: [], participants: [], professors: ['ARNAU ROS, ANNA'], professorAssignat: 'ARNAU ROS, ANNA',
    }];
    const exportacio = await generar(page, { classes, professors: PROFESSORS, xml: GESTIB_XML });
    expect(exportacio.error).toBeUndefined();
    const dubtoses = exportacio.pendents.filter((pendent) => pendent.startsWith('Correspondència dubtosa'));
    expect(dubtoses).toHaveLength(1);
    expect(dubtoses[0]).toMatch(/exportada com a [A-Z]+-A-1E .*: Llatí de prova$/);
    // Les que coincideixen pel nom no avisen.
    expect(exportacio.pendents.filter((pendent) => pendent.startsWith('Correspondència') && pendent.endsWith(': Matemàtiques'))).toEqual([]);
  });

  test("no genera res si un professor té una plaça que no és a l'XML de GestIB", async ({ page }) => {
    const professors = PROFESSORS.map((professor) => (professor.codiUntis === 'TEC1' ? { ...professor, codiUntis: 'TEC9' } : professor));
    const exportacio = await generar(page, { classes: CLASSES, professors, xml: GESTIB_XML });
    expect(exportacio.error).toContain('pàgina Professorat');
    expect(exportacio.error).toContain('DURAN MAS, DAVID (TEC9');
  });

  test("sense l'XML de GestIB també genera els fitxers, amb codis de matèria provisionals", async ({ page }) => {
    const exportacio = await generar(page, { classes: CLASSES, professors: PROFESSORS, xml: '' });
    expect(exportacio.error).toBeUndefined();
    const gpu002 = fitxer(exportacio, 'GPU002.TXT');
    expect(gpu002).toContain('"1ESO-A","MAT1"');
    expect(gpu002).not.toContain('MAT-A-1E');
  });
});
