import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type TonoBoton = "primario" | "secundario" | "fantasma" | "peligro";
export type TamanoBoton = "normal" | "compacto";

const TONOS: Record<TonoBoton, string> = {
  primario:
    "bg-sello text-papel border-sello hover:bg-sello-vivo hover:border-sello-vivo disabled:bg-tinta-tenue disabled:border-tinta-tenue",
  secundario:
    "bg-papel text-tinta border-regla-fuerte hover:bg-sello-tenue hover:border-sello",
  fantasma:
    "bg-transparent text-tinta-media border-transparent hover:text-sello hover:border-regla",
  peligro:
    "bg-transparent text-aviso border-aviso/40 hover:bg-aviso-tenue hover:border-aviso",
};

const TAMANOS: Record<TamanoBoton, string> = {
  normal: "px-5 py-2.5 text-[0.9375rem]",
  compacto: "px-3 py-1.5 text-[0.8125rem]",
};

function clases(tono: TonoBoton, tamano: TamanoBoton, extra?: string): string {
  return [
    "inline-flex items-center justify-center gap-2 border font-medium",
    "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70",
    TONOS[tono],
    TAMANOS[tamano],
    extra ?? "",
  ].join(" ");
}

interface PropiedadesComunes {
  tono?: TonoBoton;
  tamano?: TamanoBoton;
  children: ReactNode;
  className?: string;
}

export function Boton({
  tono = "primario",
  tamano = "normal",
  className,
  children,
  ...resto
}: PropiedadesComunes & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={clases(tono, tamano, className)} {...resto}>
      {children}
    </button>
  );
}

export function BotonEnlace({
  tono = "primario",
  tamano = "normal",
  className,
  children,
  href,
  ...resto
}: PropiedadesComunes & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link href={href} className={clases(tono, tamano, className)} {...resto}>
      {children}
    </Link>
  );
}
