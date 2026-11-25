import { test, expect } from '@playwright/test';
import { BASE_URL, toastError } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Negativo - Registro con usuario ya existente (user1) debe ser rechazado', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('link-registro').click();

  // Paso 1: nombre de usuario que ya existe
  await page.getByTestId('input-registro-nombre-usuario').fill('user1');
  await page.getByTestId('input-registro-correo').fill(generarCorreoUnico());
  await page.getByTestId('input-registro-password').fill('Pass1234');
  await page.getByTestId('button-registro-continuar').click();

  // Paso 2: empresa con datos válidos y únicos
  await page.getByTestId('input-registro-nombre-empresa').fill('Empresa Duplicada');
  await page.getByTestId('input-registro-calle').fill('Calle 123');
  await page.getByTestId('input-registro-comuna').fill('Santiago');
  await page.getByTestId('input-registro-region').fill('Metropolitana');
  await page.getByTestId('input-registro-telefono').fill('912341234');
  await page.getByTestId('input-registro-correo-empresa').fill(generarCorreoUnico('corpo', 'corpo.com'));
  await page.getByTestId('button-registro-crear-cuenta').click();

  await expect(toastError(page)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Cuenta creada exitosamente')).toHaveCount(0);
});
