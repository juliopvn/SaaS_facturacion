import type { ReactNode } from "react";

const TONOS = {
  error: "border-aviso/40 bg-aviso-tenue text-aviso",
  exito: "border-cobrado/40 bg-cobrado-tenue text-cobrado",
  nota: "border-regla bg-papel-hundido text-tinta-media",
} as const;

export function Aviso({
  tono = "nota",
  children,
  className,
}: {
  tono?: keyof typeof TONOS;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tono === "error" ? "alert" : undefined}
      className={`border px-3 py-2 text-[0.875rem] ${TONOS[tono]} ${className ?? ""}`}
    >
      {children}
    </p>
  );
}
