import { defineConfig, devices } from "@playwright/test";
import { config as cargarEntorno } from "dotenv";

import { ESTADO_SESION } from "./e2e/utilidades/datos";

// Las pruebas comparten la configuración local de la aplicación.
cargarEntorno({ path: ".env.local", quiet: true });
cargarEntorno({ path: ".env", override: false, quiet: true });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  /* Levanta Docker, valida los servicios y siembra la base antes de nada. */
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    /* Los ganchos de prueba del marcado se llaman `data-prueba`. */
    testIdAttribute: "data-prueba",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      /* Entra una vez con el enlace mágico y guarda la cookie para el resto. */
      name: "preparacion",
      testMatch: /acceso\.setup\.ts/,
    },
    {
      name: "navegador",
      dependencies: ["preparacion"],
      use: { ...devices["Desktop Chrome"], storageState: ESTADO_SESION },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
