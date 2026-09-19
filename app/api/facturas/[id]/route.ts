/**
 * GET    /api/facturas/[id] — detalle.
 * PUT    /api/facturas/[id] — reemplaza el borrador completo.
 * PATCH  /api/facturas/[id] — cambia solo el estado.
 * DELETE /api/facturas/[id] — borra un borrador.
 */
import { NextResponse } from "next/server";

import { leerCuerpo, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import {
  actualizarFactura,
  cambiarEstadoFactura,
  eliminarFactura,
  obtenerFactura,
} from "@/lib/repositorios/facturas";
import type { Factura } from "@/lib/types";
import { esquemaCambioEstado, esquemaFactura } from "@/lib/validaciones";

interface Contexto {
  params: Promise<{ id: string }>;
}

export function GET(_peticion: Request, { params }: Contexto) {
  return rutaSegura<{ factura: Factura }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    return NextResponse.json({ factura: await obtenerFactura(usuarioId, id) });
  });
}

export function PUT(peticion: Request, { params }: Contexto) {
  return rutaSegura<{ factura: Factura }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    const entrada = await leerCuerpo(peticion, esquemaFactura);
    return NextResponse.json({
      factura: await actualizarFactura(usuarioId, id, entrada),
    });
  });
}

export function PATCH(peticion: Request, { params }: Contexto) {
  return rutaSegura<{ factura: Factura }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    const { estado } = await leerCuerpo(peticion, esquemaCambioEstado);
    return NextResponse.json({
      factura: await cambiarEstadoFactura(usuarioId, id, estado),
    });
  });
}

export function DELETE(_peticion: Request, { params }: Contexto) {
  return rutaSegura<{ eliminada: true }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    await eliminarFactura(usuarioId, id);
    return NextResponse.json({ eliminada: true as const });
  });
}
