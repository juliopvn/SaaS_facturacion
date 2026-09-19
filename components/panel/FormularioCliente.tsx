"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { AreaTexto, Campo, Entrada } from "@/components/ui/Campo";
import { peticionJson, type FalloApi } from "@/lib/peticiones";
import type { Cliente } from "@/lib/types";

interface Propiedades {
  /** Cliente existente para editar; ausente para dar uno de alta. */
  cliente?: Cliente;
}

const VACIO = {
  nombre: "",
  nif: "",
  email: "",
  telefono: "",
  direccion: "",
  ciudad: "",
  codigoPostal: "",
  pais: "España",
  notas: "",
};

export function FormularioCliente({ cliente }: Propiedades) {
  const router = useRouter();
  const [datos, setDatos] = useState(() =>
    cliente
      ? {
          nombre: cliente.nombre,
          nif: cliente.nif,
          email: cliente.email,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          ciudad: cliente.ciudad,
          codigoPostal: cliente.codigoPostal,
          pais: cliente.pais,
          notas: cliente.notas,
        }
      : VACIO,
  );
  const [fallo, setFallo] = useState<FalloApi | null>(null);
  const [guardando, setGuardando] = useState(false);

  function editar(campo: keyof typeof VACIO, valor: string): void {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setGuardando(true);
    setFallo(null);

    const resultado = cliente
      ? await peticionJson<{ cliente: Cliente }>(
          `/api/clientes/${cliente.id}`,
          "PUT",
          datos,
        )
      : await peticionJson<{ cliente: Cliente }>("/api/clientes", "POST", datos);

    if (!resultado.ok) {
      setFallo(resultado.fallo);
      setGuardando(false);
      return;
    }

    router.push("/panel/clientes");
    router.refresh();
  }

  const error = (campo: string): string | undefined => fallo?.detalles[campo];

  return (
    <form onSubmit={guardar} noValidate className="hoja p-5 sm:p-7">
      {fallo && Object.keys(fallo.detalles).length === 0 ? (
        <Aviso tono="error" className="mb-6">
          {fallo.mensaje}
        </Aviso>
      ) : null}

      <fieldset>
        <legend className="rotulo-seccion mb-5">Datos fiscales</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre o razón social"
            htmlFor="nombre"
            error={error("nombre")}
          >
            <Entrada
              id="nombre"
              name="nombre"
              required
              autoComplete="organization"
              value={datos.nombre}
              error={Boolean(error("nombre"))}
              onChange={(evento) => editar("nombre", evento.target.value)}
            />
          </Campo>

          <Campo
            etiqueta="NIF, NIE o CIF"
            htmlFor="nif"
            error={error("nif")}
            ayuda="Se comprueba la letra de control antes de guardar."
          >
            <Entrada
              id="nif"
              name="nif"
              required
              className="cifra uppercase"
              value={datos.nif}
              error={Boolean(error("nif"))}
              onChange={(evento) => editar("nif", evento.target.value)}
            />
          </Campo>

          <Campo etiqueta="Correo electrónico" htmlFor="email" error={error("email")}>
            <Entrada
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={datos.email}
              error={Boolean(error("email"))}
              onChange={(evento) => editar("email", evento.target.value)}
            />
          </Campo>

          <Campo etiqueta="Teléfono" htmlFor="telefono" error={error("telefono")}>
            <Entrada
              id="telefono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              value={datos.telefono}
              error={Boolean(error("telefono"))}
              onChange={(evento) => editar("telefono", evento.target.value)}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="rotulo-seccion mb-5">Dirección fiscal</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            etiqueta="Calle y número"
            htmlFor="direccion"
            error={error("direccion")}
            className="sm:col-span-2"
          >
            <Entrada
              id="direccion"
              name="direccion"
              autoComplete="street-address"
              value={datos.direccion}
              error={Boolean(error("direccion"))}
              onChange={(evento) => editar("direccion", evento.target.value)}
            />
          </Campo>

          <Campo etiqueta="Población" htmlFor="ciudad" error={error("ciudad")}>
            <Entrada
              id="ciudad"
              name="ciudad"
              autoComplete="address-level2"
              value={datos.ciudad}
              error={Boolean(error("ciudad"))}
              onChange={(evento) => editar("ciudad", evento.target.value)}
            />
          </Campo>

          <div className="grid grid-cols-[8rem_1fr] gap-4">
            <Campo
              etiqueta="Código postal"
              htmlFor="codigoPostal"
              error={error("codigoPostal")}
            >
              <Entrada
                id="codigoPostal"
                name="codigoPostal"
                inputMode="numeric"
                className="cifra"
                autoComplete="postal-code"
                value={datos.codigoPostal}
                error={Boolean(error("codigoPostal"))}
                onChange={(evento) => editar("codigoPostal", evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="País" htmlFor="pais" error={error("pais")}>
              <Entrada
                id="pais"
                name="pais"
                autoComplete="country-name"
                value={datos.pais}
                error={Boolean(error("pais"))}
                onChange={(evento) => editar("pais", evento.target.value)}
              />
            </Campo>
          </div>
        </div>
      </fieldset>

      <div className="mt-8">
        <Campo etiqueta="Notas internas" htmlFor="notas" error={error("notas")}>
          <AreaTexto
            id="notas"
            name="notas"
            rows={3}
            placeholder="Condiciones de pago, persona de contacto, número de proveedor…"
            value={datos.notas}
            error={Boolean(error("notas"))}
            onChange={(evento) => editar("notas", evento.target.value)}
          />
        </Campo>
      </div>

      <div className="border-regla mt-8 flex flex-wrap gap-3 border-t pt-6">
        <Boton type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : cliente ? "Guardar cambios" : "Crear cliente"}
        </Boton>
        <BotonEnlace href="/panel/clientes" tono="fantasma">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  );
}
