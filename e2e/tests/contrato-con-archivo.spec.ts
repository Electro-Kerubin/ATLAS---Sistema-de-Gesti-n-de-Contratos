import { test, expect } from '@playwright/test';
import { loginAdmin, crearClienteUI, crearContratoUI } from '../utils/sesion';
import { generarCorreoUnico } from '../utils/datos-unicos';

test('Gestión de contratos - Crear contrato adjuntando un archivo PDF', async ({ page }) => {
  const sufijo = Date.now().toString().slice(-8);
  const nombreCliente = `Cliente Archivo ${sufijo}`;
  const titulo = `Contrato con archivo ${sufijo}`;

  await loginAdmin(page);
  await crearClienteUI(page, nombreCliente, generarCorreoUnico('cliente'));
  await crearContratoUI(page, nombreCliente, titulo, {
    name: 'contrato.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
  });

  // El contrato queda en la lista y la columna Archivo ya no está vacía
  const fila = page.getByRole('row').filter({ hasText: titulo });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText(/contrato\.pdf|Ver|Descargar|PDF/i);
});
