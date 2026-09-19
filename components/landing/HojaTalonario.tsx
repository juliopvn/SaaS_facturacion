import { baseLineaCentimos, calcularTotales } from "@/lib/dinero";
import { formatearCantidad, formatearImporte } from "@/lib/formato";
import type { LineaFactura } from "@/lib/types";

/*
 * La hoja del talonario: el elemento de firma de la landing.
 *
 * Las cifras que se ven aquí no están escritas a mano — salen del mismo
 * `calcularTotales` que usa el producto. Si la aritmética cambiara, la landing
 * cambiaría con ella.
 */

const LINEAS: LineaFactura[] = [
  {
    descripcion: "Identidad visual y manual de marca",
    cantidadMilesimas: 1_000,
    precioUnitarioCentimos: 240_000,
    ivaPorcentaje: 21,
  },
  {
    descripcion: "Sesión de fotografía de producto",
    cantidadMilesimas: 2_500,
    precioUnitarioCentimos: 48_000,
    ivaPorcentaje: 21,
  },
  {
    descripcion: "Catálogo impreso · 500 uds.",
    cantidadMilesimas: 500_000,
    precioUnitarioCentimos: 240,
    ivaPorcentaje: 10,
  },
];

const RETENCION = 15;

export function HojaTalonario() {
  const totales = calcularTotales(LINEAS, RETENCION);

  return (
    <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
      {/* Las dos copias autocopiativas asomando bajo el original. */}
      <div
        aria-hidden
        className="anima-hoja border-regla-fuerte bg-copia-azul absolute inset-0 border"
        style={{ ["--giro-final" as string]: "4.5deg", animationDelay: "0.05s" }}
      />
      <div
        aria-hidden
        className="anima-hoja border-regla-fuerte bg-copia-rosa absolute inset-0 border"
        style={{ ["--giro-final" as string]: "2.2deg", animationDelay: "0.2s" }}
      />

      <article
        className="anima-hoja hoja relative px-5 py-5 sm:px-7 sm:py-6"
        style={{ ["--giro-final" as string]: "0deg", animationDelay: "0.35s" }}
      >
        <header className="border-regla flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="rotulo">Factura</p>
            <p className="cifra mt-1 text-xl font-semibold tracking-tight">F-2026-0042</p>
          </div>
          <div className="text-right">
            <p className="rotulo">Cliente</p>
            <p className="mt-1 text-sm leading-tight font-medium">Gráfica Mediterránea</p>
            <p className="cifra text-tinta-tenue text-[0.75rem]">23456783B</p>
          </div>
        </header>

        <table className="mt-4 w-full text-left">
          <thead>
            <tr className="border-regla border-b">
              <th scope="col" className="rotulo pb-2 font-normal">
                Concepto
              </th>
              <th scope="col" className="rotulo pb-2 text-right font-normal">
                Uds.
              </th>
              <th scope="col" className="rotulo pb-2 text-right font-normal">
                IVA
              </th>
              <th scope="col" className="rotulo pb-2 text-right font-normal">
                Base
              </th>
            </tr>
          </thead>
          <tbody>
            {LINEAS.map((linea) => {
              const base = baseLineaCentimos(linea);
              return (
                <tr key={linea.descripcion} className="border-regla/60 border-b">
                  <td className="py-2 pr-3 text-[0.8125rem] leading-snug">
                    {linea.descripcion}
                  </td>
                  <td className="cifra text-tinta-media py-2 text-right text-[0.8125rem]">
                    {formatearCantidad(linea.cantidadMilesimas)}
                  </td>
                  <td className="cifra text-tinta-media py-2 text-right text-[0.8125rem]">
                    {linea.ivaPorcentaje} %
                  </td>
                  <td className="cifra py-2 text-right text-[0.8125rem] font-medium">
                    {formatearImporte(base)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto w-full max-w-[16rem] space-y-1.5 text-[0.8125rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-tinta-media">Base imponible</dt>
            <dd className="cifra">{formatearImporte(totales.baseImponibleCentimos)}</dd>
          </div>
          {totales.desgloseIva.map((fila) => (
            <div key={fila.ivaPorcentaje} className="flex justify-between gap-4">
              <dt className="text-tinta-media">IVA {fila.ivaPorcentaje} %</dt>
              <dd className="cifra">{formatearImporte(fila.cuotaCentimos)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4">
            <dt className="text-tinta-media">Retención IRPF {RETENCION} %</dt>
            <dd className="cifra text-aviso">
              −{formatearImporte(totales.retencionIrpfCentimos)}
            </dd>
          </div>
          <div className="border-regla-fuerte flex items-baseline justify-between gap-4 border-t-2 pt-2">
            <dt className="rotulo">Total</dt>
            <dd className="cifra text-xl font-bold">
              {formatearImporte(totales.totalCentimos)} €
            </dd>
          </div>
        </dl>

        {/* La anotación al margen: la tesis técnica del producto, en pequeño. */}
        <p className="cifra border-regla text-tinta-tenue mt-4 border-t border-dashed pt-3 text-[0.6875rem] leading-relaxed">
          guardado como {totales.totalCentimos} céntimos · entero, sin coma flotante
        </p>

        <span
          aria-hidden
          className="anima-sello sello-tampon text-sello absolute bottom-14 left-4 sm:bottom-16 sm:left-8 sm:text-lg"
        >
          Pagada
        </span>
      </article>
    </div>
  );
}
