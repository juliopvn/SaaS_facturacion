import type { Metadata } from "next";
import Link from "next/link";

import { Encabezado } from "@/components/panel/Encabezado";
import { Vacio } from "@/components/panel/Vacio";
import { BotonEnlace } from "@/components/ui/Boton";
import { exigirSesion } from "@/lib/autenticacion";
import { formatearImporte } from "@/lib/formato";
import { listarClientesConResumen } from "@/lib/repositorios/clientes";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes() {
  const { usuarioId } = await exigirSesion();
  const clientes = await listarClientesConResumen(usuarioId);

  return (
    <>
      <Encabezado
        rotulo="Clientes"
        titulo="Tu cartera"
        descripcion="Solo tú ves estos clientes. Los datos fiscales que pongas aquí son los que se imprimen en la factura."
        acciones={<BotonEnlace href="/panel/clientes/nuevo">Nuevo cliente</BotonEnlace>}
      />

      {clientes.length === 0 ? (
        <Vacio
          titulo="Todavía no tienes clientes"
          detalle="Da de alta al primero con su nombre fiscal y su NIF. Después podrás emitirle facturas en dos clics."
          accion={
            <BotonEnlace href="/panel/clientes/nuevo">Dar de alta un cliente</BotonEnlace>
          }
        />
      ) : (
        <div className="hoja overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <caption className="sr-only">Clientes dados de alta</caption>
            <thead>
              <tr className="border-regla-fuerte border-b">
                <th scope="col" className="rotulo px-4 py-3 font-normal">
                  Cliente
                </th>
                <th scope="col" className="rotulo px-4 py-3 font-normal">
                  NIF
                </th>
                <th scope="col" className="rotulo px-4 py-3 font-normal">
                  Población
                </th>
                <th scope="col" className="rotulo px-4 py-3 text-right font-normal">
                  Facturas
                </th>
                <th scope="col" className="rotulo px-4 py-3 text-right font-normal">
                  Facturado €
                </th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  data-prueba="fila-cliente"
                  className="border-regla hover:bg-papel-hundido border-b last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/clientes/${cliente.id}`}
                      className="text-sello font-medium underline-offset-4 hover:underline"
                    >
                      {cliente.nombre}
                    </Link>
                    {cliente.email ? (
                      <span className="text-tinta-tenue block text-[0.75rem]">
                        {cliente.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="cifra text-tinta-media px-4 py-3 text-[0.8125rem]">
                    {cliente.nif}
                  </td>
                  <td className="text-tinta-media px-4 py-3 text-[0.875rem]">
                    {cliente.ciudad || "—"}
                  </td>
                  <td className="cifra text-tinta-media px-4 py-3 text-right text-[0.875rem]">
                    {cliente.facturasEmitidas}
                  </td>
                  <td className="cifra px-4 py-3 text-right text-[0.9375rem] font-semibold whitespace-nowrap">
                    {formatearImporte(cliente.facturadoCentimos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
