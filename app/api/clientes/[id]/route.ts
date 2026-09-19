/**
 * GET    /api/clientes/[id] — detalle.
 * PUT    /api/clientes/[id] — actualiza.
 * DELETE /api/clientes/[id] — elimina (solo si no tiene facturas).
 */
import { NextResponse } from "next/server";

import { leerCuerpo, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import {
  actualizarCliente,
  eliminarCliente,
  obtenerCliente,
} from "@/lib/repositorios/clientes";
import type { Cliente } from "@/lib/types";
import { esquemaCliente } from "@/lib/validaciones";

interface Contexto {
  params: Promise<{ id: string }>;
}

export function GET(_peticion: Request, { params }: Contexto) {
  return rutaSegura<{ cliente: Cliente }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    return NextResponse.json({ cliente: await obtenerCliente(usuarioId, id) });
  });
}

export function PUT(peticion: Request, { params }: Contexto) {
  return rutaSegura<{ cliente: Cliente }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    const datos = await leerCuerpo(peticion, esquemaCliente);
    return NextResponse.json({ cliente: await actualizarCliente(usuarioId, id, datos) });
  });
}

export function DELETE(_peticion: Request, { params }: Contexto) {
  return rutaSegura<{ eliminado: true }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    await eliminarCliente(usuarioId, id);
    return NextResponse.json({ eliminado: true as const });
  });
}
