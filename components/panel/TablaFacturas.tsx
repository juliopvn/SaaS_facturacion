import Link from "next/link";

import { Sello } from "@/components/ui/Sello";
import { estaVencida, formatearFecha, formatearImporte } from "@/lib/formato";
import type { Factura } from "@/lib/types";

/**
 * Tabla de facturas. Server Component puro: no necesita interactividad, así
 * que no cruza la frontera del cliente.
 */
export function TablaFacturas({ facturas }: { facturas: Factura[] }) {
  return (
    <div className="hoja overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="sr-only">Facturas emitidas</caption>
        <thead>
          <tr className="border-regla-fuerte border-b">
            <th scope="col" className="rotulo px-4 py-3 font-normal">
              Número
            </th>
            <th scope="col" className="rotulo px-4 py-3 font-normal">
              Cliente
            </th>
            <th scope="col" className="rotulo px-4 py-3 font-normal">
              Emisión
            </th>
            <th scope="col" className="rotulo px-4 py-3 font-normal">
              Estado
            </th>
            <th scope="col" className="rotulo px-4 py-3 text-right font-normal">
              Total €
            </th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((factura) => (
            <tr
              key={factura.id}
              data-prueba="fila-factura"
              className="border-regla hover:bg-papel-hundido border-b last:border-b-0"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/panel/facturas/${factura.id}`}
                  className="cifra text-sello text-[0.875rem] font-semibold underline-offset-4 hover:underline"
                >
                  {factura.numero}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="block max-w-[18rem] truncate text-[0.9375rem]">
                  {factura.cliente.nombre}
                </span>
                <span className="cifra text-tinta-tenue text-[0.75rem]">
                  {factura.cliente.nif}
                </span>
              </td>
              <td className="cifra text-tinta-media px-4 py-3 text-[0.8125rem] whitespace-nowrap">
                {formatearFecha(factura.fechaEmision)}
              </td>
              <td className="px-4 py-3">
                <Sello
                  estado={factura.estado}
                  vencida={estaVencida(factura.estado, factura.fechaVencimiento)}
                />
              </td>
              <td className="cifra px-4 py-3 text-right text-[0.9375rem] font-semibold whitespace-nowrap">
                {formatearImporte(factura.totales.totalCentimos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
