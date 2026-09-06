import { expect, test } from '@playwright/test';

const referenceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CENTRE codi="E2E" any="2026">
  <CURSOS>
    <CURS codi="1" descripcio="1r ESO">
      <GRUP codi="10" nom="A" />
      <GRUP codi="11" nom="B" />
    </CURS>
  </CURSOS>
  <PLACES>
    <PLACA codi="1" curta="ADEL" />
    <PLACA codi="2" curta="FUEN" />
    <PLACA codi="3" curta="SANZ" />
    <PLACA codi="4" curta="MAT1" />
  </PLACES>
  <MATERIES>
    <MATERIA codi="100" curs="1" descripcio="Matemàtiques" curta="MAT" />
  </MATERIES>
  <ACTIVITATS>
    <ACTIVITAT codi="200" descripcio="Guàrdia" curta="G" />
  </ACTIVITATS>
  <AULES>
    <AULA codi="300" descripcio="Aula 14" />
  </AULES>
</CENTRE>`;

const teachersText = `ADEL,"Adell Domènech, Marina"
FUEN,"Fuentes Serra, Gabriel"
SANZ,"Sanz Vidal, Clara"`;

const dutiesText = `10,"1ESO-A","ADEL","MAT","AUL14",1,1,,
11,"1ESO-A","ADEL","MAT","AUL14",1,2,,
12,"1ESO-A","MAT1","MAT","AUL14",1,1,,
12,"1ESO-B","MAT1","MAT","AUL14",1,1,,
1,,"ADEL","G",,1,3,,
2,,"FUEN","G",,1,1,,
3,,"SANZ","G",,1,2,,
5,,"SANZ","G",,1,1,,
4,,"FUEN","GP",,1,4,,
13,"1ESO-B","MAT1","MAT","AUL14",1,3,,
20,"1ESO-A","ADEL","MAT","AUL14",2,5,,`;

const referenceFile = {
  name: 'gestib-e2e.xml',
  mimeType: 'application/xml',
  buffer: Buffer.from(referenceXml),
};

const teachersFile = {
  name: 'GPU004.TXT',
  mimeType: 'text/plain',
  buffer: Buffer.from(teachersText),
};

const dutiesFile = {
  name: 'GPU001.TXT',
  mimeType: 'text/plain',
  buffer: Buffer.from(dutiesText),
};

async function openGuardies(page) {
  await page.goto('/labs/guardies/');
  await expect(page.locator('#cache-info')).toContainText('E2E 2026-27');
}

async function uploadConfiguration(page) {
  await page.getByRole('tab', { name: 'Configuració' }).click();
  await page.locator('#reference-file').setInputFiles(referenceFile);
  await expect(page.locator('[data-upload-status="reference"]')).toHaveText('OK');

  await page.locator('#untis-file').setInputFiles(teachersFile);
  await expect(page.locator('[data-upload-status="untis"]')).toHaveText('OK');

  await page.locator('#duties-file').setInputFiles(dutiesFile);
  await expect(page.locator('[data-upload-status="duties"]')).toHaveText('OK');
  await page.getByRole('tab', { name: 'Gestió diària' }).click();
  await expect(page.locator('#workspace')).toBeVisible();
}

test.describe('Guàrdies: comportament existent', () => {
  test('arrenca buit i obliga a carregar els fitxers en ordre', async ({ page }) => {
    await openGuardies(page);

    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Guàrdies', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Professorat', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Gestió diària' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#admin-panel')).toBeHidden();
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await expect(page.locator('#empty-state')).toBeHidden();
    await expect(page.locator('#reference-file')).toBeEnabled();
    await expect(page.locator('#untis-file')).toBeDisabled();
    await expect(page.locator('#duties-file')).toBeDisabled();
    await expect(page.locator('#xml-file')).toHaveCount(0);
    await expect(page.locator('#cache-info')).toContainText('0/3 fitxers compartits');
    await expect(page.locator('#admin-panel')).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('carrega la configuració i la conserva després de recarregar', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);

    await expect(page.locator('#stat-sessions')).not.toHaveText('0');
    await expect(page.locator('#stat-reference')).toHaveText('Sí');
    await expect(page.locator('#cache-info')).toContainText('3/3 fitxers compartits');

    await page.reload();
    await expect(page.locator('#workspace')).toBeVisible();
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await expect(page.locator('[data-upload-name="reference"]')).toHaveText('gestib-e2e.xml');
    await expect(page.locator('[data-upload-name="untis"]')).toHaveText('GPU004.TXT');
    await expect(page.locator('[data-upload-name="duties"]')).toHaveText('GPU001.TXT');
    await expect(page.locator('[data-upload-name="schedule"]')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Gestió diària' }).click();

    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();
    await expect(page.locator('#schedule-grid')).toContainText('Aula 14');
    await expect(page.locator('#schedule-grid')).not.toContainText('AUL14');

    await page.getByRole('button', { name: 'Dia següent' }).click();
    await expect(page.locator('#date-input')).toHaveValue('2026-09-08');
    await page.getByRole('button', { name: 'Dia anterior' }).click();
    await expect(page.locator('#date-input')).toHaveValue('2026-09-07');

    await page.getByRole('link', { name: 'Professorat', exact: true }).click();
    await expect(page).toHaveURL(/vista=professor/);
    await expect(page).toHaveURL(/data=2026-09-07/);
    await expect(page.locator('#date-input')).toHaveValue('2026-09-07');
    await page.getByRole('link', { name: 'Guàrdies', exact: true }).click();
    await expect(page).toHaveURL(/data=2026-09-07/);
    await expect(page.locator('#date-input')).toHaveValue('2026-09-07');
    await page.getByRole('link', { name: 'Professorat', exact: true }).click();
    await expect(page.locator('#date-input')).toHaveValue('2026-09-07');
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#coverage-list')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Guàrdies del dia' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.teacher-stats-panel')).toBeHidden();
    await page.getByRole('tab', { name: 'Guàrdies realitzades' }).click();
    await expect(page.locator('.teacher-stats-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jornada encara no publicada' })).toBeHidden();
    await page.getByRole('tab', { name: 'Guàrdies del dia' }).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('.day-state, #coverage-count, #print-coverage')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Professorat', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('permet corregir manualment els recomptes de G i alliberat', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#guard-counts-panel summary').click();
    await page.locator('#guard-count-search').fill('Fuentes');
    const releasedInput = page.getByLabel('Guàrdies com a alliberat de Fuentes Serra, Gabriel');
    await releasedInput.fill('4');
    await releasedInput.press('Tab');
    await expect(page.locator('#guard-counts-panel')).toContainText('Desat');
    const input = page.getByLabel('Guàrdies G de Fuentes Serra, Gabriel');
    await input.fill('7');
    await input.press('Tab');
    await expect(page.locator('#guard-counts-panel')).toContainText('Desat');

    await page.goto('/labs/guardies/?vista=professor');
    await page.getByRole('tab', { name: 'Guàrdies realitzades' }).click();
    const row = page.locator('.teacher-stats-row').filter({ hasText: 'Fuentes Serra' });
    await expect(row.locator('[data-count-released]')).toHaveText('4');
    await expect(row.locator('[data-count-guard]')).toHaveText('7');
    await expect(row.locator('[data-count-total]')).toHaveText('11');
  });

  test('exclou el professorat d\'Agrària de tot el mòdul de guàrdies', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#teacher-exclusions-panel summary').click();
    await page.locator('#teacher-exclusions-search').fill('Adell');
    const row = page.locator('.teacher-exclusions-row').filter({ hasText: 'Adell Domènech' });
    await expect(row).toContainText('marina.adell@iesjosepsuredaiblanes.com');
    const checkbox = row.getByRole('checkbox');
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeEnabled();

    await page.getByRole('tab', { name: 'Gestió diària' }).click();
    await page.locator('#professor-search').fill('Adell');
    await expect(page.locator('#professor-results')).toHaveText('Sense resultats');

    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#guard-counts-panel summary').click();
    await page.locator('#guard-count-search').fill('Adell');
    await expect(page.locator('.guard-count-row').filter({ hasText: 'Adell Domènech' })).toHaveCount(0);

    await page.reload();
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#teacher-exclusions-panel summary').click();
    await page.locator('#teacher-exclusions-search').fill('Adell');
    await expect(page.getByRole('checkbox', { name: 'Adell Domènech, Marina és d’Agrària' })).toBeChecked();
  });

  test('sincronitza la jornada entre dues sessions sense recarregar', async ({ page, context }) => {
    await openGuardies(page);
    const otherPage = await context.newPage();
    await openGuardies(otherPage);
    await expect(otherPage.locator('#cache-info')).toContainText('0/3 fitxers compartits');

    await uploadConfiguration(page);
    await expect(otherPage.locator('#cache-info')).toContainText('3/3 fitxers compartits');
    await expect(otherPage.locator('#workspace')).toBeVisible();

    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await otherPage.locator('#date-input').fill('2026-09-07');
    await otherPage.locator('#date-input').press('Tab');
    await expect(otherPage.locator('#coverage-count')).toContainText('0 sessions');

    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#add-all-hours').click();

    await expect(otherPage.locator('#coverage-count')).toContainText('3 sessions');
    await expect(otherPage.locator('#coverage-list [data-assignacio]')).toHaveCount(3);
    await otherPage.close();
  });

  test('aplica totes les hores de cada dia en un interval i en mostra el resultat', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#add-all-hours').click();

    await page.locator('.range-builder input[type="date"]').nth(1).fill('2026-09-08');
    await page.getByRole('button', { name: 'Aplica interval' }).click();
    await expect(page.locator('.range-builder .range-feedback')).toHaveText('Totes les hores aplicades a 2 dies lectius · 4 sessions.');

    await page.locator('#date-input').fill('2026-09-08');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('#coverage-count')).toContainText('1 sessió');
    await expect(page.locator('#coverage-list')).toContainText('Adell Domènech');
  });

  test('assigna automàticament primer alliberats i després professorat de G', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.evaluate(() => {
      const key = 'quota-e2e-guardies:e2e-2026';
      const data = JSON.parse(localStorage.getItem(key));
      data.stats = { counts: {
        2: { total: 5, released: 0, guard: 5, other: 0 },
        3: { total: 0, released: 0, guard: 0, other: 0 },
      } };
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.reload();
    await expect(page.locator('#workspace')).toBeVisible();
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');

    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await page.locator('#group-search').selectOption('10');
    await page.getByRole('tab', { name: 'Professor', exact: true }).click();
    await page.locator('#professor-search').fill('MAT1');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#add-all-hours').click();

    await page.locator('#auto-assign-guards').click();
    await expect(page.locator('.auto-assignment-feedback')).toHaveText('2 assignades');
    await expect(page.locator('#coverage-list [data-assignacio]')).toHaveCount(2);
    await expect(page.locator('#coverage-list [data-assignacio]').first()).toHaveValue('1');
    await expect(page.locator('#coverage-list [data-assignacio]').nth(1)).toHaveValue('1');

    await page.waitForTimeout(500);
    const sources = await page.evaluate(() => Object.values(
      JSON.parse(localStorage.getItem('quota-e2e-guardies:e2e-2026')).days['2026-09-07'].assignments,
    ).map((assignment) => assignment.source).sort());
    expect(sources).toEqual(['guard', 'released']);

    await page.locator('#date-input').fill('2026-09-14');
    await page.locator('#date-input').press('Tab');
    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#schedule-grid [data-absence]:not(:disabled)').first().check();
    await page.locator('#auto-assign-guards').click();
    await expect(page.locator('#coverage-list [data-assignacio]')).toHaveValue('3');
  });

  test('selecciona un professor absent, crea cobertures i conserva la jornada', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);

    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();

    await expect(page.locator('#schedule-grid [data-absence]:not(:disabled)')).toHaveCount(3);
    await page.locator('#add-all-hours').click();
    await expect(page.locator('#coverage-count')).toContainText('3 sessions');
    await expect(page.locator('#coverage-list [data-assignacio]')).toHaveCount(3);
    await expect(page.locator('#print-coverage')).toBeEnabled();

    const firstAssignment = page.locator('#coverage-list [data-assignacio]').first();
    const candidateLabels = await firstAssignment.locator('option').allTextContents();
    const guardIndex = candidateLabels.findIndex((label) => label.includes('Guàrdia -'));
    const outsideDutyIndexes = candidateLabels
      .map((label, index) => label.includes('Ni G ni alliberat') ? index : -1)
      .filter((index) => index >= 0);
    expect(guardIndex).toBeGreaterThan(0);
    expect(outsideDutyIndexes.length).toBeGreaterThan(0);
    expect(Math.min(...outsideDutyIndexes)).toBeGreaterThan(guardIndex);
    await firstAssignment.selectOption('2');
    await expect(firstAssignment).toHaveValue('2');

    await page.waitForTimeout(500);
    await page.reload();
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('#coverage-count')).toContainText('3 sessions');
    await expect(page.locator('#coverage-list [data-assignacio]')).toHaveCount(3);
    await page.getByRole('button', { name: 'Publica' }).click();
    await expect(page.getByText('Publicada', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tanca jornada' }).click();
    await expect(page.getByText('Tancada', { exact: true })).toBeVisible();
    const guardCount = await page.evaluate(() => (
      JSON.parse(localStorage.getItem('quota-e2e-guardies:e2e-2026')).stats.counts['2']
    ));
    expect(guardCount).toEqual({ total: 1, released: 0, guard: 1, other: 0 });

    await page.goto('/labs/guardies/?vista=professor');
    await expect(page.locator('.teacher-date-header')).toBeVisible();
    await expect(page.locator('.teacher-date-header #date-input')).toBeVisible();
    await expect(page.locator('.teacher-date-header .work-title, .teacher-date-header .date-summary-card, .teacher-date-header .day-command-bar')).toHaveCount(0);
    await expect(page.locator('.teacher-stats-panel')).toBeHidden();
    await page.getByRole('tab', { name: 'Guàrdies realitzades' }).click();
    await expect(page.locator('.teacher-stats-panel')).toBeVisible();
    await expect(page.locator('.teacher-date-header')).toBeHidden();
    for (const selector of ['#admin-panel', '#pati-panel', '#convivencia-panel']) {
      await expect(page.locator(selector)).toBeHidden();
    }
    const teacherCount = page.locator('.teacher-stats-row').filter({ hasText: 'Fuentes Serra' });
    await expect(teacherCount.locator('[data-count-guard]')).toHaveText('1');
    await expect(teacherCount.locator('[data-count-total]')).toHaveText('1');
    await page.getByRole('tab', { name: 'Guàrdies del dia' }).click();
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('.readonly-assignment').filter({ hasText: 'Fuentes Serra' })).toHaveCount(1);
    await expect(page.locator('[data-assignacio], [data-remove-absence]')).toHaveCount(0);
  });

  test('guarda una assignació setmanal de convivència', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);

    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#convivencia-panel summary').click();
    const firstSlot = page.locator('[data-convivencia-slot="1|8:00"]');
    await expect(firstSlot).toBeVisible();
    await firstSlot.selectOption({ index: 1 });
    const selected = await firstSlot.inputValue();
    expect(selected).not.toBe('');

    await expect(page.locator('#cache-info')).toContainText('3/3 fitxers compartits');
    await page.reload();
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#convivencia-panel summary').click();
    await expect(page.locator('[data-convivencia-slot="1|8:00"]')).toHaveValue(selected);
  });

  test('configura manualment zones i GP, desa automàticament i salta festius', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-14');
    await page.locator('#date-input').press('Tab');

    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#pati-panel summary').click();
    await expect(page.locator('.pati-roster-row')).toHaveCount(0);
    await page.locator('#new-pati-zone').fill('Pista');
    await page.locator('#add-pati-zone').click();
    await page.locator('#new-pati-zone').fill('Porxada');
    await page.locator('#add-pati-zone').click();

    await page.locator('#pati-teacher-search').fill('Fuentes');
    await page.locator('.pati-teacher-results [role="option"]').first().click();
    await page.locator('#add-pati-teacher').click();
    await page.locator('#pati-teacher-search').fill('Sanz');
    await page.locator('.pati-teacher-results [role="option"]').first().click();
    await page.locator('#add-pati-teacher').click();
    await expect(page.locator('.pati-roster-row')).toHaveCount(2);
    await expect(page.locator('.pati-roster-row').first()).toContainText('Fuentes Serra');

    await page.getByRole('tab', { name: 'Gestió diària' }).click();

    const patioCards = page.locator('#coverage-list .pati-zone-card');
    await expect(patioCards).toHaveCount(2);
    const cardSizes = await patioCards.evaluateAll((cards) => cards.map((card) => ({
      width: card.getBoundingClientRect().width,
      height: card.getBoundingClientRect().height,
    })));
    expect(cardSizes[0].width).toBeCloseTo(cardSizes[1].width, 0);
    expect(cardSizes[0].height).toBe(cardSizes[1].height);
    const typeSizes = await patioCards.first().evaluate((card) => ({
      zone: Number.parseFloat(getComputedStyle(card.querySelector('.pati-zone-select')).fontSize),
      teacher: Number.parseFloat(getComputedStyle(card.querySelector('.pati-teacher-name')).fontSize),
    }));
    expect(typeSizes.zone).toBeGreaterThan(typeSizes.teacher);

    const fuentesCard = patioCards.filter({ hasText: 'Fuentes Serra' });
    await fuentesCard.locator('[data-pati-zone-override]').selectOption({ label: 'Porxada' });
    await expect(fuentesCard).toHaveClass(/overridden/);
    await expect(fuentesCard.locator('[data-pati-zone-override]')).toHaveValue('zona-2');
    await page.locator('[data-comment="__pati_observation__"]')
      .fill('Banys ha de quedar cobert durant tot el pati.');
    await expect(page.locator('[data-comment-print="__pati_observation__"]'))
      .toContainText('Banys ha de quedar cobert');

    await page.locator('#professor-search').fill('Fuentes');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#schedule-grid .schedule-item').filter({ hasText: 'PATI' }).locator('[data-absence]').check();
    await expect(page.locator('.pati-zone-card.absent')).toHaveCount(1);
    await expect(page.locator('.pati-zone-card.absent .pati-absence-badge')).toHaveText('Absent');
    await expect(page.locator('.coverage-session.pati-session .coverage-session-list')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#pati-holiday-date').fill('2026-09-21');
    await page.locator('#pati-holiday-label').fill('Festa del centre');
    await page.locator('#add-pati-holiday').click();
    await expect(page.getByText('Desat automàticament')).toBeVisible();
    await expect(page.locator('#save-pati-config')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Gestió diària' }).click();
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('Pista');

    await page.reload();
    await page.locator('#date-input').fill('2026-09-14');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('.pati-zone-card').filter({ hasText: 'Fuentes Serra' })
      .locator('[data-pati-zone-override]')).toHaveValue('zona-2');
    await expect(page.locator('[data-comment="__pati_observation__"]'))
      .toHaveValue('Banys ha de quedar cobert durant tot el pati.');
    await page.locator('#date-input').fill('2026-09-21');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('Festa del centre');

    await page.locator('#date-input').fill('2026-09-28');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('Porxada');
    await page.getByRole('tab', { name: 'Configuració' }).click();
    await page.locator('#pati-panel summary').click();
    await expect(page.getByLabel('Nom de la zona 1')).toHaveValue('Pista');
    await expect(page.getByLabel('Nom de la zona 2')).toHaveValue('Porxada');
    await expect(page.getByText('Festa del centre')).toBeVisible();
  });

  test('una sortida completa allibera professorat i els acompanyants generen absències', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await page.locator('#group-search').selectOption('10');
    await expect(page.locator('[data-remove-group="10"]')).toBeVisible();
    await expect(page.locator('#group-search')).toHaveValue('');
    const releasedCandidates = page.locator('[data-group-released="10"]:not(:disabled)');
    await expect(releasedCandidates).toHaveCount(2);
    await expect(releasedCandidates.first()).toBeChecked();
    await expect(releasedCandidates.nth(1)).toBeChecked();
    await expect(page.locator('[data-group-released="10"]:disabled')).toHaveCount(1);
    await expect(page.locator('[data-group-released="10"]:disabled')).not.toBeChecked();
    await expect(page.locator('#released-count')).toContainText('1 professor');
    await expect(page.getByText('Candidat', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-confirm-group-released="10"]')).toHaveCount(0);
    await releasedCandidates.first().uncheck();
    await releasedCandidates.nth(1).uncheck();
    await expect(page.locator('#released-count')).toContainText('0 professors');
    await releasedCandidates.first().check();
    await releasedCandidates.nth(1).check();
    await expect(page.locator('#released-count')).toContainText('1 professor');

    await page.locator('[data-add-group-companion="10"]').selectOption('1');
    await expect(page.locator('[data-group-companion="10"][data-teacher="1"]')).toBeVisible();
    await expect(page.locator('#released-count')).toContainText('0 professors');
    await expect(page.locator('#coverage-count')).toContainText('3 sessions');

    await page.waitForTimeout(500);
    await page.reload();
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await expect(page.locator('[data-remove-group="10"]')).toBeVisible();
    await expect(page.locator('[data-group-companion="10"][data-teacher="1"]')).toBeVisible();

    await page.locator('[data-add-group-companion="10"]').selectOption('2');
    await expect(page.locator('[data-group-companion="10"][data-teacher="2"]')).toBeVisible();
    await expect(page.locator('#coverage-count')).toContainText('5 sessions');

    await page.locator('#outing-to').fill('2026-09-08');
    await page.getByRole('button', { name: 'Copia als dies de l’interval' }).click();
    await expect(page.getByText('Sortida copiada a 1 dia lectiu.')).toBeVisible();
    await page.locator('#date-input').fill('2026-09-08');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('[data-remove-group="10"]')).toBeVisible();
  });

  test('decideix per cada grup si la sortida és completa o parcial', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();

    await page.locator('#group-search').selectOption('10');
    await page.locator('#group-search').selectOption('11');
    const groupA = page.locator('[data-group-complete="10"]');
    const groupB = page.locator('[data-group-complete="11"]');
    await expect(groupA).toBeChecked();
    await expect(groupB).toBeChecked();

    await groupA.uncheck();
    await expect(groupA).not.toBeChecked();
    await expect(groupB).toBeChecked();

    await page.locator('#outing-to').fill('2026-09-08');
    await page.getByRole('button', { name: 'Copia als dies de l’interval' }).click();
    await expect(page.getByText('Sortida copiada a 1 dia lectiu.')).toBeVisible();
    await page.locator('#date-input').fill('2026-09-08');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('[data-group-complete="10"]')).not.toBeChecked();
    await expect(page.locator('[data-group-complete="11"]')).toBeChecked();
  });

  test('mostra el pati entre tercera i quarta i permet copiar sortides', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await expect(page.locator('#coverage-list .coverage-session').nth(3)).toContainText('Pati · 10:45–11:15');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await expect(page.getByRole('button', { name: 'Copia als dies de l’interval' })).toBeDisabled();
  });

  test('la versió impresa A3 conserva les franges en una sola pàgina i amaga els controls', async ({ page }, testInfo) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#add-all-hours').click();
    for (const professor of ['FUENTES', 'SANZ', 'MAT1']) {
      await page.locator('#professor-search').fill(professor);
      await page.locator('#professor-results [data-professor]').first().click();
      await page.locator('#add-all-hours').click();
    }
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-header')).toBeVisible();
    await expect(page.locator('.entry-panel')).toBeHidden();
    expect(await page.locator('.coverage-session').count()).toBeGreaterThan(0);
    if (testInfo.project.name === 'chromium-desktop') {
      const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
      const raw = pdf.toString('latin1');
      const pages = raw.match(/\/Type\s*\/Page(?!s)\b/g) || [];
      const mediaBox = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
      expect(pages).toHaveLength(1);
      expect(Number(mediaBox?.[1])).toBeGreaterThan(840);
      expect(Number(mediaBox?.[2])).toBeGreaterThan(1190);
    }
  });
});
