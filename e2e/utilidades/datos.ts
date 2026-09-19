/** Constantes compartidas por las pruebas. Deben casar con `scripts/seed.ts`. */

export const EMAIL_DEMO = process.env.DEMO_EMAIL ?? "demo@talonario.test";

export const ESTADO_SESION = ".playwright/estado-sesion.json";

/** Cliente sembrado que usan las pruebas de facturas. */
export const CLIENTE_SEMBRADO = {
  nombre: "Gráfica Mediterránea S.L.",
  nif: "23456783B",
} as const;

/** Cliente que da de alta la prueba de creación. */
export const CLIENTE_NUEVO = {
  nombre: "Taller Tipográfico del Norte S.L.",
  nif: "45678912H",
  email: "hola@tallertipografico.test",
  ciudad: "Bilbao",
  codigoPostal: "48001",
} as const;
