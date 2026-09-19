/**
 * GET  /api/clientes — lista los clientes del usuario.
 * POST /api/clientes — crea un cliente.
 */
import { NextResponse } from "next/server";

import { leerCuerpo, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import { crearCliente, listarClientesConResumen } from "@/lib/repositorios/clientes";
import type { Cliente, ClienteConResumen } from "@/lib/types";
import { esquemaCliente } from "@/lib/validaciones";

export function GET() {
  return rutaSegura<{ clientes: ClienteConResumen[] }>(async () => {
    const { usuarioId } = await exigirSesion();
    return NextResponse.json({ clientes: await listarClientesConResumen(usuarioId) });
  });
}

export function POST(peticion: Request) {
  return rutaSegura<{ cliente: Cliente }>(async () => {
    const { usuarioId } = await exigirSesion();
    const datos = await leerCuerpo(peticion, esquemaCliente);
    const cliente = await crearCliente(usuarioId, datos);
    return NextResponse.json({ cliente }, { status: 201 });
  });
}
