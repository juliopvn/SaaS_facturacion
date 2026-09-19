import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test contra producción (Fase 8 del bloque de producción).
 *
 *   BASE_URL=https://facturacion.jpavon-tech.com \
 *   DEMO_EMAIL=pruebas@… npm run test:e2e:prod
 *
 * Diferencias deliberadas respecto a `playwright.config.ts`:
 *
 *  - No hay `globalSetup`: en producción no se siembra ni se borra nada.
 *  - No hay `webServer`: la aplicación ya está desplegada.
 *  - Solo corre la landing y la protección de rutas, que no escriben datos.
 *    El resto de la suite crea clientes y facturas, y no debe tocar la base de
 *    producción; para probar los flujos de escritura hazlo a mano con una
 *    cuenta de prueba dedicada.
 */
const BASE_URL = process.env.BASE_URL ?? process.env.E2E_BASE_URL;

if (!BASE_URL) {
  throw new Error(
    "Define BASE_URL con la URL pública, por ejemplo BASE_URL=https://facturacion.jpavon-tech.com",
  );
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: [/01-landing\.spec\.ts/, /03-proteccion-rutas\.spec\.ts/],
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],

  use: {
    baseURL: BASE_URL,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    testIdAttribute: "data-prueba",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    // Sin sesión guardada: estas pruebas son las que corren de anónimo.
    storageState: { cookies: [], origins: [] },
  },
});
