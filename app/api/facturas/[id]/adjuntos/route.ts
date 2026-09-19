/**
 * POST /api/facturas/[id]/adjuntos — sube un adjunto (PDF o imagen) al bucket.
 *
 * El archivo viaja como `multipart/form-data` en el campo `archivo`.
 */
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { ErrorHttp, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import { anadirAdjunto, obtenerFacturaDocumento } from "@/lib/repositorios/facturas";
import { subirObjeto } from "@/lib/storage";
import type { Adjunto, Factura } from "@/lib/types";

const TIPOS_ADMITIDOS = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAXIMO_BYTES = 5 * 1024 * 1024;

interface Contexto {
  params: Promise<{ id: string }>;
}

/** Deja el nombre en algo seguro para una clave de objeto S3. */
function normalizarNombre(nombre: string): string {
  return (
    nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(-80) || "adjunto"
  );
}

export function POST(peticion: Request, { params }: Contexto) {
  return rutaSegura<{ factura: Factura; adjunto: Adjunto }>(async () => {
    const { usuarioId } = await exigirSesion();
    const { id } = await params;
    const factura = await obtenerFacturaDocumento(usuarioId, id);

    let formulario: FormData;
    try {
      formulario = await peticion.formData();
    } catch {
      throw new ErrorHttp(400, "Envía el archivo como multipart/form-data.");
    }

    const archivo = formulario.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      throw new ErrorHttp(422, "Adjunta un archivo.", {
        archivo: "Adjunta un archivo.",
      });
    }
    if (!TIPOS_ADMITIDOS.has(archivo.type)) {
      throw new ErrorHttp(415, "Solo admitimos PDF, PNG, JPG o WebP.", {
        archivo: "Solo admitimos PDF, PNG, JPG o WebP.",
      });
    }
    if (archivo.size > MAXIMO_BYTES) {
      throw new ErrorHttp(413, "El archivo supera los 5 MB.", {
        archivo: "El archivo supera los 5 MB.",
      });
    }

    const adjuntoId = randomUUID();
    const nombre = normalizarNombre(archivo.name);
    const clave = `facturas/${usuarioId.toHexString()}/${factura._id.toHexString()}/${adjuntoId}-${nombre}`;
    const contenido = new Uint8Array(await archivo.arrayBuffer());
    const subido = await subirObjeto(clave, contenido, archivo.type);

    const adjunto: Adjunto = {
      id: adjuntoId,
      nombre: archivo.name,
      clave: subido.clave,
      tipoMime: archivo.type,
      tamanoBytes: subido.tamanoBytes,
      subidoEn: new Date().toISOString(),
    };

    const actualizada = await anadirAdjunto(usuarioId, id, adjunto);
    return NextResponse.json({ factura: actualizada, adjunto }, { status: 201 });
  });
}
