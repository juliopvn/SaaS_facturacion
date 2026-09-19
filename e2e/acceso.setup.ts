import { expect, test as preparar } from "@playwright/test";

import { EMAIL_DEMO, ESTADO_SESION } from "./utilidades/datos";
import { esperarEnlaceAcceso, vaciarBuzon } from "./utilidades/mailhog";

/**
 * Entra una sola vez con el enlace mágico y guarda la sesión en disco. El
 * resto de pruebas parten de ahí en lugar de repetir el login.
 */
preparar("guardar la sesión de la cuenta demo", async ({ page }) => {
  await vaciarBuzon();

  await page.goto("/acceso");
  await page.getByLabel("Correo electrónico").fill(EMAIL_DEMO);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("heading", { name: "Mira tu correo" })).toBeVisible();

  await page.goto(await esperarEnlaceAcceso(EMAIL_DEMO));
  await expect(page).toHaveURL(/\/panel$/);

  await page.context().storageState({ path: ESTADO_SESION });
});
