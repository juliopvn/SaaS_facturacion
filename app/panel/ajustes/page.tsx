import type { Metadata } from "next";

import { Encabezado } from "@/components/panel/Encabezado";
import { FormularioEmisor } from "@/components/panel/FormularioEmisor";
import { exigirUsuario } from "@/lib/autenticacion";
import { serializarUsuario } from "@/lib/repositorios/usuarios";

export const metadata: Metadata = { title: "Mis datos" };

export default async function Ajustes() {
  const usuario = serializarUsuario(await exigirUsuario());

  return (
    <>
      <Encabezado
        rotulo="Cuenta"
        titulo="Mis datos"
        descripcion="Esto es lo que aparece en la cabecera de cada factura que emites."
      />

      <FormularioEmisor emisor={usuario.emisor} />

      <section className="border-regla mt-10 border-t pt-6">
        <h2 className="text-[1.0625rem] font-semibold">Acceso</h2>
        <p className="text-tinta-media mt-2 max-w-[38rem] leading-relaxed">
          Entras con{" "}
          <strong className="cifra text-tinta font-semibold">{usuario.email}</strong>. No
          hay contraseña que cambiar: cada vez que quieras entrar, pides un enlace nuevo.
        </p>
      </section>
    </>
  );
}
