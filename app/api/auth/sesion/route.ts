/**
 * GET    /api/auth/sesion — usuario autenticado (lo consume el GlobalContext).
 * DELETE /api/auth/sesion — cierra la sesión.
 */
import { NextResponse } from "next/server";

import { rutaSegura } from "@/lib/api";
import { cerrarSesion, usuarioActual } from "@/lib/autenticacion";
import type { Usuario } from "@/lib/types";

interface RespuestaSesion {
  usuario: Usuario | null;
}

export function GET() {
  return rutaSegura<RespuestaSesion>(async () =>
    NextResponse.json<RespuestaSesion>({ usuario: await usuarioActual() }),
  );
}

export function DELETE() {
  return rutaSegura<{ cerrada: true }>(async () => {
    await cerrarSesion();
    return NextResponse.json({ cerrada: true as const });
  });
}
