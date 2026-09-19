/** PUT /api/perfil — datos fiscales del emisor que salen en la factura. */
import { NextResponse } from "next/server";
import { z } from "zod";

import { leerCuerpo, rutaSegura } from "@/lib/api";
import { exigirSesion } from "@/lib/autenticacion";
import { actualizarEmisor } from "@/lib/repositorios/usuarios";
import type { Usuario } from "@/lib/types";
import { esIdentificadorFiscalValido } from "@/lib/validaciones";

const esquemaEmisor = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre o razón social.").max(120),
  nif: z
    .string()
    .trim()
    .transform((valor) => valor.toUpperCase().replace(/[\s-]/g, ""))
    .refine(
      (valor) => valor === "" || esIdentificadorFiscalValido(valor),
      "El NIF, NIE o CIF no es válido.",
    ),
  direccion: z.string().trim().max(160).default(""),
  ciudad: z.string().trim().max(80).default(""),
  codigoPostal: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{5}$/, "El código postal tiene 5 dígitos."),
    ])
    .default(""),
  pais: z.string().trim().max(60).default("España"),
});

export function PUT(peticion: Request) {
  return rutaSegura<{ usuario: Usuario }>(async () => {
    const { usuarioId } = await exigirSesion();
    const emisor = await leerCuerpo(peticion, esquemaEmisor);
    return NextResponse.json({ usuario: await actualizarEmisor(usuarioId, emisor) });
  });
}
