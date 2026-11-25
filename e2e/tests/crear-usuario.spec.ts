import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Gestión de usuarios - Crear usuario con datos correctos', async ({ page }) => {
  await loginAdmin(page);
  await page.getByTestId('link-nav-usuarios').click();
  await page.getByRole('tab', { name: 'Crear Usuario' }).click();

  await page.getByLabel('Nombre de usuario').fill(generarNombreUsuarioUnico());
  await page.getByLabel('Correo electrónico').fill(generarCorreoUnico());
  await page.getByLabel('Contraseña').fill('Pass1234');
  await page.getByRole('button', { name: 'Crear Usuario' }).click();

  await expect(page.getByText('Usuario creado')).toBeVisible({ timeout: 5000 });
});
