/**
 * Proxy de Next.js 16 (el sustituto de `middleware.ts`).
 *
 * Única responsabilidad: decidir quién puede ver el panel. No consulta la base
 * de datos —solo valida la firma de la cookie— para no añadir latencia a cada
 * navegación. La comprobación real de propiedad de cada recurso vive en los
 * repositorios, que acotan toda consulta por `usuarioId`.
 */
import { NextResponse, type NextRequest } from "next/server";

import { NOMBRE_COOKIE_SESION, verificarSesion } from "@/lib/sesion";

/** Rutas del panel: exigen sesión. */
const PREFIJO_PRIVADO = "/panel";

/** Rutas de acceso: con sesión activa no tiene sentido volver a ellas. */
const RUTAS_DE_ACCESO = ["/acceso"];

export const config = {
  /*
   * Se excluyen los assets y las API routes: cada handler de API responde 401
   * con el contrato `{ error }`, que es más útil para un cliente fetch que una
   * redirección HTML.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico)$).*)",
  ],
};

export default function proxy(peticion: NextRequest): NextResponse {
  const { pathname, search } = peticion.nextUrl;
  const sesion = verificarSesion(peticion.cookies.get(NOMBRE_COOKIE_SESION)?.value);

  if (pathname === PREFIJO_PRIVADO || pathname.startsWith(`${PREFIJO_PRIVADO}/`)) {
    if (sesion) return NextResponse.next();

    const destino = new URL("/acceso", peticion.nextUrl);
    // Tras entrar, el usuario vuelve exactamente a donde quería ir.
    destino.searchParams.set("destino", `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }

  if (sesion && RUTAS_DE_ACCESO.includes(pathname)) {
    return NextResponse.redirect(new URL(PREFIJO_PRIVADO, peticion.nextUrl));
  }

  return NextResponse.next();
}
