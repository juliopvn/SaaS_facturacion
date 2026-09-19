/**
 * Utilidades de las API routes.
 *
 * Contrato del proyecto: ante un fallo, una ruta responde SIEMPRE
 * `{ error: string }` (más `detalles` por campo si es de validación) con el
 * código HTTP adecuado. Nunca devuelve un stack ni un mensaje del driver.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import type { RespuestaError } from "@/lib/types";

/** Error de negocio con código HTTP. Lo lanzan repositorios y servicios. */
export class ErrorHttp extends Error {
  readonly estado: number;
  readonly detalles?: Record<string, string>;

  constructor(estado: number, mensaje: string, detalles?: Record<string, string>) {
    super(mensaje);
    this.name = "ErrorHttp";
    this.estado = estado;
    this.detalles = detalles;
  }
}

export const noAutenticado = (): ErrorHttp =>
  new ErrorHttp(401, "Necesitas iniciar sesión para hacer esto.");

export const noEncontrado = (recurso: string): ErrorHttp =>
  new ErrorHttp(404, `No encontramos ${recurso}.`);

export function respuestaError(
  mensaje: string,
  estado: number,
  detalles?: Record<string, string>,
): NextResponse<RespuestaError> {
  return NextResponse.json<RespuestaError>(
    detalles ? { error: mensaje, detalles } : { error: mensaje },
    { status: estado },
  );
}

/** Convierte los errores de Zod en `detalles` por campo. */
function detallesDeZod(error: z.ZodError): Record<string, string> {
  const detalles: Record<string, string> = {};
  for (const incidencia of error.issues) {
    const campo = incidencia.path.join(".") || "formulario";
    if (!(campo in detalles)) detalles[campo] = incidencia.message;
  }
  return detalles;
}

/**
 * Traduce cualquier excepción a una respuesta con el contrato de error.
 * Lo inesperado se registra en el servidor y sale como 500 genérico.
 */
export function manejarError(error: unknown): NextResponse<RespuestaError> {
  if (error instanceof ErrorHttp) {
    return respuestaError(error.message, error.estado, error.detalles);
  }
  if (error instanceof z.ZodError) {
    return respuestaError("Revisa los datos del formulario.", 422, detallesDeZod(error));
  }
  console.error("[api] error no controlado:", error);
  return respuestaError("Algo ha fallado por nuestra parte. Inténtalo de nuevo.", 500);
}

/** Envuelve un handler para que nunca escape una excepción sin formato. */
export function rutaSegura<T>(
  handler: () => Promise<NextResponse<T>>,
): Promise<NextResponse<T | RespuestaError>> {
  return handler().catch(manejarError);
}

/** Lee y valida el cuerpo JSON de la petición contra un esquema. */
export async function leerCuerpo<T>(
  peticion: Request,
  esquema: z.ZodType<T>,
): Promise<T> {
  let crudo: unknown;
  try {
    crudo = await peticion.json();
  } catch {
    throw new ErrorHttp(400, "El cuerpo de la petición no es JSON válido.");
  }
  const resultado = esquema.safeParse(crudo);
  if (!resultado.success) {
    throw new ErrorHttp(
      422,
      "Revisa los datos del formulario.",
      detallesDeZod(resultado.error),
    );
  }
  return resultado.data;
}
