import { expect, test } from "@playwright/test";

/* La landing es pública: estas pruebas corren sin sesión. */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Landing", () => {
  test("carga y su llamada a la acción lleva al acceso", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Las cuentas salen/ }),
    ).toBeVisible();
    // La hoja del hero muestra el total calculado, no un texto inventado.
    await expect(page.getByText("céntimos", { exact: false }).first()).toBeVisible();

    await page.getByRole("link", { name: "Emitir mi primera factura" }).click();

    await expect(page).toHaveURL(/\/acceso$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Entra sin contraseña" }),
    ).toBeVisible();
  });
});
