import { test, expect } from '@playwright/test';
import { loginAdmin, toastError } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Crear usuario con nombre de usuario ya existente debe ser rechazado', async ({ page }) => {
  await loginAdmin(page);
  await page.getByTestId('link-nav-usuarios').click();
  await page.getByRole('tab', { name: 'Crear Usuario' }).click();

  await page.getByLabel('Nombre de usuario').fill('user1');
  await page.getByLabel('Correo electrónico').fill(generarCorreoUnico());
  await page.getByLabel('Contraseña').fill('Pass1234');
  await page.getByRole('button', { name: 'Crear Usuario' }).click();

  await expect(toastError(page)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Usuario creado')).toHaveCount(0);
});
