import { expect, test } from '@playwright/test';

const referenceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CENTRE codi="E2E" any="2026">
  <CURSOS>
    <CURS codi="1" descripcio="1r ESO">
      <GRUP codi="10" nom="A" />
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
  </SESSIONS>
</HORARI>`;

const teachersText = `ADEL,"Adell Domènech, Marina"
FUEN,"Fuentes Serra, Gabriel"
SANZ,"Sanz Vidal, Clara"`;

const dutiesText = `1,,"ADEL","G",,1,3,,
2,,"FUEN","G",,1,1,,
3,,"SANZ","G",,1,2,,`;

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

  test('una sortida completa allibera professorat i els acompanyants generen absències', async ({ page }) => {
    await openGuardies(page);
    await uploadConfiguration(page);
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await page.locator('#group-search').selectOption('10');
    await expect(page.locator('[data-remove-group="10"]')).toBeVisible();
    await expect(page.locator('#group-search')).toHaveValue('');
    await expect(page.locator('#released-count')).toContainText('1 professor');
    await page.locator('[data-group-professor]').first().check();
    await expect(page.locator('#released-count')).toContainText('0 professors');
    await expect(page.locator('#coverage-count')).toContainText('3 sessions');

    await page.waitForTimeout(500);
    await page.reload();
    await page.locator('#date-input').fill('2026-09-07');
    await page.locator('#date-input').press('Tab');
    await page.getByRole('tab', { name: 'Grup de sortida' }).click();
    await expect(page.locator('[data-remove-group="10"]')).toBeVisible();
    await expect(page.locator('[data-group-professor]').first()).toBeChecked();

    await page.locator('[data-add-group-companion="10"]').selectOption('2');
    await expect(page.locator('[data-group-companion="10"][data-teacher="2"]')).toBeVisible();
    await expect(page.locator('#coverage-count')).toContainText('4 sessions');

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
