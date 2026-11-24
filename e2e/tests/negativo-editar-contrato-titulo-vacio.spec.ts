import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI, crearContratoUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Editar contrato dejando el título vacío muestra validación', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombreCliente = `Cliente NegEdContrato ${sufijo}`;
  const titulo = `Contrato NegEditar ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));
  await crearContratoUI(page, nombreCliente, titulo);

  await page
    .getByRole('row')
    .filter({ hasText: titulo })
    .locator('[data-testid^="button-contrato-editar-"]')
    .click();

  await page.getByTestId('input-contrato-titulo').fill('');
  await page.getByTestId('button-contrato-guardar').click();

  await expect(page.getByText('Por favor completa los campos requeridos')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Contrato actualizado')).toHaveCount(0);
});
