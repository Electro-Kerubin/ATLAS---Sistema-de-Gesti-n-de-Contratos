import { test, expect } from '@playwright/test';
import { loginAdmin, crearUsuarioUI } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Gestión de usuarios - Cambiar contraseña de un usuario', async ({ page }) => {
  const nombre = generarNombreUsuarioUnico('userpass');

  await loginAdmin(page);
  await crearUsuarioUI(page, nombre, generarCorreoUnico());

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-usuario-editar-"]')
    .click();

  await page.getByTestId('input-usuario-password').fill('NuevaPass1234');
  await page.getByTestId('input-usuario-confirmar-password').fill('NuevaPass1234');
  await page.getByTestId('button-usuario-actualizar-password').click();

  await expect(page.getByText('Contraseña actualizada')).toBeVisible({ timeout: 5000 });
});
