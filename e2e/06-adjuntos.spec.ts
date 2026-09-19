import { expect, test } from "@playwright/test";

/**
 * Adjuntos: comprueba el camino completo hasta RustFS (el bucket se crea solo
 * la primera vez) y de vuelta por la URL firmada de descarga.
 */
const PDF_MINIMO = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n",
  "utf8",
);

test.describe("Adjuntos", () => {
  test("subir un justificante, descargarlo y quitarlo", async ({ page }) => {
    await page.goto("/panel/facturas?estado=pagada");
    await page.locator('[data-prueba="fila-factura"]').first().getByRole("link").click();
    await expect(page).toHaveURL(/\/panel\/facturas\/[0-9a-f]{24}$/);

    await page.locator('input[type="file"]').setInputFiles({
      name: "justificante-transferencia.pdf",
      mimeType: "application/pdf",
      buffer: PDF_MINIMO,
    });

    const enlace = page.getByRole("link", { name: "justificante-transferencia.pdf" });
    await expect(enlace).toBeVisible();

    // La descarga pasa por la URL firmada que emite la API: debe devolver el PDF.
    const url = await enlace.getAttribute("href");
    const descarga = await page.request.get(url ?? "");
    expect(descarga.ok()).toBe(true);
    expect((await descarga.body()).subarray(0, 5).toString()).toBe("%PDF-");

    await page.getByRole("button", { name: "Quitar" }).click();
    await expect(enlace).toHaveCount(0);
  });

  test("un tipo de archivo no admitido se rechaza con un mensaje claro", async ({
    page,
  }) => {
    await page.goto("/panel/facturas?estado=pagada");
    await page.locator('[data-prueba="fila-factura"]').first().getByRole("link").click();

    await page.locator('input[type="file"]').setInputFiles({
      name: "notas.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("esto no es un justificante", "utf8"),
    });

    await expect(page.getByText("Solo admitimos PDF, PNG, JPG o WebP.")).toBeVisible();
  });
});
