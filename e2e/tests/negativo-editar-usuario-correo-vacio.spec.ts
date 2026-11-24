import { test, expect } from '@playwright/test';
import { loginAdmin, crearUsuarioUI } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Negativo - Editar usuario dejando el correo vacío muestra validación', async ({ page }) => {
  const nombre = generarNombreUsuarioUnico('usernegedit');

  await loginAdmin(page);
  await crearUsuarioUI(page, nombre, generarCorreoUnico());

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-usuario-editar-"]')
    .click();

  await page.getByTestId('input-usuario-correo').fill('');
  await page.getByTestId('button-usuario-actualizar').click();

  await expect(page.getByText('Por favor completa el campo de correo')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Información del usuario actualizada')).toHaveCount(0);
});
