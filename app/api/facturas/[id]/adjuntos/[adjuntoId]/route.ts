/**
 * GET    /api/facturas/[id]/adjuntos/[adjuntoId] — redirige a una URL firmada.
 * DELETE /api/facturas/[id]/adjuntos/[adjuntoId] — borra el adjunto y el objeto.
 *
 * El bucket nunca se expone públicamente: la descarga usa un enlace temporal
 * que solo se emite tras comprobar que la factura es del usuario.
 */
import { NextResponse } from "next/server";

import { noEncontrado, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import { obtenerFacturaDocumento, quitarAdjunto } from "@/lib/repositorios/facturas";
import { eliminarObjeto, urlFirmadaDescarga } from "@/lib/storage";
import type { Factura } from "@/lib/types";

interface Contexto {
  params: Promise<{ id: string; adjuntoId: string }>;
}

export function GET(_peticion: Request, { params }: Contexto) {
  return rutaSegura(async () => {
    const { usuarioId } = await exigirSesion();
    const { id, adjuntoId } = await params;
    const factura = await obtenerFacturaDocumento(usuarioId, id);
    const adjunto = factura.adjuntos.find((candidato) => candidato.id === adjuntoId);
    if (!adjunto) throw noEncontrado("ese adjunto");

    const url = await urlFirmadaDescarga(adjunto.clave, adjunto.nombre);
    return NextResponse.redirect(url, 307);
  });
}

export function DELETE(_peticion: Request, { params }: Contexto) {
  return rutaSegura<{ factura: Factura }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id, adjuntoId } = await params;
    const { factura, clave } = await quitarAdjunto(usuarioId, id, adjuntoId);
    await eliminarObjeto(clave);
    return NextResponse.json({ factura });
  });
}
