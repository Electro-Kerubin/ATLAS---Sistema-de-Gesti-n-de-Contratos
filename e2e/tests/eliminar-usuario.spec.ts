import { test, expect } from '@playwright/test';
import { loginAdmin, crearUsuarioUI } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Gestión de usuarios - Eliminar usuario', async ({ page }) => {
  const nombre = generarNombreUsuarioUnico('userelim');

  await loginAdmin(page);
  await crearUsuarioUI(page, nombre, generarCorreoUnico());

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-usuario-eliminar-"]')
    .click();
  await page.getByTestId('button-usuario-eliminar-confirmar').click();

  await expect(page.getByText('Usuario eliminado')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('row').filter({ hasText: nombre })).toHaveCount(0);
});
