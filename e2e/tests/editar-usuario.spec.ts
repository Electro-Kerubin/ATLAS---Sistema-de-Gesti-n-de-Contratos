import { test, expect } from '@playwright/test';
import { loginAdmin, crearUsuarioUI } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Gestión de usuarios - Editar correo de un usuario', async ({ page }) => {
  const nombre = generarNombreUsuarioUnico('usereditar');
  const correoNuevo = generarCorreoUnico('editado');

  await loginAdmin(page);
  await crearUsuarioUI(page, nombre, generarCorreoUnico());

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-usuario-editar-"]')
    .click();

  await page.getByTestId('input-usuario-correo').fill(correoNuevo);
  await page.getByTestId('button-usuario-actualizar').click();

  await expect(page.getByText('Información del usuario actualizada')).toBeVisible({ timeout: 5000 });
});
