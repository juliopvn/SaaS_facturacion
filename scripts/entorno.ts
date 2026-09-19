/**
 * Carga de variables de entorno para los scripts de línea de comandos.
 *
 * Next.js lee `.env.local` por su cuenta, pero `tsx` no: este módulo replica el
 * mismo orden de precedencia. Impórtalo el primero de todo.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";

const raiz = process.cwd();

for (const fichero of [".env.local", ".env"]) {
  const ruta = resolve(raiz, fichero);
  if (existsSync(ruta)) {
    config({ path: ruta, override: false, quiet: true });
  }
}
