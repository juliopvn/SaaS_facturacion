import type { ReactNode } from "react";

/** Estado vacío: siempre dice qué hacer a continuación, nunca solo «no hay nada». */
export function Vacio({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle: string;
  accion?: ReactNode;
}) {
  return (
    <div className="hoja pautado px-6 py-14 text-center">
      <h2 className="text-[1.25rem] font-semibold">{titulo}</h2>
      <p className="text-tinta-media mx-auto mt-2 max-w-[28rem] leading-relaxed">
        {detalle}
      </p>
      {accion ? <div className="mt-6 flex justify-center">{accion}</div> : null}
    </div>
  );
}
