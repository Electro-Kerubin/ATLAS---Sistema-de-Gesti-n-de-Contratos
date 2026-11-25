import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/sesion';

test('Negativo - Crear cliente sin nombre ni correo debe ser rechazado con error 4xx', async ({ page }) => {
  await loginAdmin(page);
  await page.getByTestId('link-nav-clientes').click();
  await page.getByRole('tab', { name: 'Crear Cliente' }).click();

  // Se envía el formulario completamente vacío y se captura la respuesta del backend
  const [respuesta] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/clientes') && r.request().method() === 'POST'),
    page.locator('#crear-cliente-create').click(),
  ]);

  // Debe ser un rechazo por validación (400-499), no una creación (2xx) ni un error interno (500)
  expect(respuesta.status()).toBeGreaterThanOrEqual(400);
  expect(respuesta.status()).toBeLessThan(500);
  await expect(page.getByText('Cliente creado')).toHaveCount(0);
});
