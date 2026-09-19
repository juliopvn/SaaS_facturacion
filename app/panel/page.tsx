import type { Metadata } from "next";
import Link from "next/link";

import { Encabezado } from "@/components/panel/Encabezado";
import { TablaFacturas } from "@/components/panel/TablaFacturas";
import { Vacio } from "@/components/panel/Vacio";
import { BotonEnlace } from "@/components/ui/Boton";
import { exigirSesion } from "@/lib/autenticacion";
import { formatearEuros } from "@/lib/formato";
import { listarFacturas, obtenerResumenPanel } from "@/lib/repositorios/facturas";

export const metadata: Metadata = { title: "Resumen" };

/*
 * Server Component: lee MongoDB directamente a través de los repositorios,
 * sin pasar por las API routes. Esas son para los Client Components.
 */

interface Cifra {
  rotulo: string;
  valor: string;
  nota: string;
  acento?: boolean;
}

export default async function Panel() {
  const { usuarioId } = await exigirSesion();
  const [resumen, ultimas] = await Promise.all([
    obtenerResumenPanel(usuarioId),
    listarFacturas(usuarioId, { pagina: 1, porPagina: 5 }),
  ]);

  const cifras: Cifra[] = [
    {
      rotulo: "Facturado",
      valor: formatearEuros(resumen.facturadoCentimos),
      nota: "Emitidas y pagadas, IVA incluido",
      acento: true,
    },
    {
      rotulo: "Cobrado",
      valor: formatearEuros(resumen.cobradoCentimos),
      nota: "Facturas marcadas como pagadas",
    },
    {
      rotulo: "Pendiente de cobro",
      valor: formatearEuros(resumen.pendienteCentimos),
      nota: "Emitidas y aún sin cobrar",
    },
    {
      rotulo: "IVA repercutido",
      valor: formatearEuros(resumen.ivaRepercutidoCentimos),
      nota: "Lo que llevas recaudado para Hacienda",
    },
  ];

  return (
    <>
      <Encabezado
        rotulo="Panel"
        titulo="Tu resumen"
        descripcion={`${resumen.totalFacturas} factura${resumen.totalFacturas === 1 ? "" : "s"} y ${resumen.totalClientes} cliente${resumen.totalClientes === 1 ? "" : "s"} en tu cuenta.`}
        acciones={
          <>
            <BotonEnlace href="/panel/facturas/nueva">Nueva factura</BotonEnlace>
            <BotonEnlace href="/panel/clientes/nuevo" tono="secundario">
              Nuevo cliente
            </BotonEnlace>
          </>
        }
      />

      <section aria-labelledby="cifras" className="mb-10">
        <h2 id="cifras" className="sr-only">
          Cifras del ejercicio
        </h2>
        <dl className="border-regla-fuerte bg-regla-fuerte grid gap-px border sm:grid-cols-2 lg:grid-cols-4">
          {cifras.map((cifra) => (
            <div key={cifra.rotulo} className="bg-papel px-4 py-5">
              <dt className="rotulo">{cifra.rotulo}</dt>
              <dd
                data-prueba={`cifra-${cifra.rotulo.toLowerCase().replace(/\s/g, "-")}`}
                className={`cifra mt-2 text-[1.375rem] leading-none font-bold ${
                  cifra.acento ? "text-sello" : ""
                }`}
              >
                {cifra.valor}
              </dd>
              <p className="text-tinta-tenue mt-2 text-[0.75rem] leading-snug">
                {cifra.nota}
              </p>
            </div>
          ))}
        </dl>
      </section>

      {resumen.vencidas > 0 || resumen.borradores > 0 ? (
        <section className="mb-10 flex flex-wrap gap-3">
          {resumen.vencidas > 0 ? (
            <Link
              href="/panel/facturas?estado=emitida"
              className="border-aviso/40 bg-aviso-tenue text-aviso hover:border-aviso border px-4 py-3 text-[0.875rem] transition-colors"
            >
              <strong className="cifra">{resumen.vencidas}</strong>{" "}
              {resumen.vencidas === 1 ? "factura vencida" : "facturas vencidas"} sin
              cobrar
            </Link>
          ) : null}
          {resumen.borradores > 0 ? (
            <Link
              href="/panel/facturas?estado=borrador"
              className="border-regla text-tinta-media hover:border-sello hover:text-sello border px-4 py-3 text-[0.875rem] transition-colors"
            >
              <strong className="cifra">{resumen.borradores}</strong>{" "}
              {resumen.borradores === 1 ? "borrador" : "borradores"} sin emitir
            </Link>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="ultimas">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="ultimas" className="text-[1.25rem] font-semibold">
            Últimas facturas
          </h2>
          {ultimas.total > 0 ? (
            <Link
              href="/panel/facturas"
              className="text-tinta-media decoration-regla-fuerte hover:text-sello text-[0.875rem] underline underline-offset-4 transition-colors"
            >
              Ver todas ({ultimas.total})
            </Link>
          ) : null}
        </div>

        {ultimas.facturas.length === 0 ? (
          <Vacio
            titulo="Aún no has emitido ninguna factura"
            detalle="Da de alta un cliente y emite la primera. El número, el IVA y el total se calculan solos."
            accion={
              <BotonEnlace href="/panel/facturas/nueva">Emitir una factura</BotonEnlace>
            }
          />
        ) : (
          <TablaFacturas facturas={ultimas.facturas} />
        )}
      </section>
    </>
  );
}
