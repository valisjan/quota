import { expect, test } from '@playwright/test';

const routes = [
  { name: 'resums', path: '/resums', marker: 'Grups', markerRole: 'button' },
  { name: 'dades-importades', path: '/admin/dades', marker: 'Classes' },
  { name: 'departament', path: '/departament', marker: 'Repartiment' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quota_theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  });
});

for (const route of routes) {
  test(`${route.name} renders in dark mode`, async ({ page }, testInfo) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto(route.path);
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/dark/);
    const marker = route.markerRole
      ? page.getByRole(route.markerRole, { name: route.marker, exact: true })
      : page.getByText(route.marker).first();
    await expect(marker).toBeVisible();

    const visualState = await page.evaluate(() => {
      const app = document.querySelector('#app')?.getBoundingClientRect();
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const nav = document.querySelector('nav')?.getBoundingClientRect();
      return {
        appArea: app ? Math.round(app.width * app.height) : 0,
        bodyBg,
        navHeight: nav ? Math.round(nav.height) : 0,
      };
    });

    expect(visualState.appArea).toBeGreaterThan(50_000);
    expect(visualState.navHeight).toBeGreaterThan(40);
    expect(visualState.bodyBg).not.toBe('rgb(255, 255, 255)');

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.byteLength).toBeGreaterThan(15_000);
    await testInfo.attach(`${route.name}-dark`, {
      body: screenshot,
      contentType: 'image/png',
    });

    expect(consoleErrors).toEqual([]);
  });
}
