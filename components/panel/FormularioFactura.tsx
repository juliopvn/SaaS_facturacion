"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { AreaTexto, Campo, Entrada, Seleccion } from "@/components/ui/Campo";
import {
  ErrorDinero,
  calcularLineas,
  calcularTotales,
  parsearCantidadAMilesimas,
  parsearEurosACentimos,
} from "@/lib/dinero";
import {
  centimosAValorInput,
  formatearImporte,
  milesimasAValorInput,
} from "@/lib/formato";
import { peticionJson, type FalloApi } from "@/lib/peticiones";
import {
  TIPOS_IVA,
  type Cliente,
  type EstadoFactura,
  type Factura,
  type LineaFactura,
  type TipoIva,
} from "@/lib/types";

/*
 * Emisión y edición de facturas.
 *
 * El total que se ve mientras se escribe sale de `lib/dinero.ts`, exactamente
 * el mismo módulo que recalcula el servidor al guardar. No hay dos aritméticas
 * que puedan divergir: lo que muestra el formulario es lo que se guarda.
 */

interface LineaBorrador {
  clave: string;
  descripcion: string;
  /** Texto tal cual lo teclea la persona: «1,5». Se convierte al guardar. */
  cantidad: string;
  /** Euros en texto: «1.234,56». */
  precio: string;
  iva: TipoIva;
}

/*
 * La clave de cada línea acaba en el `id` de sus campos, así que tiene que ser
 * idéntica en el servidor y en el cliente: nada de `Math.random()`, que
 * rompería la hidratación. `useId()` da el prefijo estable y un contador local
 * numera las líneas que se añaden ya en el navegador.
 */
function lineaVacia(clave: string): LineaBorrador {
  return {
    clave,
    descripcion: "",
    cantidad: "1",
    precio: "",
    iva: 21,
  };
}

function aFecha(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Convierte una línea de texto a enteros. `null` si aún no es convertible. */
function aLineaFactura(borrador: LineaBorrador): LineaFactura | null {
  try {
    return {
      descripcion: borrador.descripcion,
      cantidadMilesimas: parsearCantidadAMilesimas(borrador.cantidad),
      precioUnitarioCentimos: parsearEurosACentimos(borrador.precio),
      ivaPorcentaje: borrador.iva,
    };
  } catch {
    return null;
  }
}

interface Propiedades {
  clientes: Cliente[];
  /** Factura existente en borrador; ausente para emitir una nueva. */
  factura?: Factura;
}

export function FormularioFactura({ clientes, factura }: Propiedades) {
  const router = useRouter();
  const prefijo = useId();
  const siguienteLinea = useRef(1);

  const [clienteId, setClienteId] = useState(factura?.clienteId ?? clientes[0]?.id ?? "");
  const [serie, setSerie] = useState(factura?.serie ?? "F");
  const [fechaEmision, setFechaEmision] = useState(
    factura ? aFecha(factura.fechaEmision) : hoyIso(),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(
    factura ? aFecha(factura.fechaVencimiento) : enDias(30),
  );
  const [retencion, setRetencion] = useState(
    String(factura?.retencionIrpfPorcentaje ?? 0),
  );
  const [notas, setNotas] = useState(factura?.notas ?? "");
  const [lineas, setLineas] = useState<LineaBorrador[]>(() =>
    factura
      ? factura.lineas.map((linea, indice) => ({
          clave: `existente-${indice}`,
          descripcion: linea.descripcion,
          cantidad: milesimasAValorInput(linea.cantidadMilesimas),
          precio: centimosAValorInput(linea.precioUnitarioCentimos),
          iva: linea.ivaPorcentaje,
        }))
      : [lineaVacia(`${prefijo}-0`)],
  );

  const [fallo, setFallo] = useState<FalloApi | null>(null);
  const [guardando, setGuardando] = useState(false);

  /* Previsualización en vivo: solo entran las líneas ya convertibles. */
  const previsualizacion = useMemo(() => {
    const convertidas = lineas
      .map(aLineaFactura)
      .filter((linea): linea is LineaFactura => linea !== null);
    const porcentaje = Number.parseInt(retencion, 10);
    try {
      return {
        lineas: calcularLineas(convertidas),
        totales: calcularTotales(
          convertidas,
          Number.isInteger(porcentaje) ? porcentaje : 0,
        ),
      };
    } catch {
      return null;
    }
  }, [lineas, retencion]);

  function editarLinea(clave: string, cambios: Partial<LineaBorrador>): void {
    setLineas((actuales) =>
      actuales.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)),
    );
  }

  async function enviar(estado: EstadoFactura): Promise<void> {
    setGuardando(true);
    setFallo(null);

    let lineasConvertidas: LineaFactura[];
    try {
      lineasConvertidas = lineas.map((borrador, indice) => {
        const convertida = aLineaFactura(borrador);
        if (!convertida) {
          throw new ErrorDinero(
            `Revisa la cantidad y el precio de la línea ${indice + 1}.`,
          );
        }
        return convertida;
      });
    } catch (error) {
      setFallo({
        mensaje:
          error instanceof ErrorDinero
            ? error.message
            : "Revisa las cantidades y los precios.",
        detalles: {},
      });
      setGuardando(false);
      return;
    }

    const cuerpo = {
      clienteId,
      serie: serie.toUpperCase(),
      fechaEmision,
      fechaVencimiento,
      lineas: lineasConvertidas,
      retencionIrpfPorcentaje: Number.parseInt(retencion, 10) || 0,
      estado,
      notas,
    };

    const resultado = factura
      ? await peticionJson<{ factura: Factura }>(
          `/api/facturas/${factura.id}`,
          "PUT",
          cuerpo,
        )
      : await peticionJson<{ factura: Factura }>("/api/facturas", "POST", cuerpo);

    if (!resultado.ok) {
      setFallo(resultado.fallo);
      setGuardando(false);
      return;
    }

    router.push(`/panel/facturas/${resultado.datos.factura.id}`);
    router.refresh();
  }

  const error = (campo: string): string | undefined => fallo?.detalles[campo];

  if (clientes.length === 0) {
    return (
      <div className="hoja p-6">
        <h2 className="text-[1.125rem] font-semibold">Antes necesitas un cliente</h2>
        <p className="text-tinta-media mt-2 max-w-[34rem] leading-relaxed">
          Una factura tiene que ir a nombre de alguien. Da de alta a tu primer cliente y
          vuelve aquí.
        </p>
        <div className="mt-5">
          <BotonEnlace href="/panel/clientes/nuevo">Dar de alta un cliente</BotonEnlace>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void enviar("borrador");
      }}
      noValidate
      className="grid gap-6 lg:grid-cols-[1fr_19rem] lg:items-start"
    >
      <div className="space-y-6">
        {fallo && Object.keys(fallo.detalles).length === 0 ? (
          <Aviso tono="error">{fallo.mensaje}</Aviso>
        ) : null}

        <section className="hoja p-5 sm:p-6">
          <h2 className="rotulo-seccion mb-5">Cabecera</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              etiqueta="Cliente"
              htmlFor="clienteId"
              error={error("clienteId")}
              className="sm:col-span-2"
            >
              <Seleccion
                id="clienteId"
                name="clienteId"
                value={clienteId}
                error={Boolean(error("clienteId"))}
                onChange={(evento) => setClienteId(evento.target.value)}
              >
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} · {cliente.nif}
                  </option>
                ))}
              </Seleccion>
            </Campo>

            <Campo
              etiqueta="Serie"
              htmlFor="serie"
              error={error("serie")}
              ayuda="Cada serie lleva su propia numeración por año."
            >
              <Entrada
                id="serie"
                name="serie"
                className="cifra uppercase"
                maxLength={6}
                value={serie}
                error={Boolean(error("serie"))}
                onChange={(evento) => setSerie(evento.target.value.toUpperCase())}
              />
            </Campo>

            <Campo
              etiqueta="Retención de IRPF"
              htmlFor="retencion"
              error={error("retencionIrpfPorcentaje")}
              ayuda="0 si no practicas retención."
            >
              <Seleccion
                id="retencion"
                name="retencion"
                value={retencion}
                onChange={(evento) => setRetencion(evento.target.value)}
              >
                {[0, 7, 15, 19].map((valor) => (
                  <option key={valor} value={valor}>
                    {valor} %
                  </option>
                ))}
              </Seleccion>
            </Campo>

            <Campo
              etiqueta="Fecha de emisión"
              htmlFor="fechaEmision"
              error={error("fechaEmision")}
            >
              <Entrada
                id="fechaEmision"
                name="fechaEmision"
                type="date"
                className="cifra"
                value={fechaEmision}
                error={Boolean(error("fechaEmision"))}
                onChange={(evento) => setFechaEmision(evento.target.value)}
              />
            </Campo>

            <Campo
              etiqueta="Vencimiento"
              htmlFor="fechaVencimiento"
              error={error("fechaVencimiento")}
            >
              <Entrada
                id="fechaVencimiento"
                name="fechaVencimiento"
                type="date"
                className="cifra"
                value={fechaVencimiento}
                error={Boolean(error("fechaVencimiento"))}
                onChange={(evento) => setFechaVencimiento(evento.target.value)}
              />
            </Campo>
          </div>
        </section>

        <section className="hoja p-5 sm:p-6">
          <h2 className="rotulo-seccion mb-5">Líneas</h2>
          {error("lineas") ? (
            <Aviso tono="error" className="mb-4">
              {error("lineas")}
            </Aviso>
          ) : null}

          <ul className="space-y-4">
            {lineas.map((linea, indice) => {
              const convertida = aLineaFactura(linea);
              const base = convertida
                ? calcularLineas([convertida])[0].baseCentimos
                : null;

              return (
                <li
                  key={linea.clave}
                  data-prueba="linea-factura"
                  className="border-regla bg-papel-hundido border p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_5.5rem_7.5rem_6rem]">
                    <Campo etiqueta="Concepto" htmlFor={`descripcion-${linea.clave}`}>
                      <Entrada
                        id={`descripcion-${linea.clave}`}
                        name="descripcion"
                        required
                        placeholder="Diseño de identidad visual"
                        value={linea.descripcion}
                        onChange={(evento) =>
                          editarLinea(linea.clave, { descripcion: evento.target.value })
                        }
                      />
                    </Campo>

                    <Campo etiqueta="Uds." htmlFor={`cantidad-${linea.clave}`}>
                      <Entrada
                        id={`cantidad-${linea.clave}`}
                        name="cantidad"
                        inputMode="decimal"
                        className="cifra text-right"
                        value={linea.cantidad}
                        onChange={(evento) =>
                          editarLinea(linea.clave, { cantidad: evento.target.value })
                        }
                      />
                    </Campo>

                    <Campo etiqueta="Precio €" htmlFor={`precio-${linea.clave}`}>
                      <Entrada
                        id={`precio-${linea.clave}`}
                        name="precio"
                        inputMode="decimal"
                        placeholder="0,00"
                        className="cifra text-right"
                        value={linea.precio}
                        onChange={(evento) =>
                          editarLinea(linea.clave, { precio: evento.target.value })
                        }
                      />
                    </Campo>

                    <Campo etiqueta="IVA" htmlFor={`iva-${linea.clave}`}>
                      <Seleccion
                        id={`iva-${linea.clave}`}
                        name="iva"
                        className="cifra"
                        value={linea.iva}
                        onChange={(evento) =>
                          editarLinea(linea.clave, {
                            iva: Number.parseInt(evento.target.value, 10) as TipoIva,
                          })
                        }
                      >
                        {TIPOS_IVA.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo} %
                          </option>
                        ))}
                      </Seleccion>
                    </Campo>
                  </div>

                  <div className="border-regla mt-3 flex items-center justify-between gap-4 border-t pt-3">
                    <p className="cifra text-tinta-media text-[0.8125rem]">
                      Base:{" "}
                      <span data-prueba="base-linea" className="text-tinta font-semibold">
                        {base === null ? "—" : `${formatearImporte(base)} €`}
                      </span>
                    </p>
                    {lineas.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLineas((actuales) =>
                            actuales.filter((otra) => otra.clave !== linea.clave),
                          )
                        }
                        className="text-tinta-tenue decoration-regla hover:text-aviso text-[0.8125rem] underline underline-offset-4 transition-colors"
                      >
                        Quitar línea {indice + 1}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <Boton
            type="button"
            tono="secundario"
            tamano="compacto"
            data-prueba="anadir-linea"
            className="mt-4"
            onClick={() => {
              const clave = `${prefijo}-${siguienteLinea.current}`;
              siguienteLinea.current += 1;
              setLineas((actuales) => [...actuales, lineaVacia(clave)]);
            }}
          >
            Añadir línea
          </Boton>
        </section>

        <section className="hoja p-5 sm:p-6">
          <h2 className="rotulo-seccion mb-5">Notas</h2>
          <Campo
            etiqueta="Texto que verá el cliente"
            htmlFor="notas"
            error={error("notas")}
          >
            <AreaTexto
              id="notas"
              name="notas"
              rows={3}
              placeholder="Forma de pago, número de pedido, condiciones…"
              value={notas}
              onChange={(evento) => setNotas(evento.target.value)}
            />
          </Campo>
        </section>
      </div>

      {/* Resumen pegajoso: el total siempre a la vista mientras se teclea. */}
      <aside className="hoja p-5 lg:sticky lg:top-6">
        <h2 className="rotulo-seccion mb-4">Totales</h2>

        {previsualizacion === null ? (
          <p className="text-tinta-media text-[0.875rem]">
            Completa las líneas para ver el total.
          </p>
        ) : (
          <dl className="space-y-2 text-[0.875rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-tinta-media">Base imponible</dt>
              <dd className="cifra" data-prueba="total-base">
                {formatearImporte(previsualizacion.totales.baseImponibleCentimos)}
              </dd>
            </div>

            {previsualizacion.totales.desgloseIva.map((fila) => (
              <div key={fila.ivaPorcentaje} className="flex justify-between gap-3">
                <dt className="text-tinta-media">
                  IVA {fila.ivaPorcentaje} % sobre{" "}
                  <span className="cifra">{formatearImporte(fila.baseCentimos)}</span>
                </dt>
                <dd className="cifra" data-prueba={`total-iva-${fila.ivaPorcentaje}`}>
                  {formatearImporte(fila.cuotaCentimos)}
                </dd>
              </div>
            ))}

            <div className="flex justify-between gap-3">
              <dt className="text-tinta-media">Cuota de IVA</dt>
              <dd className="cifra font-medium" data-prueba="total-iva">
                {formatearImporte(previsualizacion.totales.cuotaIvaCentimos)}
              </dd>
            </div>

            {previsualizacion.totales.retencionIrpfCentimos > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-tinta-media">Retención IRPF</dt>
                <dd className="cifra text-aviso" data-prueba="total-retencion">
                  −{formatearImporte(previsualizacion.totales.retencionIrpfCentimos)}
                </dd>
              </div>
            ) : null}

            <div className="border-regla-fuerte flex items-baseline justify-between gap-3 border-t-2 pt-3">
              <dt className="rotulo">Total</dt>
              <dd className="cifra text-[1.375rem] font-bold" data-prueba="total-factura">
                {formatearImporte(previsualizacion.totales.totalCentimos)} €
              </dd>
            </div>

            <p className="cifra border-regla text-tinta-tenue border-t border-dashed pt-3 text-[0.6875rem] leading-relaxed">
              {previsualizacion.totales.totalCentimos} céntimos
            </p>
          </dl>
        )}

        <div className="border-regla mt-6 space-y-2 border-t pt-5">
          <Boton
            type="button"
            disabled={guardando}
            data-prueba="emitir-factura"
            className="w-full"
            onClick={() => void enviar("emitida")}
          >
            {guardando ? "Guardando…" : "Emitir factura"}
          </Boton>
          <Boton
            type="submit"
            tono="secundario"
            disabled={guardando}
            data-prueba="guardar-borrador"
            className="w-full"
          >
            Guardar como borrador
          </Boton>
          <BotonEnlace
            href={factura ? `/panel/facturas/${factura.id}` : "/panel/facturas"}
            tono="fantasma"
            className="w-full"
          >
            Cancelar
          </BotonEnlace>
        </div>
      </aside>
    </form>
  );
}
