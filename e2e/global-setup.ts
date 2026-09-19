/**
 * Preparación de la suite.
 *
 * 1. Comprueba que la infraestructura local está levantada y dice exactamente
 *    qué falta si no lo está, en vez de dejar que los tests fallen de formas
 *    raras cinco minutos después.
 * 2. Siembra la base con `scripts/seed.ts`, que es idempotente, de modo que
 *    cada ejecución arranca del mismo estado conocido.
 */
import { execFileSync } from "node:child_process";

import { MongoClient } from "mongodb";

import { vaciarBuzon } from "./utilidades/mailhog";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const MAILHOG_API_URL = process.env.MAILHOG_API_URL ?? "http://localhost:8025";
const AWS_URL = process.env.AWS_URL ?? "http://localhost:9001";

const AYUDA =
  "Levanta la infraestructura con `docker compose up -d` y vuelve a intentarlo.";

/*
 * Única excepción a la regla del singleton de `lib/db.ts`: esta comprobación
 * corre antes de que arranque la aplicación y su trabajo es justamente fallar
 * con un mensaje claro cuando MongoDB no está. Abre su conexión, pregunta y la
 * cierra.
 */
async function comprobarMongo(): Promise<void> {
  const cliente = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 4_000 });
  try {
    await cliente.connect();
    await cliente.db("admin").command({ ping: 1 });
  } catch (error) {
    throw new Error(`MongoDB no responde en ${MONGODB_URI}. ${AYUDA}\n${String(error)}`);
  } finally {
    await cliente.close().catch(() => undefined);
  }
}

async function comprobarHttp(nombre: string, url: string): Promise<void> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(4_000) });
  } catch (error) {
    throw new Error(`${nombre} no responde en ${url}. ${AYUDA}\n${String(error)}`);
  }
}

export default async function preparar(): Promise<void> {
  await Promise.all([
    comprobarMongo(),
    comprobarHttp("MailHog", `${MAILHOG_API_URL}/api/v2/messages?limit=1`),
    // RustFS responde 403 a la raíz sin firmar: basta con que conteste algo.
    comprobarHttp("RustFS", AWS_URL),
  ]);

  await vaciarBuzon();

  execFileSync("npx", ["tsx", "scripts/seed.ts"], {
    stdio: "inherit",
    env: process.env,
  });
}
