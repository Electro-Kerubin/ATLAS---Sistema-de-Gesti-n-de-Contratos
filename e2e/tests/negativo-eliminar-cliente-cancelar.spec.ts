import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Cancelar la eliminación de un cliente no lo borra', async ({ page }) => {
  const nombre = `Cliente NegEliminar ${Date.now().toString().slice(-8)}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombre, generarCorreoUnico('cliente'));

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-cliente-eliminar-"]')
    .click();
  await page.getByTestId('button-cliente-eliminar-cancelar').click();

  await expect(page.getByText('Cliente eliminado')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: nombre })).toBeVisible();
});
