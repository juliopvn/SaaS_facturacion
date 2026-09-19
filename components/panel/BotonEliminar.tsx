"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { peticionJson } from "@/lib/peticiones";

/**
 * Borrado con confirmación en dos pasos, sin `window.confirm`: el diálogo del
 * navegador no se puede leer con lector de pantalla ni traducir.
 */
export function BotonEliminar({
  url,
  destino,
  etiqueta,
  confirmacion,
}: {
  url: string;
  destino: string;
  etiqueta: string;
  confirmacion: string;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function eliminar(): Promise<void> {
    setBorrando(true);
    setError(null);
    const resultado = await peticionJson<unknown>(url, "DELETE");
    if (!resultado.ok) {
      setError(resultado.fallo.mensaje);
      setBorrando(false);
      setConfirmando(false);
      return;
    }
    router.push(destino);
    router.refresh();
  }

  if (!confirmando) {
    return (
      <div>
        {error ? (
          <Aviso tono="error" className="mb-3">
            {error}
          </Aviso>
        ) : null}
        <Boton type="button" tono="peligro" onClick={() => setConfirmando(true)}>
          {etiqueta}
        </Boton>
      </div>
    );
  }

  return (
    <div className="border-aviso/40 bg-aviso-tenue border p-4">
      <p className="text-aviso text-[0.875rem]">{confirmacion}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton
          type="button"
          tono="peligro"
          tamano="compacto"
          onClick={eliminar}
          disabled={borrando}
          data-prueba="confirmar-eliminar"
        >
          {borrando ? "Eliminando…" : "Sí, eliminar"}
        </Boton>
        <Boton
          type="button"
          tono="fantasma"
          tamano="compacto"
          onClick={() => setConfirmando(false)}
        >
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
