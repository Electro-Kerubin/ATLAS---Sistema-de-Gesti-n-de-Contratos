import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI, crearContratoUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Gestión de contratos - Editar contrato existente', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombreCliente = `Cliente EdContrato ${sufijo}`;
  const titulo = `Contrato Editar ${sufijo}`;
  const tituloNuevo = `Contrato Editado ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));
  await crearContratoUI(page, nombreCliente, titulo);

  await page
    .getByRole('row')
    .filter({ hasText: titulo })
    .locator('[data-testid^="button-contrato-editar-"]')
    .click();

  await page.getByTestId('input-contrato-titulo').fill(tituloNuevo);
  await page.getByTestId('button-contrato-guardar').click();

  await expect(page.getByText('Contrato actualizado')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('row').filter({ hasText: tituloNuevo })).toBeVisible();
});
