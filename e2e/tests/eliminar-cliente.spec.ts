import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Gestión de clientes - Eliminar cliente', async ({ page }) => {
  const nombre = `Cliente Eliminar ${Date.now().toString().slice(-8)}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombre, generarCorreoUnico('cliente'));

  const fila = page.getByRole('row').filter({ hasText: nombre });
  await fila.locator('[data-testid^="button-cliente-eliminar-"]').click();
  await page.getByTestId('button-cliente-eliminar-confirmar').click();

  await expect(page.getByText('Cliente eliminado')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('row').filter({ hasText: nombre })).toHaveCount(0);
});
