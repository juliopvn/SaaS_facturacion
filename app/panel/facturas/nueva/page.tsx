import type { Metadata } from "next";

import { Encabezado } from "@/components/panel/Encabezado";
import { FormularioFactura } from "@/components/panel/FormularioFactura";
import { exigirSesion } from "@/lib/autenticacion";
import { listarClientes } from "@/lib/repositorios/clientes";

export const metadata: Metadata = { title: "Nueva factura" };

export default async function NuevaFactura() {
  const { usuarioId } = await exigirSesion();
  const clientes = await listarClientes(usuarioId);

  return (
    <>
      <Encabezado
        rotulo="Facturas"
        titulo="Nueva factura"
        descripcion="El número se reserva al guardar. Puedes dejarla en borrador y emitirla más tarde."
      />
      <FormularioFactura clientes={clientes} />
    </>
  );
}
