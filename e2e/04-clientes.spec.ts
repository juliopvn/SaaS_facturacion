import { expect, test } from "@playwright/test";

import { CLIENTE_NUEVO } from "./utilidades/datos";

test.describe("Clientes", () => {
  test("dar de alta un cliente y verlo en el listado", async ({ page }) => {
    await page.goto("/panel/clientes");
    await page.getByRole("link", { name: "Nuevo cliente" }).first().click();
    await expect(page).toHaveURL(/\/panel\/clientes\/nuevo$/);

    await page.getByLabel("Nombre o razón social").fill(CLIENTE_NUEVO.nombre);
    await page.getByLabel("NIF, NIE o CIF").fill(CLIENTE_NUEVO.nif);
    await page.getByLabel("Correo electrónico").fill(CLIENTE_NUEVO.email);
    await page.getByLabel("Población").fill(CLIENTE_NUEVO.ciudad);
    await page.getByLabel("Código postal").fill(CLIENTE_NUEVO.codigoPostal);
    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page).toHaveURL(/\/panel\/clientes$/);
    const fila = page
      .locator('[data-prueba="fila-cliente"]')
      .filter({ hasText: CLIENTE_NUEVO.nombre });
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText(CLIENTE_NUEVO.nif);
    await expect(fila).toContainText(CLIENTE_NUEVO.ciudad);
  });

  test("un NIF con letra de control incorrecta no se guarda", async ({ page }) => {
    await page.goto("/panel/clientes/nuevo");

    await page.getByLabel("Nombre o razón social").fill("Cliente con NIF inventado");
    await page.getByLabel("NIF, NIE o CIF").fill("12345678A");
    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page.getByText("El NIF, NIE o CIF no es válido.")).toBeVisible();
    await expect(page).toHaveURL(/\/panel\/clientes\/nuevo$/);
  });
});
