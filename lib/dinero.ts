/**
 * Aritmética de dinero. Regla no negociable del proyecto: todo importe es un
 * entero de céntimos y toda operación entre importes es aritmética entera.
 * Aquí no se divide entre 100 jamás — eso pertenece a `lib/formato.ts`.
 */
import {
  TIPOS_IVA,
  type DesgloseIva,
  type LineaFactura,
  type LineaFacturaCalculada,
  type TipoIva,
  type TotalesFactura,
} from "@/lib/types";

/** Milésimas por unidad: una cantidad admite tres decimales (1,5 uds → 1500). */
export const MILESIMAS_POR_UNIDAD = 1000;

/** Tope defensivo: 10.000 millones de euros por importe. Evita desbordar el entero seguro. */
const MAXIMO_CENTIMOS = 1_000_000_000_000;

export class ErrorDinero extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDinero";
  }
}

function exigirEntero(valor: number, nombre: string): number {
  if (!Number.isInteger(valor)) {
    throw new ErrorDinero(`${nombre} debe ser un entero, se recibió ${valor}.`);
  }
  if (Math.abs(valor) > MAXIMO_CENTIMOS) {
    throw new ErrorDinero(`${nombre} excede el máximo admitido.`);
  }
  return valor;
}

/**
 * División entera redondeando al más cercano, con los empates alejándose del
 * cero (el criterio de redondeo fiscal español: 0,5 céntimos → 1 céntimo).
 * Se evita `Math.round` sobre flotantes para que 1,005 no se convierta en 1,00.
 */
export function dividirRedondeando(numerador: number, denominador: number): number {
  exigirEntero(numerador, "El numerador");
  if (!Number.isInteger(denominador) || denominador === 0) {
    throw new ErrorDinero("El denominador debe ser un entero distinto de cero.");
  }
  const signo = Math.sign(numerador) * Math.sign(denominador);
  const n = Math.abs(numerador);
  const d = Math.abs(denominador);
  return signo * Math.floor((2 * n + d) / (2 * d));
}

/** Aplica un porcentaje entero a un importe en céntimos. 21 % de 10000 → 2100. */
export function aplicarPorcentaje(baseCentimos: number, porcentaje: number): number {
  exigirEntero(baseCentimos, "La base");
  exigirEntero(porcentaje, "El porcentaje");
  return dividirRedondeando(baseCentimos * porcentaje, 100);
}

/** Base imponible de una línea: cantidad (milésimas) × precio unitario (céntimos). */
export function baseLineaCentimos(linea: LineaFactura): number {
  exigirEntero(linea.cantidadMilesimas, "La cantidad");
  exigirEntero(linea.precioUnitarioCentimos, "El precio unitario");
  return dividirRedondeando(
    linea.cantidadMilesimas * linea.precioUnitarioCentimos,
    MILESIMAS_POR_UNIDAD,
  );
}

/**
 * Añade a cada línea su base y su cuota de IVA. La cuota por línea es
 * informativa (para la columna de la tabla); la cuota que se liquida es la del
 * desglose por tipo impositivo, que se calcula sobre la base agregada.
 */
export function calcularLineas(lineas: readonly LineaFactura[]): LineaFacturaCalculada[] {
  return lineas.map((linea) => {
    const baseCentimos = baseLineaCentimos(linea);
    return {
      ...linea,
      baseCentimos,
      cuotaIvaCentimos: aplicarPorcentaje(baseCentimos, linea.ivaPorcentaje),
    };
  });
}

/** Agrupa las bases por tipo de IVA y calcula la cuota de cada grupo. */
export function calcularDesgloseIva(lineas: readonly LineaFactura[]): DesgloseIva[] {
  const basePorTipo = new Map<TipoIva, number>();
  for (const linea of lineas) {
    const acumulado = basePorTipo.get(linea.ivaPorcentaje) ?? 0;
    basePorTipo.set(linea.ivaPorcentaje, acumulado + baseLineaCentimos(linea));
  }
  return TIPOS_IVA.filter((tipo) => basePorTipo.has(tipo)).map((ivaPorcentaje) => {
    const baseCentimos = basePorTipo.get(ivaPorcentaje) ?? 0;
    return {
      ivaPorcentaje,
      baseCentimos,
      cuotaCentimos: aplicarPorcentaje(baseCentimos, ivaPorcentaje),
    };
  });
}

/**
 * Totales de una factura: base imponible, desglose e importe a pagar.
 *
 *   total = base imponible + cuota de IVA − retención de IRPF
 */
export function calcularTotales(
  lineas: readonly LineaFactura[],
  retencionIrpfPorcentaje: number,
): TotalesFactura {
  exigirEntero(retencionIrpfPorcentaje, "La retención de IRPF");
  if (retencionIrpfPorcentaje < 0 || retencionIrpfPorcentaje > 100) {
    throw new ErrorDinero("La retención de IRPF debe estar entre 0 y 100.");
  }

  const desgloseIva = calcularDesgloseIva(lineas);
  const baseImponibleCentimos = desgloseIva.reduce(
    (suma, fila) => suma + fila.baseCentimos,
    0,
  );
  const cuotaIvaCentimos = desgloseIva.reduce(
    (suma, fila) => suma + fila.cuotaCentimos,
    0,
  );
  const retencionIrpfCentimos = aplicarPorcentaje(
    baseImponibleCentimos,
    retencionIrpfPorcentaje,
  );

  return {
    baseImponibleCentimos,
    desgloseIva,
    cuotaIvaCentimos,
    retencionIrpfCentimos,
    totalCentimos: baseImponibleCentimos + cuotaIvaCentimos - retencionIrpfCentimos,
  };
}

/* ── Entrada de datos: texto del formulario → enteros ─────────────────── */

function parsearDecimal(entrada: string, decimales: number, nombre: string): number {
  const limpio = entrada.trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "") {
    throw new ErrorDinero(`${nombre} no puede estar vacío.`);
  }
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) {
    throw new ErrorDinero(`${nombre} no es un número válido: «${entrada}».`);
  }
  const [enteros, fraccion = ""] = limpio.split(".");
  if (fraccion.length > decimales) {
    throw new ErrorDinero(`${nombre} admite como máximo ${decimales} decimales.`);
  }
  const negativo = enteros.startsWith("-");
  const digitos = `${enteros.replace("-", "")}${fraccion.padEnd(decimales, "0")}`;
  const valor = Number.parseInt(digitos, 10);
  if (!Number.isSafeInteger(valor)) {
    throw new ErrorDinero(`${nombre} es demasiado grande.`);
  }
  return negativo ? -valor : valor;
}

/** «12,50» → 1250 céntimos. Acepta coma o punto decimal. */
export function parsearEurosACentimos(entrada: string): number {
  return parsearDecimal(entrada, 2, "El importe");
}

/** «1,5» → 1500 milésimas de unidad. */
export function parsearCantidadAMilesimas(entrada: string): number {
  return parsearDecimal(entrada, 3, "La cantidad");
}
