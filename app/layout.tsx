import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { ProveedorPreferencias, SCRIPT_TEMA } from "@/context/GlobalContext";

import "./globals.css";

/* Archivo con eje de anchura: los titulares van ensanchados, el texto no. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--fuente-archivo",
  display: "swap",
});

/* Toda cifra del producto se compone en esta monoespaciada. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Talonario · Facturas que cuadran al céntimo",
    template: "%s · Talonario",
  },
  description:
    "Emite facturas con IVA e IRPF correctos, lleva tus clientes y entra sin contraseña. Pensado para autónomos y estudios pequeños en España.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d9e1e6" },
    { media: "(prefers-color-scheme: dark)", color: "#10131a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-tema="claro"
      className={`${archivo.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Fija el tema antes del primer pintado para evitar el destello. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full">
        <ProveedorPreferencias>{children}</ProveedorPreferencias>
      </body>
    </html>
  );
}
