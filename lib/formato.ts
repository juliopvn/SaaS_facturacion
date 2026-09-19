/**
 * Capa de presentación. Este es el ÚNICO módulo autorizado a dividir entre 100
 * (céntimos → euros) y entre 1000 (milésimas → unidades). Ninguna otra parte
 * del código debe hacerlo.
 */
import { MILESIMAS_POR_UNIDAD } from "@/lib/dinero";
import type { EstadoFactura } from "@/lib/types";

const LOCALE = "es-ES";

const formateadorEuros = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formateadorNumero = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formateadorCantidad = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/** 123456 → «1.234,56 €». */
export function formatearEuros(centimos: number): string {
  return formateadorEuros.format(centimos / 100);
}

/** 123456 → «1.234,56» (sin símbolo, para celdas con la moneda en la cabecera). */
export function formatearImporte(centimos: number): string {
  return formateadorNumero.format(centimos / 100);
}

/** Valor para un `<input type="number">`: 1250 → «12.50». */
export function centimosAValorInput(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

/** 1500 → «1,5». */
export function formatearCantidad(milesimas: number): string {
  return formateadorCantidad.format(milesimas / MILESIMAS_POR_UNIDAD);
}

/** Valor para un `<input type="number">`: 1500 → «1.5». */
export function milesimasAValorInput(milesimas: number): string {
  return String(milesimas / MILESIMAS_POR_UNIDAD);
}

export function formatearPorcentaje(porcentaje: number): string {
  return `${porcentaje} %`;
}

export function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatearFechaLarga(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Valor para un `<input type="date">`. */
export function fechaAValorInput(fechaIso: string): string {
  return new Date(fechaIso).toISOString().slice(0, 10);
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ETIQUETAS_ESTADO: Record<EstadoFactura, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada: "Pagada",
  anulada: "Anulada",
};

/** Una factura emitida cuya fecha de vencimiento ya pasó. */
export function estaVencida(estado: EstadoFactura, fechaVencimientoIso: string): boolean {
  return estado === "emitida" && new Date(fechaVencimientoIso).getTime() < Date.now();
}
