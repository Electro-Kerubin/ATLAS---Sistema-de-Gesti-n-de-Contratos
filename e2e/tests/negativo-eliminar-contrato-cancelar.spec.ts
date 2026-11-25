import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI, crearContratoUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Cancelar la eliminación de un contrato no lo borra', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombreCliente = `Cliente NegElContrato ${sufijo}`;
  const titulo = `Contrato NegEliminar ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));
  await crearContratoUI(page, nombreCliente, titulo);

  await page
    .getByRole('row')
    .filter({ hasText: titulo })
    .locator('[data-testid^="button-contrato-eliminar-"]')
    .click();
  await page.getByTestId('button-contrato-eliminar-cancelar').click();

  await expect(page.getByText('Contrato eliminado')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: titulo })).toBeVisible();
});
