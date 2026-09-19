import type { Metadata } from "next";
import Link from "next/link";

import { Encabezado } from "@/components/panel/Encabezado";
import { FiltrosFacturas } from "@/components/panel/FiltrosFacturas";
import { TablaFacturas } from "@/components/panel/TablaFacturas";
import { Vacio } from "@/components/panel/Vacio";
import { BotonEnlace } from "@/components/ui/Boton";
import { exigirSesion } from "@/lib/autenticacion";
import { formatearEuros } from "@/lib/formato";
import { listarClientes } from "@/lib/repositorios/clientes";
import { listarFacturas } from "@/lib/repositorios/facturas";
import { esquemaFiltroFacturas } from "@/lib/validaciones";

export const metadata: Metadata = { title: "Facturas" };

/** Solo los valores que el esquema admite; lo demás se descarta sin romper. */
function unico(valor: string | string[] | undefined): string | undefined {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return texto && texto !== "" ? texto : undefined;
}

export default async function Facturas({ searchParams }: PageProps<"/panel/facturas">) {
  const { usuarioId } = await exigirSesion();
  const parametros = await searchParams;

  const filtro = esquemaFiltroFacturas.catch({ pagina: 1, porPagina: 10 }).parse({
    estado: unico(parametros.estado),
    clienteId: unico(parametros.clienteId),
    busqueda: unico(parametros.busqueda),
    pagina: unico(parametros.pagina) ?? 1,
    porPagina: 10,
  });

  const [pagina, clientes] = await Promise.all([
    listarFacturas(usuarioId, filtro),
    listarClientes(usuarioId),
  ]);

  const sumaPagina = pagina.facturas.reduce(
    (total, factura) => total + factura.totales.totalCentimos,
    0,
  );

  function urlPagina(numero: number): string {
    const consulta = new URLSearchParams();
    if (filtro.estado) consulta.set("estado", filtro.estado);
    if (filtro.clienteId) consulta.set("clienteId", filtro.clienteId);
    if (filtro.busqueda) consulta.set("busqueda", filtro.busqueda);
    if (numero > 1) consulta.set("pagina", String(numero));
    const cadena = consulta.toString();
    return cadena ? `/panel/facturas?${cadena}` : "/panel/facturas";
  }

  const hayFiltro = Boolean(filtro.estado ?? filtro.clienteId ?? filtro.busqueda);

  return (
    <>
      <Encabezado
        rotulo="Facturas"
        titulo="Tus facturas"
        descripcion={`${pagina.total} en total${hayFiltro ? " con los filtros aplicados" : ""}.`}
        acciones={<BotonEnlace href="/panel/facturas/nueva">Nueva factura</BotonEnlace>}
      />

      <FiltrosFacturas
        clientes={clientes}
        estado={filtro.estado}
        clienteId={filtro.clienteId}
        busqueda={filtro.busqueda}
      />

      {pagina.facturas.length === 0 ? (
        <Vacio
          titulo={
            hayFiltro ? "Ninguna factura encaja con el filtro" : "Aún no hay facturas"
          }
          detalle={
            hayFiltro
              ? "Prueba a quitar el estado o el cliente para ver el listado completo."
              : "Emite la primera y aparecerá aquí con su número, su estado y su total."
          }
          accion={
            hayFiltro ? (
              <BotonEnlace href="/panel/facturas" tono="secundario">
                Quitar filtros
              </BotonEnlace>
            ) : (
              <BotonEnlace href="/panel/facturas/nueva">Emitir una factura</BotonEnlace>
            )
          }
        />
      ) : (
        <>
          <TablaFacturas facturas={pagina.facturas} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="cifra text-tinta-tenue text-[0.75rem]">
              Suma de esta página: {formatearEuros(sumaPagina)}
            </p>

            {pagina.totalPaginas > 1 ? (
              <nav aria-label="Paginación" className="flex items-center gap-1">
                {pagina.pagina > 1 ? (
                  <Link
                    href={urlPagina(pagina.pagina - 1)}
                    className="border-regla hover:border-sello hover:text-sello border px-3 py-1.5 text-[0.8125rem] transition-colors"
                  >
                    Anterior
                  </Link>
                ) : null}
                <span className="cifra text-tinta-media px-3 text-[0.8125rem]">
                  {pagina.pagina} / {pagina.totalPaginas}
                </span>
                {pagina.pagina < pagina.totalPaginas ? (
                  <Link
                    href={urlPagina(pagina.pagina + 1)}
                    className="border-regla hover:border-sello hover:text-sello border px-3 py-1.5 text-[0.8125rem] transition-colors"
                  >
                    Siguiente
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
