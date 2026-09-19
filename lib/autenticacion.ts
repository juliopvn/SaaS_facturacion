/**
 * Sesión del lado servidor. Lo usan tanto los Server Components (para leer
 * MongoDB directamente) como las API routes (para acotar cada consulta al
 * usuario autenticado).
 *
 * `proxy.ts` no importa este módulo: allí la cookie llega en la petición y se
 * valida con `lib/sesion.ts`, que no depende de `next/headers`.
 */
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { noAutenticado } from "@/lib/api";
import { obtenerUsuarioPorId, serializarUsuario } from "@/lib/repositorios/usuarios";
import {
  NOMBRE_COOKIE_SESION,
  crearSesion,
  firmarSesion,
  opcionesCookieSesion,
  verificarSesion,
} from "@/lib/sesion";
import type { DocumentoUsuario, SesionUsuario, Usuario } from "@/lib/types";

export async function sesionActual(): Promise<SesionUsuario | null> {
  const almacen = await cookies();
  return verificarSesion(almacen.get(NOMBRE_COOKIE_SESION)?.value);
}

/** Identidad mínima para acotar consultas, sin ir a la base de datos. */
export async function exigirSesion(): Promise<{ usuarioId: ObjectId; email: string }> {
  const sesion = await sesionActual();
  if (!sesion || !ObjectId.isValid(sesion.usuarioId)) throw noAutenticado();
  return { usuarioId: new ObjectId(sesion.usuarioId), email: sesion.email };
}

/** Usuario completo. `null` si no hay sesión o la cuenta ya no existe. */
export async function usuarioActual(): Promise<Usuario | null> {
  const sesion = await sesionActual();
  if (!sesion) return null;
  const documento = await obtenerUsuarioPorId(sesion.usuarioId);
  return documento ? serializarUsuario(documento) : null;
}

export async function exigirUsuario(): Promise<DocumentoUsuario> {
  const sesion = await sesionActual();
  if (!sesion) throw noAutenticado();
  const documento = await obtenerUsuarioPorId(sesion.usuarioId);
  if (!documento) throw noAutenticado();
  return documento;
}

export async function iniciarSesion(usuarioId: string, email: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(
    NOMBRE_COOKIE_SESION,
    firmarSesion(crearSesion(usuarioId, email)),
    opcionesCookieSesion(),
  );
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE_SESION, "", {
    ...opcionesCookieSesion(),
    maxAge: 0,
  });
}
