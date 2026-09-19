import Link from "next/link";
import { redirect } from "next/navigation";

import { BarraUsuario } from "@/components/panel/BarraUsuario";
import { Navegacion } from "@/components/panel/Navegacion";
import { ProveedorUsuario } from "@/context/GlobalContext";
import { usuarioActual } from "@/lib/autenticacion";

/**
 * Armazón del panel.
 *
 * Resuelve el usuario en el servidor y lo entrega al `GlobalContext`, de modo
 * que los Client Components de dentro no tengan que pedirlo por su cuenta.
 * `proxy.ts` ya ha filtrado a quien no tiene sesión; este `redirect` cubre el
 * caso de que la cuenta se haya borrado con la cookie aún viva.
 */
export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceso?destino=/panel");

  return (
    <ProveedorUsuario usuarioInicial={usuario}>
      <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
        {/* La tapa del talonario: oscura, fija, con la navegación. */}
        <aside className="bg-[#171a22] lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-black/40">
          <div className="flex items-center justify-between gap-4 px-4 py-4 lg:block lg:px-3 lg:py-6">
            <div className="flex items-center gap-3 lg:block">
              <Link
                href="/panel"
                className="font-titular text-[1.25rem] font-bold tracking-tight text-white [font-variation-settings:'wdth'_118] lg:px-3"
              >
                Talonario
              </Link>
              <span
                aria-hidden
                className="hidden h-2 w-8 border border-white/30 bg-[var(--copia-rosa)] lg:mx-3 lg:mt-3 lg:block"
              />
            </div>
            <div className="lg:hidden">
              <BarraUsuario />
            </div>
          </div>

          <div className="border-t border-white/10 px-2 py-2 lg:mt-6 lg:border-t-0 lg:py-0">
            <Navegacion />
          </div>

          <div className="hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:block lg:border-t lg:border-white/10 lg:p-3">
            <p className="cifra truncate px-1 pb-2 text-[0.6875rem] text-white/40">
              {usuario.email}
            </p>
            <BarraUsuario />
          </div>
        </aside>

        <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </ProveedorUsuario>
  );
}
