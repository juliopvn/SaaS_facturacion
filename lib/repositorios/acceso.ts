/** Tokens de un solo uso del magic link. */
import { coleccionTokensAcceso } from "@/lib/db";
import { configApp } from "@/lib/env";
import { generarTokenAcceso, hashearToken } from "@/lib/sesion";
import type { DocumentoTokenAcceso } from "@/lib/types";

export interface EnlaceEmitido {
  token: string;
  expiraEn: Date;
}

/** Emite un token nuevo e invalida los anteriores del mismo correo. */
export async function emitirTokenAcceso(
  email: string,
  destino: string,
): Promise<EnlaceEmitido> {
  const tokens = await coleccionTokensAcceso();
  const ahora = new Date();
  const expiraEn = new Date(ahora.getTime() + configApp().minutosValidezEnlace * 60_000);

  // Pedir un enlace nuevo deja sin efecto el anterior: solo uno vivo por correo.
  await tokens.updateMany({ email, usadoEn: null }, { $set: { usadoEn: ahora } });

  const { token, tokenHash } = generarTokenAcceso();
  await tokens.insertOne({
    email,
    tokenHash,
    expiraEn,
    usadoEn: null,
    creadoEn: ahora,
    destino,
  } as DocumentoTokenAcceso);

  return { token, expiraEn };
}

export type ResultadoCanje =
  | { valido: true; email: string; destino: string }
  | { valido: false; motivo: "desconocido" | "usado" | "caducado" };

/**
 * Canjea el token: lo marca como usado en la misma operación atómica que lo
 * lee, de modo que dos peticiones simultáneas no puedan usarlo las dos.
 */
export async function canjearTokenAcceso(token: string): Promise<ResultadoCanje> {
  const tokens = await coleccionTokensAcceso();
  const ahora = new Date();
  const tokenHash = hashearToken(token);

  const canjeado = await tokens.findOneAndUpdate(
    { tokenHash, usadoEn: null, expiraEn: { $gt: ahora } },
    { $set: { usadoEn: ahora } },
    { returnDocument: "after" },
  );

  if (canjeado) {
    return { valido: true, email: canjeado.email, destino: canjeado.destino };
  }

  // No se pudo canjear: distinguimos el motivo para dar un mensaje útil.
  const existente = await tokens.findOne({ tokenHash });
  if (!existente) return { valido: false, motivo: "desconocido" };
  if (existente.usadoEn !== null) return { valido: false, motivo: "usado" };
  return { valido: false, motivo: "caducado" };
}
