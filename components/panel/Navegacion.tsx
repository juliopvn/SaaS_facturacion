"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/panel", etiqueta: "Resumen" },
  { href: "/panel/facturas", etiqueta: "Facturas" },
  { href: "/panel/clientes", etiqueta: "Clientes" },
  { href: "/panel/ajustes", etiqueta: "Mis datos" },
] as const;

export function Navegacion() {
  const ruta = usePathname();

  return (
    <nav aria-label="Secciones del panel">
      <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
        {ENLACES.map((enlace) => {
          const activo =
            enlace.href === "/panel" ? ruta === "/panel" : ruta.startsWith(enlace.href);
          return (
            <li key={enlace.href} className="shrink-0">
              <Link
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={`block border-l-2 px-3 py-2 text-[0.9375rem] whitespace-nowrap transition-colors ${
                  activo
                    ? "border-l-[var(--copia-rosa)] bg-white/10 font-medium text-white"
                    : "border-l-transparent text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {enlace.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
