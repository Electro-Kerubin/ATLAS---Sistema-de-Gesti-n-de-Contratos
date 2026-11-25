import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Editar cliente dejando el nombre vacío muestra validación', async ({ page }) => {
  const nombre = `Cliente NegEditar ${Date.now().toString().slice(-8)}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombre, generarCorreoUnico('cliente'));

  await page
    .getByRole('row')
    .filter({ hasText: nombre })
    .locator('[data-testid^="button-cliente-editar-"]')
    .click();

  await page.getByTestId('input-cliente-nombre').fill('');
  await page.getByTestId('button-cliente-guardar').click();

  await expect(page.getByText('Por favor completa los campos requeridos')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Cliente actualizado')).toHaveCount(0);
});
