"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo, Entrada } from "@/components/ui/Campo";
import { useGlobal } from "@/context/GlobalContext";
import { peticionJson, type FalloApi } from "@/lib/peticiones";
import type { DatosEmisor, Usuario } from "@/lib/types";

/** Datos fiscales propios: la cabecera «Emite» de cada factura. */
export function FormularioEmisor({ emisor }: { emisor: DatosEmisor }) {
  const router = useRouter();
  const { actualizarUsuario } = useGlobal();
  const [datos, setDatos] = useState<DatosEmisor>(emisor);
  const [fallo, setFallo] = useState<FalloApi | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function editar(campo: keyof DatosEmisor, valor: string): void {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setGuardando(true);
    setFallo(null);

    const resultado = await peticionJson<{ usuario: Usuario }>(
      "/api/perfil",
      "PUT",
      datos,
    );
    setGuardando(false);

    if (!resultado.ok) {
      setFallo(resultado.fallo);
      return;
    }

    actualizarUsuario(resultado.datos.usuario);
    setDatos(resultado.datos.usuario.emisor);
    setGuardado(true);
    router.refresh();
  }

  const error = (campo: keyof DatosEmisor): string | undefined => fallo?.detalles[campo];

  return (
    <form onSubmit={guardar} noValidate className="hoja p-5 sm:p-7">
      {fallo && Object.keys(fallo.detalles).length === 0 ? (
        <Aviso tono="error" className="mb-6">
          {fallo.mensaje}
        </Aviso>
      ) : null}
      {guardado ? (
        <Aviso tono="exito" className="mb-6">
          Datos guardados. Las próximas facturas los usarán.
        </Aviso>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre o razón social"
          htmlFor="emisor-nombre"
          error={error("nombre")}
        >
          <Entrada
            id="emisor-nombre"
            value={datos.nombre}
            error={Boolean(error("nombre"))}
            onChange={(evento) => editar("nombre", evento.target.value)}
          />
        </Campo>

        <Campo etiqueta="NIF" htmlFor="emisor-nif" error={error("nif")}>
          <Entrada
            id="emisor-nif"
            className="cifra uppercase"
            value={datos.nif}
            error={Boolean(error("nif"))}
            onChange={(evento) => editar("nif", evento.target.value)}
          />
        </Campo>

        <Campo
          etiqueta="Dirección"
          htmlFor="emisor-direccion"
          error={error("direccion")}
          className="sm:col-span-2"
        >
          <Entrada
            id="emisor-direccion"
            value={datos.direccion}
            error={Boolean(error("direccion"))}
            onChange={(evento) => editar("direccion", evento.target.value)}
          />
        </Campo>

        <Campo etiqueta="Población" htmlFor="emisor-ciudad" error={error("ciudad")}>
          <Entrada
            id="emisor-ciudad"
            value={datos.ciudad}
            error={Boolean(error("ciudad"))}
            onChange={(evento) => editar("ciudad", evento.target.value)}
          />
        </Campo>

        <div className="grid grid-cols-[8rem_1fr] gap-4">
          <Campo
            etiqueta="Código postal"
            htmlFor="emisor-cp"
            error={error("codigoPostal")}
          >
            <Entrada
              id="emisor-cp"
              inputMode="numeric"
              className="cifra"
              value={datos.codigoPostal}
              error={Boolean(error("codigoPostal"))}
              onChange={(evento) => editar("codigoPostal", evento.target.value)}
            />
          </Campo>
          <Campo etiqueta="País" htmlFor="emisor-pais" error={error("pais")}>
            <Entrada
              id="emisor-pais"
              value={datos.pais}
              error={Boolean(error("pais"))}
              onChange={(evento) => editar("pais", evento.target.value)}
            />
          </Campo>
        </div>
      </div>

      <div className="border-regla mt-8 border-t pt-6">
        <Boton type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar mis datos"}
        </Boton>
      </div>
    </form>
  );
}
