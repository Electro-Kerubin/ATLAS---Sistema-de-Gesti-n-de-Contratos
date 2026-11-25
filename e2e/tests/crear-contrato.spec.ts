import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Gestión de contratos - Crear contrato con datos correctos', async ({ page }) => {
  const nombreCliente = `Cliente Contrato ${Date.now().toString().slice(-8)}`;

  await loginAdmin(page);
  // Precondición: un cliente al cual asociar el contrato
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));

  await page.getByTestId('link-nav-contratos').click();
  await page.getByRole('tab', { name: 'Crear Contrato' }).click();

  await page.getByRole('combobox', { name: 'Cliente' }).click();
  await page.getByRole('option', { name: nombreCliente }).click();
  await page.getByLabel('Título').fill(`Contrato ${Date.now().toString().slice(-8)}`);
  await page.getByLabel('Fecha inicio').fill('2026-01-01');
  await page.getByLabel('Fecha fin').fill('2026-12-31');
  await page.getByLabel('Descripción').fill('Contrato de prueba automatizada');
  await page.getByRole('button', { name: 'Crear Contrato' }).click();

  await expect(page.getByText('Contrato creado')).toBeVisible({ timeout: 5000 });
});
