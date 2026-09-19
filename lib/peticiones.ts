/**
 * Cliente HTTP de los Client Components.
 *
 * Traduce el contrato de error de las API routes (`{ error, detalles }`) a un
 * resultado tipado, para que los formularios no tengan que repetir el mismo
 * `try/catch` ni inventarse mensajes.
 */
import type { RespuestaError } from "@/lib/types";

export interface FalloApi {
  mensaje: string;
  detalles: Record<string, string>;
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; fallo: FalloApi };

const FALLO_RED: FalloApi = {
  mensaje: "No hemos podido conectar con el servidor. Inténtalo otra vez.",
  detalles: {},
};

export async function peticion<T>(
  url: string,
  opciones: RequestInit = {},
): Promise<Resultado<T>> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    return { ok: false, fallo: FALLO_RED };
  }

  if (respuesta.status === 204) {
    return { ok: true, datos: undefined as T };
  }

  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    return {
      ok: false,
      fallo: respuesta.ok
        ? FALLO_RED
        : { mensaje: `La petición falló con estado ${respuesta.status}.`, detalles: {} },
    };
  }

  if (!respuesta.ok) {
    const fallo = cuerpo as RespuestaError;
    return {
      ok: false,
      fallo: {
        mensaje: typeof fallo.error === "string" ? fallo.error : "Algo ha fallado.",
        detalles: fallo.detalles ?? {},
      },
    };
  }

  return { ok: true, datos: cuerpo as T };
}

export function peticionJson<T>(
  url: string,
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  cuerpo?: unknown,
): Promise<Resultado<T>> {
  return peticion<T>(url, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}
