/**
 * GET /api/auth/verificar?token=… — canjea el enlace mágico y abre la sesión.
 *
 * Responde siempre con una redirección porque quien llega aquí es una persona
 * pulsando un enlace del correo, no un cliente fetch.
 */
import { NextResponse, type NextRequest } from "next/server";

import { configApp } from "@/lib/env";
import { canjearTokenAcceso } from "@/lib/repositorios/acceso";
import { buscarOCrearUsuario } from "@/lib/repositorios/usuarios";
import {
  NOMBRE_COOKIE_SESION,
  crearSesion,
  firmarSesion,
  opcionesCookieSesion,
} from "@/lib/sesion";

function redirigirAAcceso(peticion: NextRequest, motivo: string): NextResponse {
  const destino = new URL("/acceso", peticion.nextUrl);
  destino.searchParams.set("motivo", motivo);
  return NextResponse.redirect(destino);
}

export async function GET(peticion: NextRequest): Promise<NextResponse> {
  const token = peticion.nextUrl.searchParams.get("token");
  if (!token) return redirigirAAcceso(peticion, "sin-token");

  try {
    const canje = await canjearTokenAcceso(token);
    if (!canje.valido) return redirigirAAcceso(peticion, canje.motivo);

    const usuario = await buscarOCrearUsuario(canje.email);
    const sesion = crearSesion(usuario._id.toHexString(), usuario.email);

    const destino = canje.destino.startsWith("/") ? canje.destino : "/panel";
    const respuesta = NextResponse.redirect(new URL(destino, configApp().urlBase));
    respuesta.cookies.set(
      NOMBRE_COOKIE_SESION,
      firmarSesion(sesion),
      opcionesCookieSesion(),
    );
    return respuesta;
  } catch (error) {
    console.error("[auth] fallo al verificar el enlace:", error);
    return redirigirAAcceso(peticion, "error");
  }
}
