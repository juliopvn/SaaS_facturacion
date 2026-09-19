import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Encabezado } from "@/components/panel/Encabezado";
import { FormularioFactura } from "@/components/panel/FormularioFactura";
import { exigirSesion } from "@/lib/autenticacion";
import { listarClientes } from "@/lib/repositorios/clientes";
import { obtenerFactura } from "@/lib/repositorios/facturas";

export const metadata: Metadata = { title: "Editar borrador" };

export default async function EditarFactura({
  params,
}: PageProps<"/panel/facturas/[id]/editar">) {
  const { usuarioId } = await exigirSesion();
  const { id } = await params;
  const [factura, clientes] = await Promise.all([
    obtenerFactura(usuarioId, id),
    listarClientes(usuarioId),
  ]);

  // Una factura emitida es un documento cerrado: se anula, no se reescribe.
  if (factura.estado !== "borrador") redirect(`/panel/facturas/${factura.id}`);

  return (
    <>
      <Encabezado
        rotulo="Facturas"
        titulo={`Editar ${factura.numero}`}
        descripcion="El número y la serie ya están reservados; el resto se puede cambiar mientras sea un borrador."
      />
      <FormularioFactura clientes={clientes} factura={factura} />
    </>
  );
}
