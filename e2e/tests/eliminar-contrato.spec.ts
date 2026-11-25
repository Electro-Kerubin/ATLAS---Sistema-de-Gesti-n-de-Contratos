import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI, crearContratoUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Gestión de contratos - Eliminar contrato', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombreCliente = `Cliente ElContrato ${sufijo}`;
  const titulo = `Contrato Eliminar ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));
  await crearContratoUI(page, nombreCliente, titulo);

  await page
    .getByRole('row')
    .filter({ hasText: titulo })
    .locator('[data-testid^="button-contrato-eliminar-"]')
    .click();
  await page.getByTestId('button-contrato-eliminar-confirmar').click();

  await expect(page.getByText('Contrato eliminado')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('row').filter({ hasText: titulo })).toHaveCount(0);
});
