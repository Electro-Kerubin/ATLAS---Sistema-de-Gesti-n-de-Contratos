import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/sesion';

test('Auditoría - Muestra el historial de acciones', async ({ page }) => {
  await loginAdmin(page);
  await page.getByTestId('link-nav-auditoría').click();

  await expect(page.getByRole('heading', { name: 'Auditoría' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Acción' })).toBeVisible();
  // Al menos un registro (el propio login/creaciones previas)
  await expect(page.getByRole('row')).not.toHaveCount(1);
});
