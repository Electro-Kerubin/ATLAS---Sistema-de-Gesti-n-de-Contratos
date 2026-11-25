import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Gestión de clientes - Editar cliente existente', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombre = `Cliente Editar ${sufijo}`;
  const nombreNuevo = `Cliente Editado ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombre, generarCorreoUnico('cliente'));

  const fila = page.getByRole('row').filter({ hasText: nombre });
  await fila.locator('[data-testid^="button-cliente-editar-"]').click();

  await page.getByTestId('input-cliente-nombre').fill(nombreNuevo);
  await page.getByTestId('button-cliente-guardar').click();

  await expect(page.getByText('Cliente actualizado')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('row').filter({ hasText: nombreNuevo })).toBeVisible();
});
