import { expect, test } from "@playwright/test";

/* Sin sesión: es justo lo que se está comprobando. */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Protección de rutas (proxy.ts)", () => {
  for (const ruta of ["/panel", "/panel/facturas", "/panel/clientes/nuevo"]) {
    test(`sin sesión, ${ruta} redirige al acceso`, async ({ page }) => {
      await page.goto(ruta);

      await expect(page).toHaveURL(
        new RegExp(
          `/acceso\\?destino=${encodeURIComponent(ruta).replace(/\//g, "%2F")}$`,
        ),
      );
      await expect(
        page.getByRole("heading", { level: 1, name: "Entra sin contraseña" }),
      ).toBeVisible();
    });
  }

  test("la API responde 401 con el contrato de error, no con una redirección", async ({
    request,
  }) => {
    const respuesta = await request.get("/api/clientes");

    expect(respuesta.status()).toBe(401);
    expect(await respuesta.json()).toEqual({
      error: "Necesitas iniciar sesión para hacer esto.",
    });
  });
});
