import type { Metadata } from "next";
import Link from "next/link";

import { FormularioAcceso } from "@/components/landing/FormularioAcceso";
import { Aviso } from "@/components/ui/Aviso";
import { configEmail, emailDemoSugerido } from "@/lib/env";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Accede a tu panel de facturación con un enlace de un solo uso.",
};

/** Por qué se rechazó un enlace, dicho de forma que se sepa qué hacer. */
const MOTIVOS: Record<string, string> = {
  "sin-token": "Ese enlace venía incompleto. Pide uno nuevo.",
  desconocido: "Ese enlace no es válido. Pide uno nuevo.",
  usado: "Ese enlace ya se usó. Los enlaces solo valen una vez.",
  caducado: "Ese enlace ha caducado. Pide uno nuevo.",
  error: "No hemos podido validar el enlace. Inténtalo otra vez.",
};

export default async function Acceso({ searchParams }: PageProps<"/acceso">) {
  const parametros = await searchParams;
  const destinoCrudo = typeof parametros.destino === "string" ? parametros.destino : "";
  const destino = destinoCrudo.startsWith("/") ? destinoCrudo : "/panel";
  const motivo =
    typeof parametros.motivo === "string" ? MOTIVOS[parametros.motivo] : undefined;

  const { proveedor } = configEmail();
  const enLocal = proveedor === "mailhog";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-regla-fuerte border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="font-titular text-[1.375rem] font-bold tracking-tight [font-variation-settings:'wdth'_118]"
          >
            Talonario
          </Link>
          <Link
            href="/"
            className="text-tinta-media decoration-regla-fuerte hover:text-sello text-sm underline underline-offset-4 transition-colors"
          >
            Volver a la portada
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="relative w-full max-w-[26rem]">
          {/* La copia rosa asomando: la misma pieza que en la portada, en pequeño. */}
          <div
            aria-hidden
            className="border-regla-fuerte bg-copia-rosa absolute inset-0 rotate-[2.5deg] border"
          />
          <div className="hoja relative px-6 py-8 sm:px-8 sm:py-10">
            {motivo ? (
              <Aviso tono="error" className="mb-6">
                {motivo}
              </Aviso>
            ) : null}

            <FormularioAcceso
              destino={destino}
              emailSugerido={enLocal ? emailDemoSugerido() : undefined}
              mostrarPistaMailhog={enLocal}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
