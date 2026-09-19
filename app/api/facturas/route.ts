/**
 * GET  /api/facturas — listado paginado y filtrable.
 * POST /api/facturas — emite una factura nueva.
 */
import { NextResponse, type NextRequest } from "next/server";

import { leerCuerpo, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import { crearFactura, listarFacturas } from "@/lib/repositorios/facturas";
import type { Factura, PaginaFacturas } from "@/lib/types";
import { esquemaFactura, esquemaFiltroFacturas } from "@/lib/validaciones";

export function GET(peticion: NextRequest) {
  return rutaSegura<PaginaFacturas>(async () => {
    const { usuarioId } = await exigirSesion();
    const parametros = Object.fromEntries(peticion.nextUrl.searchParams.entries());
    const filtro = esquemaFiltroFacturas.parse(parametros);
    return NextResponse.json(await listarFacturas(usuarioId, filtro));
  });
}

export function POST(peticion: Request) {
  return rutaSegura<{ factura: Factura }>(async () => {
    const { usuarioId } = await exigirSesion();
    const entrada = await leerCuerpo(peticion, esquemaFactura);
    const factura = await crearFactura(usuarioId, entrada);
    return NextResponse.json({ factura }, { status: 201 });
  });
}
