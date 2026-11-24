import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI, toastError } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Crear contrato con fecha fin anterior a fecha inicio debe ser rechazado', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombreCliente = `Cliente NegContrato ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));

  await page.getByTestId('link-nav-contratos').click();
  await page.getByRole('tab', { name: 'Crear Contrato' }).click();
  await page.getByRole('combobox', { name: 'Cliente' }).click();
  await page.getByRole('option', { name: nombreCliente }).click();
  await page.getByLabel('Título').fill(`Contrato Fechas Invertidas ${sufijo}`);
  await page.getByLabel('Fecha inicio').fill('2026-12-31');
  await page.getByLabel('Fecha fin').fill('2026-01-01');
  await page.getByRole('button', { name: 'Crear Contrato' }).click();

  await expect(toastError(page)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Contrato creado')).toHaveCount(0);
});
