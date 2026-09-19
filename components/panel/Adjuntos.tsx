"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { formatearFecha, formatearTamano } from "@/lib/formato";
import { peticion, peticionJson } from "@/lib/peticiones";
import type { Adjunto, Factura } from "@/lib/types";

/**
 * Adjuntos de la factura (albarán, justificante de pago…).
 *
 * Los archivos no viven en MongoDB sino en el bucket S3; aquí solo se manejan
 * sus metadatos y el enlace temporal de descarga que emite la API.
 */
export function Adjuntos({
  facturaId,
  adjuntos,
}: {
  facturaId: string;
  adjuntos: Adjunto[];
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError(null);

    const cuerpo = new FormData();
    cuerpo.append("archivo", archivo);

    const resultado = await peticion<{ factura: Factura }>(
      `/api/facturas/${facturaId}/adjuntos`,
      { method: "POST", body: cuerpo },
    );

    setSubiendo(false);
    if (entrada.current) entrada.current.value = "";

    if (!resultado.ok) {
      setError(resultado.fallo.detalles.archivo ?? resultado.fallo.mensaje);
      return;
    }
    router.refresh();
  }

  async function borrar(adjuntoId: string): Promise<void> {
    setError(null);
    const resultado = await peticionJson<{ factura: Factura }>(
      `/api/facturas/${facturaId}/adjuntos/${adjuntoId}`,
      "DELETE",
    );
    if (!resultado.ok) {
      setError(resultado.fallo.mensaje);
      return;
    }
    router.refresh();
  }

  return (
    <section className="no-imprimir mt-8">
      <h2 className="text-[1.125rem] font-semibold">Adjuntos</h2>
      <p className="text-tinta-media mt-1 mb-4 max-w-[38rem] text-[0.875rem] leading-relaxed">
        Guarda aquí el albarán firmado o el justificante de la transferencia. PDF, PNG,
        JPG o WebP, hasta 5 MB.
      </p>

      {error ? (
        <Aviso tono="error" className="mb-4">
          {error}
        </Aviso>
      ) : null}

      {adjuntos.length > 0 ? (
        <ul className="border-regla mb-4 border">
          {adjuntos.map((adjunto) => (
            <li
              key={adjunto.id}
              className="border-regla flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <a
                  href={`/api/facturas/${facturaId}/adjuntos/${adjunto.id}`}
                  className="text-sello block truncate font-medium underline-offset-4 hover:underline"
                >
                  {adjunto.nombre}
                </a>
                <span className="cifra text-tinta-tenue text-[0.75rem]">
                  {formatearTamano(adjunto.tamanoBytes)} ·{" "}
                  {formatearFecha(adjunto.subidoEn)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void borrar(adjunto.id)}
                className="text-tinta-tenue decoration-regla hover:text-aviso text-[0.8125rem] underline underline-offset-4 transition-colors"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="border-regla-fuerte bg-papel hover:border-sello hover:bg-sello-tenue inline-flex cursor-pointer items-center gap-2 border px-4 py-2 text-[0.875rem] font-medium transition-colors">
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(evento) => void subir(evento)}
          disabled={subiendo}
        />
        {subiendo ? "Subiendo…" : "Adjuntar un archivo"}
      </label>
    </section>
  );
}
