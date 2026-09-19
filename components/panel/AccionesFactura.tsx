"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { peticionJson } from "@/lib/peticiones";
import type { EstadoFactura, Factura } from "@/lib/types";

/** Transiciones ofrecidas, en el orden en que suelen hacer falta. */
const SIGUIENTES: Record<EstadoFactura, { estado: EstadoFactura; etiqueta: string }[]> = {
  borrador: [
    { estado: "emitida", etiqueta: "Emitir factura" },
    { estado: "anulada", etiqueta: "Anular" },
  ],
  emitida: [
    { estado: "pagada", etiqueta: "Marcar como pagada" },
    { estado: "anulada", etiqueta: "Anular" },
  ],
  pagada: [{ estado: "anulada", etiqueta: "Anular" }],
  anulada: [],
};

export function AccionesFactura({ factura }: { factura: Factura }) {
  const router = useRouter();
  const [cambiando, setCambiando] = useState<EstadoFactura | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(estado: EstadoFactura): Promise<void> {
    setCambiando(estado);
    setError(null);
    const resultado = await peticionJson<{ factura: Factura }>(
      `/api/facturas/${factura.id}`,
      "PATCH",
      { estado },
    );
    if (!resultado.ok) {
      setError(resultado.fallo.mensaje);
      setCambiando(null);
      return;
    }
    setCambiando(null);
    router.refresh();
  }

  return (
    <div className="no-imprimir">
      {error ? (
        <Aviso tono="error" className="mb-3">
          {error}
        </Aviso>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {SIGUIENTES[factura.estado].map((accion, indice) => (
          <Boton
            key={accion.estado}
            type="button"
            tono={indice === 0 ? "primario" : "peligro"}
            tamano="compacto"
            disabled={cambiando !== null}
            data-prueba={`estado-${accion.estado}`}
            onClick={() => void cambiar(accion.estado)}
          >
            {cambiando === accion.estado ? "Guardando…" : accion.etiqueta}
          </Boton>
        ))}
        <Boton
          type="button"
          tono="secundario"
          tamano="compacto"
          onClick={() => window.print()}
        >
          Imprimir o guardar en PDF
        </Boton>
      </div>
    </div>
  );
}
