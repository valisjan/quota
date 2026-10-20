import { expect, test } from '@playwright/test';

// Pàgina Professorat en mode de prova (dades en memòria, sense Firestore).
test.describe('Professorat', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('quota_theme', 'light');
      localStorage.setItem('darkMode', 'false');
    });
  });

  // Taula a l'escriptori i targetes al mòbil: es compta només el que es veu.
  const files = (page) => page.locator('[data-professor]:visible');
  const fila = (page, nom) => page.locator(`[data-professor="${nom}"]:visible`);

  test('alta, edició, substitució, retorn i baixa del professorat', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/admin/professorat');

    // Mentre el professorat ve del full, la pàgina és de consulta.
    await expect(page.getByRole('heading', { name: /^Fitxes del curs/ })).toBeVisible();
    await expect(files(page)).toHaveCount(3);
    await expect(page.getByTestId('nou-professor')).toHaveCount(0);
    await page.getByRole('button', { name: 'Gestiona el professorat des de Quota' }).click();
    await page.getByRole('button', { name: 'Fes el pas' }).click();
    await expect(page.getByTestId('nou-professor')).toBeVisible();

    // Filtres.
    await page.getByPlaceholder('Nom, correu, codi o comentari').fill('pere');
    await expect(files(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Neteja els filtres' }).click();
    await expect(files(page)).toHaveCount(3);

    // Alta amb validació: el correu repetit no es pot desar.
    await page.getByTestId('nou-professor').click();
    const fitxa = page.getByTestId('fitxa-professor');
    await fitxa.getByPlaceholder('COGNOMS, NOM').fill('ROIG MAS, ANNA');
    await fitxa.getByPlaceholder('usuari').fill('pere.blanes');
    await fitxa.getByLabel('Afegeix un departament').selectOption('Matematiques');
    await expect(fitxa.getByText('El correu ja és de Pere Blanes.')).toBeVisible();
    await expect(fitxa.getByRole('button', { name: 'Desa', exact: true })).toBeDisabled();
    await fitxa.getByPlaceholder('usuari').fill('aroig');
    await fitxa.getByPlaceholder('ADEL').fill('mat9');
    await fitxa.getByRole('button', { name: 'Desa', exact: true }).click();
    await expect(fila(page, 'ROIG MAS, ANNA')).toContainText('MAT9');
    await expect(fila(page, 'ROIG MAS, ANNA')).toContainText('aroig@iesjosepsuredaiblanes.com');

    // Edició: jornada i rol.
    await fila(page, 'Joana Pons').click();
    await fitxa.getByRole('combobox').first().selectOption('M');
    await fitxa.getByText('Cap de departament', { exact: true }).click();
    await fitxa.getByRole('button', { name: 'Desa', exact: true }).click();
    await expect(fila(page, 'Joana Pons')).toContainText('Mitja jornada');
    await expect(fila(page, 'Joana Pons')).toContainText('Cap de departament');

    // Substitució (des de la fitxa): el substitut hereta la plaça i el titular passa a Anteriors.
    await fila(page, 'Pere Blanes').click();
    await fitxa.getByRole('button', { name: 'Substitueix' }).click();
    await expect(fitxa.getByPlaceholder('ADEL')).toHaveValue('PBLA');
    await fitxa.getByPlaceholder('COGNOMS, NOM').fill('VIDAL COLL, JOAN');
    await fitxa.getByPlaceholder('usuari').fill('jvidal');
    await fitxa.getByRole('button', { name: "Dona d'alta el substitut" }).click();
    await expect(fila(page, 'VIDAL COLL, JOAN')).toContainText('Substitueix Pere Blanes');
    await expect(fila(page, 'Pere Blanes')).toHaveCount(0);
    await page.getByRole('button', { name: 'Anteriors (1)' }).click();
    await expect(fila(page, 'Pere Blanes')).toContainText('substituït per VIDAL COLL, JOAN');

    // Torna el titular: el substitut passa a Anteriors.
    await fila(page, 'Pere Blanes').getByRole('button', { name: 'Reactiva' }).click();
    await expect(page.getByText('Desactiva el substitut')).toBeVisible();
    await page.getByRole('button', { name: 'Reactiva', exact: true }).last().click();
    await expect(fila(page, 'Pere Blanes')).toBeVisible();
    await expect(fila(page, 'VIDAL COLL, JOAN')).toHaveCount(0);
    await page.getByRole('button', { name: 'Anteriors (1)' }).click();
    await expect(fila(page, 'VIDAL COLL, JOAN')).toContainText('Fi de la substitució');

    // Baixa: no s'esborra, passa a Anteriors.
    await page.getByRole('button', { name: /^Actius/ }).click();
    await fila(page, 'ROIG MAS, ANNA').click();
    await fitxa.getByRole('button', { name: 'Desactiva' }).click();
    await page.getByRole('button', { name: 'Desactiva', exact: true }).last().click();
    await expect(page.getByRole('button', { name: 'Anteriors (2)' })).toBeVisible();

    // Ordenació per plaça, de més a menys (capçalera a l'escriptori, selector al mòbil).
    if (testInfo.project.name === 'chromium-mobile') {
      await page.getByLabel('Ordena per').selectOption('codiUntis');
      await page.getByRole('button', { name: '▲ A-Z' }).click();
    } else {
      await page.getByRole('button', { name: 'Plaça' }).click();
      await page.getByRole('button', { name: 'Plaça' }).click();
    }
    await expect(files(page).first()).toContainText('PBLA');

    expect(errors).toEqual([]);
  });

  test('es veu bé en mode fosc', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('quota_theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    });
    await page.goto('/admin/professorat');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(files(page)).toHaveCount(3);
  });
});
