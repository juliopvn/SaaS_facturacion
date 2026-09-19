import type { Metadata } from "next";

import { Encabezado } from "@/components/panel/Encabezado";
import { FormularioCliente } from "@/components/panel/FormularioCliente";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NuevoCliente() {
  return (
    <>
      <Encabezado
        rotulo="Clientes"
        titulo="Nuevo cliente"
        descripcion="Con el nombre y el NIF basta para empezar; el resto se puede completar después."
      />
      <FormularioCliente />
    </>
  );
}
