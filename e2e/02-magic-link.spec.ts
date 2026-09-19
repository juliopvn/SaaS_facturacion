import { expect, test } from "@playwright/test";

import { EMAIL_DEMO } from "./utilidades/datos";
import { esperarEnlaceAcceso, vaciarBuzon } from "./utilidades/mailhog";

/* El flujo completo de acceso parte siempre de una sesión en blanco. */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Acceso con enlace mágico", () => {
  test("pedir el enlace, recogerlo del correo y entrar al panel", async ({ page }) => {
    await vaciarBuzon();

    await page.goto("/acceso");
    await page.getByLabel("Correo electrónico").fill(EMAIL_DEMO);
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();

    await expect(page.getByRole("heading", { name: "Mira tu correo" })).toBeVisible();
    await expect(page.getByText(EMAIL_DEMO)).toBeVisible();

    const enlace = await esperarEnlaceAcceso(EMAIL_DEMO);
    await page.goto(enlace);

    await expect(page).toHaveURL(/\/panel$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Tu resumen" }),
    ).toBeVisible();

    // El token es de un solo uso: el mismo enlace ya no vale.
    await page.context().clearCookies();
    await page.goto(enlace);
    await expect(page).toHaveURL(/\/acceso\?motivo=usado$/);
    await expect(page.getByText("Ese enlace ya se usó.")).toBeVisible();
  });
});
