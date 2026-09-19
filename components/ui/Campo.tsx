import type { ComponentPropsWithoutRef, ReactNode } from "react";

const BASE_CONTROL =
  "w-full border border-regla bg-papel-hundido px-3 py-2 text-[0.9375rem] text-tinta " +
  "placeholder:text-tinta-tenue focus:border-sello focus:bg-papel " +
  "disabled:opacity-60 transition-colors";

interface Envoltura {
  etiqueta: string;
  htmlFor: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}

export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  children,
  className,
}: Envoltura) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="rotulo mb-1.5 block">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error ? (
        <p className="text-tinta-tenue mt-1 text-[0.8125rem]">{ayuda}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-aviso mt-1 text-[0.8125rem] font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Entrada({
  error,
  className,
  ...resto
}: ComponentPropsWithoutRef<"input"> & { error?: boolean }) {
  return (
    <input
      className={`${BASE_CONTROL} ${error ? "border-aviso" : ""} ${className ?? ""}`}
      aria-invalid={error ? true : undefined}
      {...resto}
    />
  );
}

export function Seleccion({
  error,
  className,
  children,
  ...resto
}: ComponentPropsWithoutRef<"select"> & { error?: boolean }) {
  return (
    <select
      className={`${BASE_CONTROL} ${error ? "border-aviso" : ""} ${className ?? ""}`}
      aria-invalid={error ? true : undefined}
      {...resto}
    >
      {children}
    </select>
  );
}

export function AreaTexto({
  error,
  className,
  ...resto
}: ComponentPropsWithoutRef<"textarea"> & { error?: boolean }) {
  return (
    <textarea
      className={`${BASE_CONTROL} resize-y ${error ? "border-aviso" : ""} ${className ?? ""}`}
      aria-invalid={error ? true : undefined}
      {...resto}
    />
  );
}
