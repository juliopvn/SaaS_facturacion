import type { ReactNode } from "react";

export function Encabezado({
  rotulo,
  titulo,
  descripcion,
  acciones,
}: {
  rotulo: string;
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="border-regla-fuerte mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div>
        <p className="rotulo">{rotulo}</p>
        <h1 className="mt-2 text-[1.75rem] leading-tight font-bold sm:text-[2rem]">
          {titulo}
        </h1>
        {descripcion ? (
          <p className="text-tinta-media mt-2 max-w-[44rem] leading-relaxed">
            {descripcion}
          </p>
        ) : null}
      </div>
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </header>
  );
}
