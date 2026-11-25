import { test, expect } from '@playwright/test';
import { BASE_URL, toastError } from '../utils/sesion';

test('Negativo - Login con inyección SQL no debe iniciar sesión', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('input-nombre-usuario').fill("' OR '1'='1' --");
  await page.getByTestId('input-password').fill("' OR '1'='1");
  await page.getByTestId('button-login').click();

  await expect(toastError(page)).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Sesión iniciada')).toHaveCount(0);
});
