import { expect, test } from '@playwright/test';

// Panell Quota en mode de prova (dades en memòria, sense Firestore). Les dades de prova
// tenen tres departaments: Catala (2 classes, 5 h), Matematiques (1 h) i Tecnologia (2 h).
test.describe('Quota', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('quota_theme', 'light');
      localStorage.setItem('darkMode', 'false');
    });
  });

  const targeta = (page, nom) => page.locator(`[data-departament="${nom}"]`);
  const fila = (page, materia) => page.locator('[data-classe]').filter({ has: page.locator(`input[value="${materia}"]`) });
  const navAdmin = (page, nom) => page.locator(`.admin-nav-item[title="${nom}"]`);

  test('la cap d\'estudis fa la quota de tots els departaments en un sol panell', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-mobile', 'El tauler és per a pantalla gran.');
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/admin/quota');

    await expect(page.getByRole('heading', { name: /^Quota del curs/ })).toBeVisible();
    await expect(page.locator('[data-departament]')).toHaveCount(3);
    await expect(targeta(page, 'Catala')).toContainText('5 h');
    await expect(targeta(page, 'Catala')).toContainText('Sobren 13 h');
    await expect(page.locator('[data-nova]')).toHaveCount(3);

    // Fila nova amb Enter, com en un full de càlcul: el grup es normalitza.
    const nova = targeta(page, 'Catala').locator('[data-nova]');
    await nova.getByPlaceholder('Curs').fill('2eso');
    await nova.getByPlaceholder('Grup').fill('bdf');
    await nova.getByPlaceholder('Matèria nova').fill('Llatí');
    await nova.getByPlaceholder('h', { exact: true }).fill('2');
    await nova.getByPlaceholder('h', { exact: true }).press('Enter');
    await expect(fila(page, 'Llatí').locator('[data-col="grup"]')).toHaveValue('B+D+F');
    await expect(fila(page, 'Llatí').locator('[data-col="curs"]')).toHaveValue('2ESO');
    await expect(targeta(page, 'Catala')).toContainText('7 h');
    await expect(nova.getByPlaceholder('Curs')).toBeFocused();

    // Edició d'hores i de tipus.
    const hores = fila(page, 'Taller de lectura').locator('[data-col="hores"]');
    await hores.fill('3,5');
    await hores.press('Enter');
    await expect(targeta(page, 'Catala')).toContainText('8,5 h');
    await fila(page, 'Llatí').getByLabel('Tipus de Llatí').selectOption('O2');
    await expect(fila(page, 'Llatí').locator('.quota-tipus')).toContainText('O2');

    // Hores no vàlides: no es desa i torna el valor.
    await hores.fill('0');
    await hores.press('Tab');
    await expect(hores).toHaveValue('3,5');

    // Moure a un altre departament des del menú de la fila.
    await fila(page, 'Taller de lectura').getByRole('button', { name: 'Mou o esborra Taller de lectura' }).click();
    await page.getByRole('menuitem', { name: 'Matematiques' }).click();
    await expect(targeta(page, 'Matematiques').locator('[data-classe]')).toHaveCount(2);
    await expect(targeta(page, 'Matematiques')).toContainText('4,5 h');

    // Arrossegar una fila a la targeta d'un altre departament.
    await fila(page, 'Llatí').locator('.quota-asa').dragTo(targeta(page, 'Tecnologia').locator('.quota-targeta-cap'));
    await expect(targeta(page, 'Tecnologia').locator('[data-classe]')).toHaveCount(2);
    await expect(targeta(page, 'Catala').locator('[data-classe]')).toHaveCount(1);

    // Esborrar i desfer (la classe torna amb el mateix id).
    const idLlati = await fila(page, 'Llatí').getAttribute('data-classe');
    await fila(page, 'Llatí').getByRole('button', { name: 'Mou o esborra Llatí' }).click();
    await page.getByRole('menuitem', { name: 'Esborra la fila' }).click();
    await expect(fila(page, 'Llatí')).toHaveCount(0);
    await page.getByRole('button', { name: 'Desfés' }).click();
    await expect(page.locator(`[data-classe="${idLlati}"]`)).toHaveCount(1);

    // Enganxar files copiades de la pestanya Quota del full.
    await targeta(page, 'Catala').locator('[data-nova] [data-col="materia"]').evaluate((input) => {
      const dades = new DataTransfer();
      dades.setData('text/plain', '1BAT\tB\tLLATÍ I\t4\tCatala\tO - Optativa 1a franja\n\t\tCap de departament\t3\tCatala\t\n\t\tSense hores\t\tCatala\t');
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dades, bubbles: true, cancelable: true }));
    });
    await expect(targeta(page, 'Catala').locator('[data-classe]')).toHaveCount(3);
    await expect(fila(page, 'LLATÍ I').locator('.quota-tipus')).toContainText('O1');
    await expect(page.getByText('2 files afegides a Catala.')).toBeVisible();

    // Comparar departaments des de la tira, i cerca.
    await page.locator('[data-xip="Matematiques"]').click();
    await page.locator('[data-xip="Tecnologia"]').click();
    await expect(page.locator('[data-departament]')).toHaveCount(2);
    await expect(page.getByText('Comparant 2 departaments')).toBeVisible();
    await page.getByRole('button', { name: "Mostra'ls tots" }).click();
    await expect(page.locator('[data-departament]')).toHaveCount(3);
    await page.getByLabel('Cerca a la quota').fill('lectura');
    await expect(page.locator('[data-departament]')).toHaveCount(1);
    await expect(page.locator('[data-classe]')).toHaveCount(1);
    await page.getByLabel('Cerca a la quota').fill('');

    // Pantalla completa (Esc en surt).
    await page.getByRole('button', { name: 'Pantalla completa' }).click();
    await expect(page.locator('.quota-panell-complet')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('quota-pantalla-completa.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('.quota-panell-complet')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('quota.png'), fullPage: true });

    expect(errors).toEqual([]);
  });

  test("el menú d'administració segueix el cicle del curs i les adreces antigues porten al lloc nou", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-mobile', 'Els textos del menú lateral només es veuen a pantalla gran.');
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // Importació (el full) ja no hi és: porta a la quota.
    await page.goto('/admin/dades');
    await expect(page).toHaveURL(/\/admin\/quota$/);
    const etiquetes = await page.locator('.admin-nav-item .admin-nav-label').allTextContents();
    expect(etiquetes).toEqual(['Curs', 'Professorat', 'Quota', 'Repartiment', 'Untis', 'Informes', 'Paràmetres']);

    // Curs: l'estat de cada fase del cicle.
    await navAdmin(page, 'Curs').click();
    const cicle = page.getByTestId('estat-cicle');
    await expect(cicle).toContainText('3 professors actius.');
    await expect(cicle).toContainText('4 classes');
    await expect(cicle.getByRole('link', { name: 'Prepara Untis' })).toBeVisible();

    // Untis segueix al seu lloc.
    await navAdmin(page, 'Untis').click();
    await expect(page.getByText('Flux de treball Untis')).toBeVisible();

    // Seguiment i Resums són ara Informes; l'administració hi veu també el seguiment.
    await page.goto('/admin/seguiment');
    await expect(page).toHaveURL(/\/informes$/);
    await expect(page.getByRole('button', { name: 'Validació final', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tutories', exact: true })).toBeVisible();
    await page.goto('/admin/tancament');
    await expect(page).toHaveURL(/\/departament$/);

    expect(errors).toEqual([]);
  });

  test('al mòbil el panell es llegeix sense desbordar la pàgina', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/admin/quota');
    await expect(page.locator('[data-departament]')).toHaveCount(3);
    const desbordament = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desbordament).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('quota-mobil.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
});
