import { expect, type Page, test } from "@playwright/test";

import { CLIENTE_SEMBRADO } from "./utilidades/datos";

/*
 * Factura de referencia. Los importes esperados están calculados a mano para
 * que la prueba compruebe la aritmética de verdad, y no se limite a repetir lo
 * que devuelva el código:
 *
 *   línea 1 ·   3 × 45,50 € al 21 %  → base 136,50
 *   línea 2 ·   1 × 199,99 € al 21 % → base 199,99
 *   línea 3 ·   2 × 24,95 € al 4 %   → base  49,90
 *
 *   base imponible  386,39
 *   IVA 21 % sobre 336,49 → 70,66      (336,49 × 0,21 = 70,6629 → 70,66)
 *   IVA  4 % sobre  49,90 →  2,00      ( 49,90 × 0,04 =  1,996  →  2,00)
 *   cuota de IVA     72,66
 *   IRPF 15 % sobre 386,39 → 57,96     (386,39 × 0,15 = 57,9585 → 57,96)
 *   TOTAL           401,09             (386,39 + 72,66 − 57,96)
 */
const LINEAS = [
  { descripcion: "Horas de consultoría", cantidad: "3", precio: "45,50", iva: "21 %" },
  { descripcion: "Licencia de software", cantidad: "1", precio: "199,99", iva: "21 %" },
  { descripcion: "Libro técnico", cantidad: "2", precio: "24,95", iva: "4 %" },
] as const;

const ESPERADO = {
  base: "386,39",
  iva21: "70,66",
  iva4: "2,00",
  cuotaIva: "72,66",
  retencion: "57,96",
  total: "401,09",
  totalCentimos: "40109",
} as const;

async function rellenarLineas(page: Page): Promise<void> {
  for (const [indice, linea] of LINEAS.entries()) {
    if (indice > 0) {
      await page.getByTestId("anadir-linea").click();
    }
    const fila = page.locator('[data-prueba="linea-factura"]').nth(indice);
    await fila.getByLabel("Concepto").fill(linea.descripcion);
    await fila.getByLabel("Uds.").fill(linea.cantidad);
    await fila.getByLabel("Precio €").fill(linea.precio);
    await fila.getByLabel("IVA").selectOption({ label: linea.iva });
  }
}

test.describe("Facturas", () => {
  test("emitir una factura con varias líneas calcula el IVA y el total al céntimo", async ({
    page,
  }) => {
    await page.goto("/panel/facturas/nueva");

    await page
      .getByLabel("Cliente", { exact: true })
      .selectOption({ label: `${CLIENTE_SEMBRADO.nombre} · ${CLIENTE_SEMBRADO.nif}` });
    await page.getByLabel("Retención de IRPF").selectOption("15");
    await rellenarLineas(page);

    // El resumen en vivo ya muestra los totales antes de guardar.
    await expect(page.getByTestId("total-base")).toHaveText(ESPERADO.base);
    await expect(page.getByTestId("total-iva-21")).toHaveText(ESPERADO.iva21);
    await expect(page.getByTestId("total-iva-4")).toHaveText(ESPERADO.iva4);
    await expect(page.getByTestId("total-iva")).toHaveText(ESPERADO.cuotaIva);
    await expect(page.getByTestId("total-retencion")).toHaveText(
      `−${ESPERADO.retencion}`,
    );
    await expect(page.getByTestId("total-factura")).toHaveText(`${ESPERADO.total} €`);

    await page.getByTestId("emitir-factura").click();

    // Y el servidor, que los recalcula por su cuenta, llega a lo mismo.
    await expect(page).toHaveURL(/\/panel\/facturas\/[0-9a-f]{24}$/);
    await expect(page.getByTestId("detalle-base")).toHaveText(ESPERADO.base);
    await expect(page.getByTestId("detalle-iva-21")).toHaveText(ESPERADO.iva21);
    await expect(page.getByTestId("detalle-iva-4")).toHaveText(ESPERADO.iva4);
    await expect(page.getByTestId("detalle-iva")).toHaveText(ESPERADO.cuotaIva);
    await expect(page.getByTestId("detalle-retencion")).toHaveText(
      `−${ESPERADO.retencion}`,
    );
    await expect(page.getByTestId("detalle-total")).toHaveText(`${ESPERADO.total} €`);
    await expect(page.getByText(`${ESPERADO.totalCentimos} céntimos`)).toBeVisible();
    await expect(page.getByText("Emitida", { exact: true })).toBeVisible();
  });

  test("del listado al detalle, los datos coinciden", async ({ page }) => {
    await page.goto("/panel/facturas");

    const fila = page.locator('[data-prueba="fila-factura"]').first();
    const numero = (await fila.locator("td").first().innerText()).trim();
    const total = (await fila.locator("td").last().innerText()).trim();
    const cliente = (await fila.locator("td").nth(1).innerText()).split("\n")[0].trim();

    await fila.getByRole("link", { name: numero }).click();

    await expect(page).toHaveURL(/\/panel\/facturas\/[0-9a-f]{24}$/);
    await expect(page.getByTestId("numero-factura")).toHaveText(numero);
    await expect(page.getByTestId("detalle-total")).toHaveText(`${total} €`);
    await expect(page.getByText(cliente).first()).toBeVisible();
  });

  test("el filtro por estado deja solo las facturas de ese estado", async ({ page }) => {
    await page.goto("/panel/facturas");
    await page.getByLabel("Estado").selectOption("pagada");
    await page.getByRole("button", { name: "Filtrar" }).click();

    await expect(page).toHaveURL(/estado=pagada/);
    const filas = page.locator('[data-prueba="fila-factura"]');
    await expect(filas.first()).toBeVisible();
    for (const fila of await filas.all()) {
      await expect(fila).toContainText("Pagada");
    }
  });

  test("una factura emitida no se puede editar", async ({ page }) => {
    await page.goto("/panel/facturas?estado=pagada");
    await page.locator('[data-prueba="fila-factura"]').first().getByRole("link").click();

    await expect(page.getByRole("link", { name: "Editar borrador" })).toHaveCount(0);
    await expect(page.getByTestId("estado-anulada")).toBeVisible();
  });
});
