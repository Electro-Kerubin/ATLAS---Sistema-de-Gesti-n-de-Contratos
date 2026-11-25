import { test, expect } from '@playwright/test';

test('Gestión de clientes - Crear cliente con datos correctos', async ({ page }) => {
  // Datos únicos por ejecución para evitar conflictos con registros previos
  const id = Date.now().toString().slice(-8);

  // Login
  await page.goto('http://localhost:3350/login');
  await page.getByTestId('input-nombre-usuario').fill('user1');
  await page.getByTestId('input-password').fill('Pass1234');
  await page.getByTestId('button-login').click();

  // Ir a Gestión de Clientes > pestaña "Crear Cliente"
  await page.getByTestId('link-nav-clientes').click();
  await expect(page.getByText('Gestión de Clientes')).toBeVisible();
  await page.getByRole('tab', { name: 'Crear Cliente' }).click();

  // 1. Información del cliente
  await page.locator('#nombre-cliente-create').fill(`Cliente Test ${id}`);
  await page.locator('#nombre-fantasia-cliente-create').fill(`Fantasia ${id}`);
  await page.locator('#giro-cliente-create').fill('Servicios informáticos');

  // 2. Representante
  await page.locator('#nombre-representante-cliente-create').fill('Juan Pérez');
  await page.locator('#cargo-representante-cliente-create').fill('Gerente');
  await page.locator('#correo-representante-cliente-create').fill(`rep${id}@correo.com`);
  await page.locator('#telefono-representante-cliente-create').fill('912341234');

  // 3. Contacto
  await page.locator('#direccion-calle-cliente-create').fill('Calle 123');
  await page.locator('#direccion-numero-cliente-create').fill('456');
  await page.locator('#direccion-ciudad-cliente-create').fill('Santiago');
  await page.locator('#direccion-region-cliente-create').fill('Metropolitana');
  await page.locator('#correo-cliente-create').fill(`cliente${id}@correo.com`);
  await page.locator('#telefono-cliente-create').fill('912341234');

  // Guardar
  await page.locator('#crear-cliente-create').click();

  await expect(page.getByText('Cliente creado')).toBeVisible({ timeout: 5000 });
});
