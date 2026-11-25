import { test, expect } from '@playwright/test';
import { BASE_URL } from '../utils/sesion';

test('Login - Credenciales inválidas muestra error y no inicia sesión', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('input-nombre-usuario').fill('user1');
  await page.getByTestId('input-password').fill('ClaveIncorrecta999');
  await page.getByTestId('button-login').click();

  await expect(page.getByText('Credenciales inválidas').first()).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/\/login/);
});
