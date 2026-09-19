import type { Metadata } from "next";

import { BotonEliminar } from "@/components/panel/BotonEliminar";
import { Encabezado } from "@/components/panel/Encabezado";
import { FormularioCliente } from "@/components/panel/FormularioCliente";
import { TablaFacturas } from "@/components/panel/TablaFacturas";
import { exigirSesion } from "@/lib/autenticacion";
import { obtenerCliente } from "@/lib/repositorios/clientes";
import { listarFacturas } from "@/lib/repositorios/facturas";

export async function generateMetadata({
  params,
}: PageProps<"/panel/clientes/[id]">): Promise<Metadata> {
  const { usuarioId } = await exigirSesion();
  const { id } = await params;
  const cliente = await obtenerCliente(usuarioId, id);
  return { title: cliente.nombre };
}

export default async function EditarCliente({
  params,
}: PageProps<"/panel/clientes/[id]">) {
  const { usuarioId } = await exigirSesion();
  const { id } = await params;
  const [cliente, facturas] = await Promise.all([
    obtenerCliente(usuarioId, id),
    listarFacturas(usuarioId, { clienteId: id, pagina: 1, porPagina: 50 }),
  ]);

  return (
    <>
      <Encabezado
        rotulo="Cliente"
        titulo={cliente.nombre}
        descripcion={`${cliente.nif} · ${facturas.total} factura${facturas.total === 1 ? "" : "s"} emitidas`}
      />

      <FormularioCliente cliente={cliente} />

      {facturas.facturas.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-[1.25rem] font-semibold">Sus facturas</h2>
          <TablaFacturas facturas={facturas.facturas} />
        </section>
      ) : null}

      <section className="border-regla mt-10 border-t pt-6">
        <h2 className="text-[1.0625rem] font-semibold">Eliminar este cliente</h2>
        <p className="text-tinta-media mt-1 mb-4 max-w-[38rem] text-[0.875rem] leading-relaxed">
          Solo se pueden eliminar clientes sin facturas: una factura emitida debe
          conservar a quién se le hizo.
        </p>
        <BotonEliminar
          url={`/api/clientes/${cliente.id}`}
          destino="/panel/clientes"
          etiqueta="Eliminar cliente"
          confirmacion={`Se eliminará «${cliente.nombre}» de tu cartera. Esta acción no se puede deshacer.`}
        />
      </section>
    </>
  );
}
