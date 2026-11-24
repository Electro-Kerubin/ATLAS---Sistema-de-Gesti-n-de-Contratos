import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/sesion';

test('Cuenta - Editar cuenta abre el formulario del usuario autenticado', async ({ page }) => {
  await loginAdmin(page);
  await page.getByTestId('button-layout-editar-cuenta').click();

  await expect(page).toHaveURL(/\/usuarios\/\d+\/editar/);
  await expect(page.getByTestId('input-usuario-nombre')).toHaveValue('user1');
  await expect(page.getByTestId('input-usuario-correo')).not.toHaveValue('');
});
