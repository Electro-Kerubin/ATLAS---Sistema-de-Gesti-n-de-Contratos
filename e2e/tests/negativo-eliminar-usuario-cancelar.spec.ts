import { test, expect } from '@playwright/test';
import { loginAdmin, crearUsuarioUI } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Negativo - Cancelar la eliminación de un usuario no lo borra', async ({ page }) => {
  const nombre = generarNombreUsuarioUnico('usernegelim');

  await loginAdmin(page);
  await crearUsuarioUI(page, nombre, generarCorreoUnico());

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-usuario-eliminar-"]')
    .click();
  await page.getByTestId('button-usuario-eliminar-cancelar').click();

  await expect(page.getByText('Usuario eliminado')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: nombre })).toBeVisible();
});
