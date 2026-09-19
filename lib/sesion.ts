/**
 * Criptografía de sesión y de los enlaces mágicos.
 *
 * Este módulo es deliberadamente puro (solo `node:crypto`): lo importan tanto
 * `proxy.ts` como las API routes, y no puede arrastrar dependencias de React ni
 * de `next/headers`.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";

import { configApp } from "@/lib/env";
import type { SesionUsuario } from "@/lib/types";

export const NOMBRE_COOKIE_SESION = "sesion";

const SEGUNDOS_POR_DIA = 86_400;

function base64url(valor: Buffer): string {
  return valor.toString("base64url");
}

function firmar(cuerpo: string, secreto: string): string {
  return base64url(createHmac("sha256", secreto).update(cuerpo).digest());
}

/** Serializa y firma la sesión con HMAC-SHA256: `<payload>.<firma>`. */
export function firmarSesion(sesion: SesionUsuario): string {
  const { secretoSesion } = configApp();
  const cuerpo = base64url(Buffer.from(JSON.stringify(sesion), "utf8"));
  return `${cuerpo}.${firmar(cuerpo, secretoSesion)}`;
}

function esSesion(valor: unknown): valor is SesionUsuario {
  if (typeof valor !== "object" || valor === null) return false;
  const candidato = valor as Record<string, unknown>;
  return (
    typeof candidato.usuarioId === "string" &&
    typeof candidato.email === "string" &&
    typeof candidato.emitidaEn === "number" &&
    typeof candidato.expiraEn === "number"
  );
}

/** Devuelve la sesión si la firma es válida y no ha expirado; si no, `null`. */
export function verificarSesion(cookie: string | undefined): SesionUsuario | null {
  if (!cookie) return null;
  const separador = cookie.lastIndexOf(".");
  if (separador <= 0) return null;

  const cuerpo = cookie.slice(0, separador);
  const firmaRecibida = cookie.slice(separador + 1);
  const firmaEsperada = firmar(cuerpo, configApp().secretoSesion);

  const a = Buffer.from(firmaRecibida);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const datos: unknown = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
    if (!esSesion(datos)) return null;
    if (datos.expiraEn * 1000 <= Date.now()) return null;
    return datos;
  } catch {
    return null;
  }
}

export function crearSesion(usuarioId: string, email: string): SesionUsuario {
  const ahora = Math.floor(Date.now() / 1000);
  return {
    usuarioId,
    email,
    emitidaEn: ahora,
    expiraEn: ahora + configApp().diasSesion * SEGUNDOS_POR_DIA,
  };
}

/** Opciones de la cookie de sesión: `httpOnly`, `sameSite=lax` y `secure` fuera de local. */
export function opcionesCookieSesion(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const { diasSesion, urlBase } = configApp();
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: urlBase.startsWith("https://"),
    path: "/",
    maxAge: diasSesion * SEGUNDOS_POR_DIA,
  };
}

/* ── Magic link ──────────────────────────────────────────────────────── */

/**
 * Token de un solo uso. Se devuelve en claro (va en el enlace del email) y
 * hasheado (es lo único que se guarda en la base de datos, igual que una
 * contraseña: si alguien lee la colección no puede iniciar sesión con ella).
 */
export function generarTokenAcceso(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashearToken(token) };
}

export function hashearToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
