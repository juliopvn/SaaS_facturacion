import Link from "next/link";

import { HojaTalonario } from "@/components/landing/HojaTalonario";
import { BotonEnlace } from "@/components/ui/Boton";
import { aplicarPorcentaje } from "@/lib/dinero";
import { formatearImporte } from "@/lib/formato";

/*
 * Landing pública.
 *
 * El hero es la tesis: un talonario autocopiativo con una factura real encima.
 * Todo lo demás está subordinado a esa pieza —reglas de un punto, cifras en
 * monoespaciada tabular y nada de adorno que no diga algo verdadero.
 */

const PRESTACIONES = [
  {
    titulo: "Tus clientes, con su NIF validado",
    detalle:
      "Alta, edición y ficha con el histórico de lo facturado. El NIF se valida antes de guardar para que no se cuele una errata.",
  },
  {
    titulo: "Facturas con varios tipos de IVA",
    detalle:
      "Líneas con cantidades decimales, los cuatro tipos vigentes conviviendo en el mismo documento y retención de IRPF sobre la base.",
  },
  {
    titulo: "Numeración correlativa y sin huecos",
    detalle:
      "Cada serie lleva su contador por ejercicio, reservado de forma atómica. Dos facturas emitidas a la vez no comparten número.",
  },
  {
    titulo: "Adjuntos guardados aparte",
    detalle:
      "El albarán o el justificante de pago viven en almacenamiento S3, no en la base de datos, y se descargan con un enlace temporal.",
  },
];

const PASOS = [
  {
    titulo: "Escribe tu correo",
    detalle:
      "Sin contraseña que inventar ni recordar. Te llega un enlace que caduca en 15 minutos y solo funciona una vez.",
  },
  {
    titulo: "Da de alta a tu cliente",
    detalle:
      "Nombre, NIF y dirección fiscal. Lo que se imprime en la factura queda congelado el día que la emites.",
  },
  {
    titulo: "Emite y cobra",
    detalle:
      "Añade líneas, elige el IVA de cada una y marca la factura como pagada cuando entre el dinero.",
  },
];

/* Ejemplo trabajado de la sección «al céntimo», calculado, no escrito a mano. */
const EJEMPLO_BASE = 3_333;
const EJEMPLO_IVA = aplicarPorcentaje(EJEMPLO_BASE, 21);
const EJEMPLO_TOTAL = EJEMPLO_BASE + EJEMPLO_IVA;
/*
 * El contraejemplo: el mismo caso operado con euros en coma flotante.
 * Es el ÚNICO sitio del proyecto donde se hace aritmética de dinero fuera de
 * `lib/dinero.ts`, y está aquí a propósito, para enseñar el resultado que
 * produce. No lo copies.
 */
const EJEMPLO_FLOTANTE = (EJEMPLO_BASE / 100) * 1.21;

function Logotipo() {
  return (
    <Link href="/" className="group inline-flex items-baseline gap-2">
      <span className="font-titular text-[1.375rem] font-bold tracking-tight [font-variation-settings:'wdth'_118]">
        Talonario
      </span>
      <span
        aria-hidden
        className="border-regla-fuerte bg-copia-rosa group-hover:bg-sello hidden h-2 w-8 border transition-colors sm:block"
      />
    </Link>
  );
}

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-regla-fuerte border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Logotipo />
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="#al-centimo"
              className="text-tinta-media hover:text-sello hidden px-3 py-2 text-sm transition-colors sm:inline"
            >
              Al céntimo
            </Link>
            <Link
              href="#como-funciona"
              className="text-tinta-media hover:text-sello hidden px-3 py-2 text-sm transition-colors sm:inline"
            >
              Cómo funciona
            </Link>
            <BotonEnlace href="/acceso" tamano="compacto">
              Entrar
            </BotonEnlace>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="border-regla-fuerte border-b">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
            <div>
              <p className="rotulo">Facturación para autónomos · España</p>
              <h1 className="mt-5 text-[2.5rem] leading-[0.98] font-bold sm:text-[3.5rem] lg:text-[4rem]">
                Las cuentas salen
                <br />
                <span className="text-sello">al céntimo.</span>
                <br />
                Siempre.
              </h1>
              <p className="text-tinta-media mt-6 max-w-[34rem] text-lg leading-relaxed">
                Talonario guarda cada importe como un número entero de céntimos y solo lo
                convierte a euros para enseñártelo. Ni un redondeo raro en el IVA, ni un
                céntimo de más en el total del trimestre.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <BotonEnlace href="/acceso">Emitir mi primera factura</BotonEnlace>
                <Link
                  href="#al-centimo"
                  className="text-tinta-media decoration-regla-fuerte hover:text-sello px-2 py-2.5 text-[0.9375rem] underline underline-offset-4 transition-colors"
                >
                  Ver por qué importa
                </Link>
              </div>

              <p className="cifra text-tinta-tenue mt-6 text-[0.75rem] leading-relaxed">
                Sin contraseña · Entras con un enlace que te llega al correo
              </p>
            </div>

            <div className="lg:pl-4">
              <HojaTalonario />
            </div>
          </div>
        </section>

        {/* ── La tesis: dinero en enteros ─────────────────────────────── */}
        <section id="al-centimo" className="border-regla-fuerte scroll-mt-4 border-b">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="max-w-[46rem]">
              <p className="rotulo">El detalle que lo cambia todo</p>
              <h2 className="mt-4 text-[1.875rem] leading-tight font-bold sm:text-[2.5rem]">
                Un ordenador no sabe sumar 0,1 y 0,2
              </h2>
              <p className="text-tinta-media mt-5 text-lg leading-relaxed">
                En coma flotante, <code className="cifra text-tinta">0.1 + 0.2</code> da{" "}
                <code className="cifra text-tinta">0.30000000000000004</code>. Parece una
                anécdota hasta que ese resto se arrastra por doce facturas y el modelo 303
                no cuadra con tu banco. Por eso aquí el dinero nunca es un decimal.
              </p>
            </div>

            <div className="border-regla-fuerte bg-regla-fuerte mt-10 grid gap-px border sm:grid-cols-2">
              <div className="bg-papel p-6 sm:p-8">
                <p className="rotulo">Así lo hace Talonario</p>
                <dl className="mt-5 space-y-3">
                  <div className="border-regla flex items-baseline justify-between gap-4 border-b pb-3">
                    <dt className="text-tinta-media text-[0.9375rem]">Base imponible</dt>
                    <dd className="cifra text-[0.9375rem]">
                      {EJEMPLO_BASE} <span className="text-tinta-tenue">céntimos</span>
                    </dd>
                  </div>
                  <div className="border-regla flex items-baseline justify-between gap-4 border-b pb-3">
                    <dt className="text-tinta-media text-[0.9375rem]">
                      IVA 21 % ={" "}
                      <span className="cifra text-[0.8125rem]">
                        ({EJEMPLO_BASE} × 21 + 50) ÷ 100
                      </span>
                    </dt>
                    <dd className="cifra text-[0.9375rem]">
                      {EJEMPLO_IVA} <span className="text-tinta-tenue">céntimos</span>
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] font-medium">Total</dt>
                    <dd className="cifra text-[0.9375rem] font-bold">
                      {EJEMPLO_TOTAL} <span className="text-tinta-tenue">céntimos</span>
                    </dd>
                  </div>
                </dl>
                <p className="border-regla text-tinta-media mt-5 border-t border-dashed pt-4 text-[0.875rem] leading-relaxed">
                  Y solo al pintarlo en pantalla:{" "}
                  <strong className="cifra text-tinta">
                    {formatearImporte(EJEMPLO_TOTAL)} €
                  </strong>
                  . La división entre 100 vive en un único archivo del proyecto.
                </p>
              </div>

              <div className="bg-papel-hundido p-6 sm:p-8">
                <p className="rotulo">Así lo hace casi todo lo demás</p>
                <dl className="mt-5 space-y-3">
                  <div className="border-regla flex items-baseline justify-between gap-4 border-b pb-3">
                    <dt className="text-tinta-media text-[0.9375rem]">Base imponible</dt>
                    <dd className="cifra text-tinta-media text-[0.9375rem]">
                      {(EJEMPLO_BASE / 100).toFixed(2)} €
                    </dd>
                  </div>
                  <div className="border-regla flex items-baseline justify-between gap-4 border-b pb-3">
                    <dt className="text-tinta-media text-[0.9375rem]">
                      Total ={" "}
                      <span className="cifra text-[0.8125rem]">
                        {(EJEMPLO_BASE / 100).toFixed(2)} × 1.21
                      </span>
                    </dt>
                    <dd className="cifra text-aviso text-[0.9375rem]">
                      {EJEMPLO_FLOTANTE}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] font-medium">
                      Lo que acaba guardado
                    </dt>
                    <dd className="cifra text-aviso text-[0.9375rem]">
                      {EJEMPLO_FLOTANTE} €
                    </dd>
                  </div>
                </dl>
                <p className="border-regla text-tinta-media mt-5 border-t border-dashed pt-4 text-[0.875rem] leading-relaxed">
                  Un rastro de decimales imposible de cobrar, que se suma factura tras
                  factura hasta descuadrar el trimestre.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Prestaciones ────────────────────────────────────────────── */}
        <section className="border-regla-fuerte border-b">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="rotulo">Lo que hace</p>
            <h2 className="mt-4 max-w-[30rem] text-[1.875rem] leading-tight font-bold sm:text-[2.5rem]">
              Lo justo para facturar bien
            </h2>

            <dl className="border-regla-fuerte mt-10 border-t">
              {PRESTACIONES.map((prestacion) => (
                <div
                  key={prestacion.titulo}
                  className="border-regla grid gap-2 border-b py-6 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-10"
                >
                  <dt className="text-[1.0625rem] leading-snug font-semibold">
                    {prestacion.titulo}
                  </dt>
                  <dd className="text-tinta-media max-w-[40rem] leading-relaxed">
                    {prestacion.detalle}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Cómo funciona: aquí el orden sí es información ──────────── */}
        <section id="como-funciona" className="border-regla-fuerte scroll-mt-4 border-b">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="rotulo">Cómo funciona</p>
            <h2 className="mt-4 max-w-[30rem] text-[1.875rem] leading-tight font-bold sm:text-[2.5rem]">
              De cero a factura emitida en tres pasos
            </h2>

            <ol className="border-regla-fuerte bg-regla-fuerte mt-10 grid gap-px border md:grid-cols-3">
              {PASOS.map((paso, indice) => (
                <li key={paso.titulo} className="bg-papel p-6 sm:p-8">
                  <span className="cifra text-sello text-[0.75rem] font-bold tracking-[0.2em]">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-[1.125rem] leading-snug font-semibold">
                    {paso.titulo}
                  </h3>
                  <p className="text-tinta-media mt-2 leading-relaxed">{paso.detalle}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Cierre ──────────────────────────────────────────────────── */}
        <section>
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="hoja relative mx-auto max-w-[44rem] px-6 py-12 text-center sm:px-12 sm:py-16">
              <p className="rotulo">Empieza ahora</p>
              <h2 className="mt-4 text-[2rem] leading-tight font-bold sm:text-[2.75rem]">
                Escribe tu correo y entra
              </h2>
              <p className="text-tinta-media mx-auto mt-5 max-w-[32rem] leading-relaxed">
                No hay formulario de registro, ni contraseña, ni tarjeta. Pones tu correo,
                abres el enlace que te llega y ya estás dentro con tu panel vacío
                esperando la primera factura.
              </p>
              <div className="mt-8 flex justify-center">
                <BotonEnlace href="/acceso">Entrar en Talonario</BotonEnlace>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-regla-fuerte border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logotipo />
          <p className="cifra text-tinta-tenue text-[0.75rem] leading-relaxed">
            Proyecto de formación · Next.js 16 · MongoDB · Todo el dinero en céntimos
          </p>
        </div>
      </footer>
    </div>
  );
}
