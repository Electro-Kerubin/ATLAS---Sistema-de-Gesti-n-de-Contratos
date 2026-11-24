import { test, expect } from '@playwright/test';
import { BASE_URL, loginAdmin, loginComo, crearUsuarioUI } from '../utils/sesion';
import { generarCorreoUnico, generarNombreUsuarioUnico } from '../utils/datos-unicos';

test('Negativo - Un usuario Editor no debe acceder a la gestión de usuarios', async ({ page }) => {
  const editor = generarNombreUsuarioUnico('editor');

  // Precondición: el administrador crea un usuario con rol Editor
  await loginAdmin(page);
  await crearUsuarioUI(page, editor, generarCorreoUnico(), 'Editor');
  await page.getByTestId('button-layout-logout').click();
  await expect(page).toHaveURL(/\/login/);

  // El editor intenta entrar a rutas solo para administradores
  await loginComo(page, editor, 'Pass1234');
  await page.goto(`${BASE_URL}/usuarios`);
  await expect(page).not.toHaveURL(/\/usuarios/);

  await page.goto(`${BASE_URL}/clientes/nuevo`);
  await expect(page).not.toHaveURL(/\/clientes\/nuevo/);
});
