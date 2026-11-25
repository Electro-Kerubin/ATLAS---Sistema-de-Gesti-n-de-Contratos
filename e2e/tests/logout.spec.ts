import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/sesion';

test('Logout - Cerrar sesión vuelve al login y protege las rutas', async ({ page }) => {
  await loginAdmin(page);
  await page.getByTestId('button-layout-logout').click();
  await expect(page).toHaveURL(/\/login/);

  // Sin sesión no se puede entrar a una ruta protegida
  await page.goto('http://localhost:3350/clientes');
  await expect(page).toHaveURL(/\/login/);
});
