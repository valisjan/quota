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
    <AULA codi="300" descripcio="Aula 1" />
  </AULES>
</CENTRE>`;

const scheduleXml = `<?xml version="1.0" encoding="UTF-8"?>
<HORARI>
  <SESSIONS>
    <SESSIO placa="1" dia="1" hora="08:00" curs="1" grup="10" materia="100" aula="300" />
    <SESSIO placa="1" dia="1" hora="09:00" curs="1" grup="10" materia="100" aula="300" />
    <SESSIO placa="4" dia="1" hora="08:00" curs="1" grup="10" materia="100" aula="300" />
    <SESSIO placa="4" dia="1" hora="08:00" curs="1" grup="11" materia="100" aula="300" />
  </SESSIONS>
</HORARI>`;

const teachersText = `ADEL,"Adell Domènech, Marina"
FUEN,"Fuentes Serra, Gabriel"
SANZ,"Sanz Vidal, Clara"`;

const dutiesText = `1,,"ADEL","G",,1,3,,
2,,"FUEN","G",,1,1,,
3,,"SANZ","G",,1,2,,
4,,"FUEN","GP",,1,4,,`;

const referenceFile = {
  name: 'gestib-e2e.xml',
  mimeType: 'application/xml',
  buffer: Buffer.from(referenceXml),
};

const scheduleFile = {
  name: 'horari-e2e.xml',
  mimeType: 'application/xml',
  buffer: Buffer.from(scheduleXml),
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
  await page.locator('#reference-file').setInputFiles(referenceFile);
  await expect(page.locator('[data-upload-status="reference"]')).toHaveText('OK');

  await page.locator('#untis-file').setInputFiles(teachersFile);
  await expect(page.locator('[data-upload-status="untis"]')).toHaveText('OK');

  await page.locator('#duties-file').setInputFiles(dutiesFile);
  await expect(page.locator('[data-upload-status="duties"]')).toHaveText('OK');

  await page.locator('#xml-file').setInputFiles(scheduleFile);
  await expect(page.locator('[data-upload-status="schedule"]')).toHaveText('OK');
  await expect(page.locator('#workspace')).toBeVisible();
}

test.describe('Guàrdies: comportament existent', () => {
  test('arrenca buit i obliga a carregar els fitxers en ordre', async ({ page }) => {
    await openGuardies(page);

    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('#reference-file')).toBeEnabled();
    await expect(page.locator('#untis-file')).toBeDisabled();
    await expect(page.locator('#duties-file')).toBeDisabled();
    await expect(page.locator('#xml-file')).toBeDisabled();
    await expect(page.locator('#cache-info')).toContainText('0/4 fitxers compartits');
    await expect(page.locator('#admin-panel')).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('carrega la configuració i la conserva després de recarregar', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);

    await expect(page.locator('#stat-sessions')).not.toHaveText('0');
    await expect(page.locator('#stat-reference')).toHaveText('Sí');
    await expect(page.locator('#cache-info')).toContainText('4/4 fitxers compartits');

    await page.reload();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('[data-upload-name="reference"]')).toHaveText('gestib-e2e.xml');
    await expect(page.locator('[data-upload-name="untis"]')).toHaveText('GPU004.TXT');
    await expect(page.locator('[data-upload-name="duties"]')).toHaveText('GPU001.TXT');
    await expect(page.locator('[data-upload-name="schedule"]')).toHaveText('horari-e2e.xml');
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
    await firstAssignment.selectOption('4');
    await expect(firstAssignment).toHaveValue('4');

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
  });

  test('guarda una assignació setmanal de convivència', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);

    await page.locator('#convivencia-panel summary').click();
    const firstSlot = page.locator('[data-convivencia-slot="1|08:00"]');
    await expect(firstSlot).toBeVisible();
    await firstSlot.selectOption({ index: 1 });
    const selected = await firstSlot.inputValue();
    expect(selected).not.toBe('');

    await expect(page.locator('#cache-info')).toContainText('4/4 fitxers compartits');
    await page.reload();
    await page.locator('#convivencia-panel summary').click();
    await expect(page.locator('[data-convivencia-slot="1|08:00"]')).toHaveValue(selected);
  });

  test('configura manualment zones i GP, desa automàticament i salta festius', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-14');
    await page.locator('#date-input').press('Tab');

    await page.locator('#pati-panel summary').click();
    await expect(page.locator('.pati-roster-row')).toHaveCount(0);
    await page.locator('#new-pati-zone').fill('Pista');
    await page.locator('#add-pati-zone').click();
    await page.locator('#new-pati-zone').fill('Porxada');
    await page.locator('#add-pati-zone').click();

    await page.locator('#pati-teacher-search').fill('Fuentes');
    await page.locator('.pati-teacher-results [role="option"]').first().click();
    await page.locator('#add-pati-teacher').click();
    await expect(page.locator('.pati-roster-row')).toContainText('Fuentes Serra');
    await expect(page.getByText("Les activitats GP d'Untis no s'importen.")).toBeVisible();

    await page.locator('#pati-holiday-date').fill('2026-09-21');
    await page.locator('#pati-holiday-label').fill('Festa del centre');
    await page.locator('#add-pati-holiday').click();
    await expect(page.getByText('Desat automàticament')).toBeVisible();
    await expect(page.locator('#save-pati-config')).toHaveCount(0);
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('Pista');

    await page.reload();
    await page.locator('#date-input').fill('2026-09-21');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('Festa del centre');
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('la rotació no avança');

    await page.locator('#date-input').fill('2026-09-28');
    await page.locator('#date-input').press('Tab');
    await expect(page.locator('#coverage-list .pati-info-strip')).toContainText('Porxada');
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

  test('mostra el pati entre tercera i quarta i explica la còpia de sortides', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await expect(page.locator('#coverage-list .coverage-session').nth(3)).toContainText('Pati · 10:45–11:15');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await expect(page.getByRole('button', { name: 'Copia als dies de l’interval' })).toBeDisabled();
    await expect(page.getByText('El dia actual ja es desa automàticament')).toBeVisible();
  });

  test('la versió impresa conserva les franges i amaga els controls', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.locator('#professor-search').fill('ADELL');
    await page.locator('#professor-results [data-professor]').first().click();
    await page.locator('#add-all-hours').click();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-header')).toBeVisible();
    await expect(page.locator('.entry-panel')).toBeHidden();
    expect(await page.locator('.coverage-session').count()).toBeGreaterThan(0);
  });
});
