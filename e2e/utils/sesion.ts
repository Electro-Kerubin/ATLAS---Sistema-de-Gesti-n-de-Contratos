import { expect, Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:3350';

/** Inicia sesión como administrador (user1) y espera a salir de /login. */
export async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('input-nombre-usuario').fill('user1');
  await page.getByTestId('input-password').fill('Pass1234');
  await page.getByTestId('button-login').click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Crea un contrato por la UI (pestaña "Crear Contrato") para un cliente ya existente. */
export async function crearContratoUI(
  page: Page,
  nombreCliente: string,
  titulo: string,
  archivo?: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.getByTestId('link-nav-contratos').click();
  await page.getByRole('tab', { name: 'Crear Contrato' }).click();
  await page.getByRole('combobox', { name: 'Cliente' }).click();
  await page.getByRole('option', { name: nombreCliente }).click();
  await page.getByLabel('Título').fill(titulo);
  await page.getByLabel('Fecha inicio').fill('2026-01-01');
  await page.getByLabel('Fecha fin').fill('2026-12-31');
  await page.getByLabel('Descripción').fill('Contrato de prueba automatizada');
  if (archivo) await page.locator('input[type="file"]').setInputFiles(archivo);
  await page.getByRole('button', { name: 'Crear Contrato' }).click();
  await expect(page.getByText('Contrato creado')).toBeVisible({ timeout: 5000 });
}

/** Toast de error (sonner) visible en pantalla. */
export function toastError(page: Page) {
  return page.locator('[data-sonner-toast][data-type="error"]').first();
}

/** Inicia sesión con cualquier usuario y espera a salir de /login. */
export async function loginComo(page: Page, usuario: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('input-nombre-usuario').fill(usuario);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('button-login').click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Crea un usuario por la UI (pestaña "Crear Usuario"). */
export async function crearUsuarioUI(
  page: Page,
  nombreUsuario: string,
  correo: string,
  rol: 'Administrador' | 'Editor' = 'Administrador',
) {
  await page.getByTestId('link-nav-usuarios').click();
  await page.getByRole('tab', { name: 'Crear Usuario' }).click();
  await page.getByLabel('Nombre de usuario').fill(nombreUsuario);
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill('Pass1234');
  if (rol !== 'Administrador') {
    await page.getByRole('combobox', { name: 'Rol' }).click();
    await page.getByRole('option', { name: rol }).click();
  }
  await page.getByRole('button', { name: 'Crear Usuario' }).click();
  await expect(page.getByText('Usuario creado')).toBeVisible({ timeout: 5000 });
}

/** Crea un cliente por la UI (pestaña "Crear Cliente"), con nombre y correo únicos. */
export async function crearClienteUI(page: Page, nombre: string, correo: string) {
  await page.getByTestId('link-nav-clientes').click();
  await page.getByRole('tab', { name: 'Crear Cliente' }).click();
  await page.locator('#nombre-cliente-create').fill(nombre);
  await page.locator('#correo-cliente-create').fill(correo);
  await page.locator('#crear-cliente-create').click();
  await expect(page.getByText('Cliente creado')).toBeVisible({ timeout: 5000 });
}
