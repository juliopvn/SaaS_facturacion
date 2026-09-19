import { ETIQUETAS_ESTADO } from "@/lib/formato";
import type { EstadoFactura } from "@/lib/types";

const TONOS: Record<EstadoFactura, string> = {
  borrador: "bg-papel-hundido text-tinta-media border-regla",
  emitida: "bg-sello-tenue text-sello border-sello/35",
  pagada: "bg-cobrado-tenue text-cobrado border-cobrado/35",
  anulada: "bg-papel-hundido text-tinta-tenue border-regla line-through",
};

const VENCIDA = "bg-aviso-tenue text-aviso border-aviso/35";

export function Sello({
  estado,
  vencida = false,
}: {
  estado: EstadoFactura;
  vencida?: boolean;
}) {
  const esVencida = vencida && estado === "emitida";
  return (
    <span
      className={`cifra inline-flex items-center border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase ${
        esVencida ? VENCIDA : TONOS[estado]
      }`}
    >
      {esVencida ? "Vencida" : ETIQUETAS_ESTADO[estado]}
    </span>
  );
}
