import { expect, test } from '@playwright/test';

const referenceXml = `
<CENTRE codi="E2E" any="2026">
  <CURSOS><CURS codi="1" descripcio="1r ESO"><GRUP codi="10" nom="A" /></CURS></CURSOS>
  <PLACES>
    <PLACA codi="101" curta="PROF1" />
    <PLACA codi="102" curta="GUARD1" />
    <PLACA codi="103" curta="FREE1" />
  </PLACES>
  <MATERIES><MATERIA codi="20" curs="1" descripcio="Matemàtiques" curta="MAT" /></MATERIES>
  <ACTIVITATS>
    <ACTIVITAT codi="30" descripcio="Guàrdia" curta="G" />
    <ACTIVITAT codi="31" descripcio="Guàrdia de pati" curta="GP" />
  </ACTIVITATS>
  <AULES><AULA codi="40" descripcio="Aula 1" /></AULES>
</CENTRE>`;

async function runParser(page, callback, input = {}) {
  return page.evaluate(async ({ source, payload }) => {
    const parser = await import('/labs/guardies/horariXmlParser.js');
    // La funció prové exclusivament del test local.
    return Function('parser', 'payload', `return (${source})(parser, payload)`)(parser, payload);
  }, { source: callback.toString(), payload: input });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/labs/guardies/');
});

test('interpreta GPU004 respectant camps CSV entre cometes', async ({ page }) => {
  const result = await runParser(page, (parser, { text }) => {
    const parsed = parser.parseUntisProfessorat(text);
    return [...parsed.professors.values()];
  }, { text: 'PROF1,"Llinatges, Nom"\nGUARD1,"Guàrdia, Gina"' });

  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ codi: 'PROF1', cognoms: 'Llinatges, Nom' });
});

test('enriqueix les sessions de l horari amb la referència GestIB', async ({ page }) => {
  const result = await runParser(page, (parser, { reference, schedule, teachers }) => {
    const parsedReference = parser.parseGestibReference(reference);
    const parsedTeachers = parser.parseUntisProfessorat(teachers);
    const parsed = parser.parseHorariXml(schedule, parsedReference, parsedTeachers);
    return { session: parsed.sessions[0], summary: parsed.resum };
  }, {
    reference: referenceXml,
    teachers: 'PROF1,"Professor, Primer"',
    schedule: '<HORARI><SESSIONS><SESSIO placa="101" dia="1" hora="08:00" curs="1" grup="10" materia="20" aula="40" /></SESSIONS></HORARI>',
  });

  expect(result.session).toMatchObject({
    placa: '101',
    professorCurta: 'PROF1',
    grupVisible: '1ESO-A',
    materiaCurta: 'MAT',
    aulaNom: 'Aula 1',
    teClasse: true,
  });
  expect(result.summary).toMatchObject({ sessions: 1, professors: 1, grups: 1 });
});

test('converteix GPU001 en guàrdies i exclou pati de la guàrdia general', async ({ page }) => {
  const result = await runParser(page, (parser, { reference, duties }) => {
    const parsedReference = parser.parseGestibReference(reference);
    return parser.parseUntisGuardies(duties, {
      referencia: parsedReference,
      hores: ['08:00', '09:00'],
    }).map((session) => ({
      placa: session.placa,
      hora: session.hora,
      activitat: session.activitat,
      general: session.activitatEsGuardiaGeneral,
    }));
  }, {
    reference: referenceXml,
    duties: '1,,"GUARD1","G",,1,1,,\n2,,"GUARD1","GP",,1,2,,',
  });

  expect(result).toEqual([
    { placa: '102', hora: '08:00', activitat: 'G', general: true },
    { placa: '102', hora: '09:00', activitat: 'GP', general: false },
  ]);
});

test('agrupa sessions simultànies del mateix bloc de cobertura', async ({ page }) => {
  const result = await runParser(page, (parser) => {
    const base = {
      placa: '101', dia: '1', hora: '08:00', materia: '20', aula: '40', activitat: '',
      materiaCurta: 'MAT', teClasse: true, teActivitat: false,
    };
    return parser.agruparSessionsCobertura([
      { ...base, grup: '10', grupVisible: '1ESO-A' },
      { ...base, grup: '11', grupVisible: '1ESO-B' },
    ]).map((block) => ({ grups: block.grups, visibles: block.grupsVisibles }));
  });

  expect(result).toEqual([{ grups: ['10', '11'], visibles: ['1ESO-A', '1ESO-B'] }]);
});

test('classifica professorat ocupat, de guàrdia i lliure per franja', async ({ page }) => {
  const result = await runParser(page, (parser) => {
    const common = { dia: '1', hora: '08:00' };
    const sessions = [
      { ...common, placa: '101', teClasse: true, teActivitat: false, activitat: '', activitatEsGuardiaGeneral: false },
      { ...common, placa: '102', teClasse: false, teActivitat: true, activitat: 'G', activitatEsGuardiaGeneral: true },
      { ...common, placa: '103', teClasse: false, teActivitat: true, activitat: 'ALTRE', activitatEsGuardiaGeneral: false },
      { dia: '2', hora: '08:00', placa: '104', teClasse: true, teActivitat: false, activitat: '', activitatEsGuardiaGeneral: false },
    ];
    return parser.ocupacioFranja(sessions, '1', '08:00', new Set(['G']))
      .map((item) => ({
        placa: item.placa,
        classes: item.classes.length,
        guardies: item.guardies.length,
        activitats: item.activitats.length,
        lliure: item.lliure,
      }));
  });

  expect(result).toEqual([
    { placa: '101', classes: 1, guardies: 0, activitats: 0, lliure: false },
    { placa: '102', classes: 0, guardies: 1, activitats: 0, lliure: false },
    { placa: '103', classes: 0, guardies: 0, activitats: 1, lliure: false },
    { placa: '104', classes: 0, guardies: 0, activitats: 0, lliure: true },
  ]);
});
