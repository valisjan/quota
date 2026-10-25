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

  // Catàleg de GestIB de prova per a les dades del mode de prova (Catala, Matematiques, Tecnologia).
  const XML_E2E = `<?xml version="1.0" encoding="UTF-8"?>
<CENTRE codi="PROVA001" any="2026"><CURSOS><CURS codi="62" descripcio="1r ESO"><GRUP codi="1" nom="A"/><GRUP codi="2" nom="B"/></CURS></CURSOS>
<PLACES><PLACA codi="1" curta="MSUR"/><PLACA codi="2" curta="PBLA"/><PLACA codi="3" curta="JPON"/></PLACES>
<MATERIES>
<MATERIA codi="11" curs="62" descripcio="Llengua catalana i literatura-A-1E" curta="LCL-A-1E" departament=""/>
<MATERIA codi="12" curs="62" descripcio="Llengua catalana i literatura-B-1E" curta="LCL-B-1E" departament=""/>
<MATERIA codi="13" curs="62" descripcio="Taller de lectura-A-1E" curta="TL-A-1E" departament=""/>
<MATERIA codi="14" curs="62" descripcio="Matemàtiques-A-1E" curta="MAT-A-1E" departament=""/>
<MATERIA codi="15" curs="62" descripcio="Matemàtiques-B-1E" curta="MAT-B-1E" departament=""/>
</MATERIES>
<ACTIVITATS><ACTIVITAT codi="64" descripcio="*Dedicació a coordinació" curta="*Coordinació"/><ACTIVITAT codi="62" descripcio="*Tutoria" curta="*Tutoria"/></ACTIVITATS>
</CENTRE>`;

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

  test('cada fila es relaciona amb el catàleg de GestIB del curs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-mobile', 'El tauler és per a pantalla gran.');
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/admin/quota');

    // Sense catàleg, el panell el demana. Es carrega l'XML de GestIB (com l'exportacioDadesHoraris).
    const gestib = page.getByTestId('quota-gestib');
    await expect(gestib).toContainText('Falta el catàleg de GestIB');
    await page.getByTestId('xml-gestib').setInputFiles({ name: 'exportacioDadesHoraris.xml', mimeType: 'text/xml', buffer: Buffer.from(XML_E2E) });
    await expect(gestib).toContainText('0 de 4 files amb correspondència');
    await expect(page.locator('[data-estat-gestib="sense"]')).toHaveCount(4);

    // Propostes de totes les files: les segures ja van marcades.
    await page.getByRole('button', { name: 'Proposa correspondències (4)' }).click();
    const revisio = page.getByTestId('revisio-gestib');
    await expect(revisio).toContainText('Segures (4)');
    await expect(revisio).toContainText('Taller de lectura-A-1E');
    await expect(revisio).toContainText('*Dedicació a coordinació');
    await revisio.getByRole('button', { name: 'Desa les marcades (4)' }).click();
    await expect(gestib).toContainText('4 de 4 files amb correspondència');
    await expect(page.locator('[data-estat-gestib="ok"]')).toHaveCount(4);

    // Canviar el grup trenca la correspondència: es veu i es torna a triar a l'editor.
    const catala = fila(page, 'Llengua catalana i literatura');
    await catala.locator('[data-col="grup"]').fill('B');
    await catala.locator('[data-col="grup"]').press('Tab');
    await expect(catala.locator('[data-estat-gestib]')).toHaveAttribute('data-estat-gestib', 'trencat');
    await expect(gestib).toContainText('1 per revisar');
    await page.getByRole('checkbox', { name: 'Només les que falten' }).check();
    await expect(page.locator('[data-classe]')).toHaveCount(1);
    await catala.locator('[data-estat-gestib]').click();
    const editor = page.getByTestId('editor-gestib');
    await expect(editor).toContainText('Cap matèria enllaçada no és del grup B');
    await editor.getByRole('button', { name: 'Fes-la servir' }).click();
    await expect(editor.getByRole('checkbox', { name: /Llengua catalana i literatura-B-1E/ })).toBeChecked();
    await editor.getByRole('button', { name: 'Desa', exact: true }).click();
    await expect(gestib).toContainText('4 de 4 files amb correspondència');
    // Ja no en falta cap: el filtre es treu sol i es tornen a veure totes les files.
    await expect(page.getByRole('checkbox', { name: 'Només les que falten' })).toHaveCount(0);
    await expect(page.locator('[data-classe]')).toHaveCount(4);

    // Una fila nova amb un nom del catàleg ja surt enllaçada.
    const nova = targeta(page, 'Matematiques').locator('[data-nova]');
    await nova.getByPlaceholder('Curs').fill('1ESO');
    await nova.getByPlaceholder('Grup').fill('B');
    await nova.getByPlaceholder('Matèria nova').fill('Matemàtiques');
    await nova.getByPlaceholder('h', { exact: true }).fill('4');
    await nova.getByPlaceholder('h', { exact: true }).press('Enter');
    await expect(gestib).toContainText('5 de 5 files amb correspondència');

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
