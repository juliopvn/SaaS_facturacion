import type { Metadata } from "next";
import Link from "next/link";

import { AccionesFactura } from "@/components/panel/AccionesFactura";
import { Adjuntos } from "@/components/panel/Adjuntos";
import { BotonEliminar } from "@/components/panel/BotonEliminar";
import { Sello } from "@/components/ui/Sello";
import { exigirSesion, exigirUsuario } from "@/lib/autenticacion";
import { calcularLineas } from "@/lib/dinero";
import {
  estaVencida,
  formatearCantidad,
  formatearFechaLarga,
  formatearImporte,
} from "@/lib/formato";
import { obtenerFactura } from "@/lib/repositorios/facturas";

export async function generateMetadata({
  params,
}: PageProps<"/panel/facturas/[id]">): Promise<Metadata> {
  const { usuarioId } = await exigirSesion();
  const { id } = await params;
  const factura = await obtenerFactura(usuarioId, id);
  return { title: `Factura ${factura.numero}` };
}

export default async function DetalleFactura({
  params,
}: PageProps<"/panel/facturas/[id]">) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const factura = await obtenerFactura(usuario._id, id);
  const lineas = calcularLineas(factura.lineas);
  const vencida = estaVencida(factura.estado, factura.fechaVencimiento);

  return (
    <>
      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/panel/facturas"
          className="text-tinta-media decoration-regla-fuerte hover:text-sello text-[0.875rem] underline underline-offset-4 transition-colors"
        >
          ← Todas las facturas
        </Link>
        {factura.estado === "borrador" ? (
          <Link
            href={`/panel/facturas/${factura.id}/editar`}
            className="text-sello text-[0.875rem] font-medium underline underline-offset-4"
          >
            Editar borrador
          </Link>
        ) : null}
      </div>

      {/* La factura como documento: esto es lo que se imprime. */}
      <article className="hoja px-5 py-6 sm:px-9 sm:py-9">
        <header className="border-regla-fuerte flex flex-wrap items-start justify-between gap-6 border-b-2 pb-6">
          <div>
            <p className="rotulo">Factura</p>
            <h1
              data-prueba="numero-factura"
              className="cifra mt-1 text-[1.875rem] leading-none font-bold"
            >
              {factura.numero}
            </h1>
            <div className="mt-3">
              <Sello estado={factura.estado} vencida={vencida} />
            </div>
          </div>

          <div className="text-right">
            <p className="rotulo">Emite</p>
            <p className="mt-1 font-semibold">{usuario.emisor.nombre}</p>
            {usuario.emisor.nif ? (
              <p className="cifra text-tinta-media text-[0.8125rem]">
                {usuario.emisor.nif}
              </p>
            ) : (
              <Link
                href="/panel/ajustes"
                className="no-imprimir text-aviso text-[0.8125rem] underline underline-offset-2"
              >
                Completa tus datos fiscales
              </Link>
            )}
            {usuario.emisor.direccion ? (
              <p className="text-tinta-media mt-1 text-[0.8125rem] leading-snug">
                {usuario.emisor.direccion}
                <br />
                {usuario.emisor.codigoPostal} {usuario.emisor.ciudad}
              </p>
            ) : null}
          </div>
        </header>

        <div className="border-regla grid gap-6 border-b py-6 sm:grid-cols-2">
          <div>
            <p className="rotulo">Factura a</p>
            <p className="mt-2 font-semibold">{factura.cliente.nombre}</p>
            <p className="cifra text-tinta-media text-[0.8125rem]">
              {factura.cliente.nif}
            </p>
            {factura.cliente.direccion ? (
              <p className="text-tinta-media mt-1 text-[0.8125rem] leading-snug">
                {factura.cliente.direccion}
                <br />
                {factura.cliente.codigoPostal} {factura.cliente.ciudad}
                {factura.cliente.pais ? `, ${factura.cliente.pais}` : ""}
              </p>
            ) : null}
          </div>

          <dl className="space-y-1.5 text-[0.875rem] sm:text-right">
            <div className="flex justify-between gap-4 sm:justify-end">
              <dt className="text-tinta-tenue">Fecha de emisión</dt>
              <dd className="cifra whitespace-nowrap">
                {formatearFechaLarga(factura.fechaEmision)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:justify-end">
              <dt className="text-tinta-tenue">Vencimiento</dt>
              <dd
                className={`cifra whitespace-nowrap ${vencida ? "text-aviso font-semibold" : ""}`}
              >
                {formatearFechaLarga(factura.fechaVencimiento)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-6 w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only">Líneas de la factura {factura.numero}</caption>
            <thead>
              <tr className="border-regla-fuerte border-b">
                <th scope="col" className="rotulo pb-2 font-normal">
                  Concepto
                </th>
                <th scope="col" className="rotulo pb-2 text-right font-normal">
                  Uds.
                </th>
                <th scope="col" className="rotulo pb-2 text-right font-normal">
                  Precio €
                </th>
                <th scope="col" className="rotulo pb-2 text-right font-normal">
                  IVA
                </th>
                <th scope="col" className="rotulo pb-2 text-right font-normal">
                  Base €
                </th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea, indice) => (
                <tr
                  key={`${linea.descripcion}-${indice}`}
                  className="border-regla border-b"
                >
                  <td className="py-3 pr-4 text-[0.9375rem] leading-snug">
                    {linea.descripcion}
                  </td>
                  <td className="cifra text-tinta-media py-3 text-right text-[0.875rem]">
                    {formatearCantidad(linea.cantidadMilesimas)}
                  </td>
                  <td className="cifra text-tinta-media py-3 text-right text-[0.875rem]">
                    {formatearImporte(linea.precioUnitarioCentimos)}
                  </td>
                  <td className="cifra text-tinta-media py-3 text-right text-[0.875rem]">
                    {linea.ivaPorcentaje} %
                  </td>
                  <td className="cifra py-3 text-right text-[0.9375rem] font-medium">
                    {formatearImporte(linea.baseCentimos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-[22rem] space-y-2 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-tinta-media">Base imponible</dt>
              <dd className="cifra" data-prueba="detalle-base">
                {formatearImporte(factura.totales.baseImponibleCentimos)}
              </dd>
            </div>

            {factura.totales.desgloseIva.map((fila) => (
              <div key={fila.ivaPorcentaje} className="flex justify-between gap-4">
                <dt className="text-tinta-media">
                  IVA {fila.ivaPorcentaje} % sobre{" "}
                  <span className="cifra text-[0.8125rem]">
                    {formatearImporte(fila.baseCentimos)}
                  </span>
                </dt>
                <dd className="cifra" data-prueba={`detalle-iva-${fila.ivaPorcentaje}`}>
                  {formatearImporte(fila.cuotaCentimos)}
                </dd>
              </div>
            ))}

            <div className="border-regla flex justify-between gap-4 border-t pt-2">
              <dt className="text-tinta-media">Cuota de IVA</dt>
              <dd className="cifra font-medium" data-prueba="detalle-iva">
                {formatearImporte(factura.totales.cuotaIvaCentimos)}
              </dd>
            </div>

            {factura.retencionIrpfPorcentaje > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-tinta-media">
                  Retención IRPF {factura.retencionIrpfPorcentaje} %
                </dt>
                <dd className="cifra text-aviso" data-prueba="detalle-retencion">
                  −{formatearImporte(factura.totales.retencionIrpfCentimos)}
                </dd>
              </div>
            ) : null}

            <div className="border-regla-fuerte flex items-baseline justify-between gap-4 border-t-2 pt-3">
              <dt className="rotulo">Total a pagar</dt>
              <dd className="cifra text-[1.5rem] font-bold" data-prueba="detalle-total">
                {formatearImporte(factura.totales.totalCentimos)} €
              </dd>
            </div>

            <p className="cifra text-tinta-tenue pt-1 text-right text-[0.6875rem]">
              {factura.totales.totalCentimos} céntimos
            </p>
          </dl>
        </div>

        {factura.notas ? (
          <div className="border-regla mt-8 border-t border-dashed pt-5">
            <p className="rotulo">Notas</p>
            <p className="text-tinta-media mt-2 max-w-[42rem] text-[0.9375rem] leading-relaxed whitespace-pre-line">
              {factura.notas}
            </p>
          </div>
        ) : null}
      </article>

      <div className="mt-6">
        <AccionesFactura factura={factura} />
      </div>

      <Adjuntos facturaId={factura.id} adjuntos={factura.adjuntos} />

      {factura.estado === "borrador" ? (
        <section className="no-imprimir border-regla mt-10 border-t pt-6">
          <h2 className="text-[1.0625rem] font-semibold">Eliminar este borrador</h2>
          <p className="text-tinta-media mt-1 mb-4 max-w-[38rem] text-[0.875rem] leading-relaxed">
            El número {factura.numero} quedará sin usar. Una factura ya emitida no se
            borra: se anula.
          </p>
          <BotonEliminar
            url={`/api/facturas/${factura.id}`}
            destino="/panel/facturas"
            etiqueta="Eliminar borrador"
            confirmacion={`Se eliminará el borrador ${factura.numero}. Esta acción no se puede deshacer.`}
          />
        </section>
      ) : null}
    </>
  );
}
