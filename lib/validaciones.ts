/**
 * Esquemas de entrada. Todo lo que llega de fuera (API routes, formularios,
 * seed) pasa por aquí antes de tocar la base de datos.
 */
import { z } from "zod";

import { ESTADOS_FACTURA, TIPOS_IVA } from "@/lib/types";

/* ── Identificadores fiscales españoles ──────────────────────────────── */

const LETRAS_NIF = "TRWAGMYFPDXBNJZSQVHLCKE";

/** Valida NIF, NIE y CIF, incluyendo el dígito o la letra de control. */
export function esIdentificadorFiscalValido(valor: string): boolean {
  const codigo = valor.trim().toUpperCase().replace(/[\s-]/g, "");

  // NIF: 8 dígitos + letra de control.
  if (/^\d{8}[A-Z]$/.test(codigo)) {
    const numero = Number.parseInt(codigo.slice(0, 8), 10);
    return LETRAS_NIF[numero % 23] === codigo[8];
  }

  // NIE: X/Y/Z + 7 dígitos + letra de control.
  if (/^[XYZ]\d{7}[A-Z]$/.test(codigo)) {
    const prefijo = "XYZ".indexOf(codigo[0]);
    const numero = Number.parseInt(`${prefijo}${codigo.slice(1, 8)}`, 10);
    return LETRAS_NIF[numero % 23] === codigo[8];
  }

  // CIF: letra de organización + 7 dígitos + dígito o letra de control.
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(codigo)) {
    const digitos = codigo.slice(1, 8);
    let pares = 0;
    let impares = 0;
    for (let i = 0; i < digitos.length; i += 1) {
      const digito = Number.parseInt(digitos[i], 10);
      if (i % 2 === 0) {
        const doble = digito * 2;
        impares += doble > 9 ? doble - 9 : doble;
      } else {
        pares += digito;
      }
    }
    const control = (10 - ((pares + impares) % 10)) % 10;
    const esperadoLetra = "JABCDEFGHI"[control];
    const recibido = codigo[8];
    return recibido === String(control) || recibido === esperadoLetra;
  }

  return false;
}

const identificadorFiscal = z
  .string()
  .trim()
  .min(1, "El NIF es obligatorio.")
  .transform((valor) => valor.toUpperCase().replace(/[\s-]/g, ""))
  .refine(esIdentificadorFiscalValido, "El NIF, NIE o CIF no es válido.");

/** `_id` de MongoDB en formato hexadecimal. */
export const esquemaObjectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Identificador no válido.");

/* ── Acceso ──────────────────────────────────────────────────────────── */

export const esquemaSolicitudEnlace = z.object({
  email: z.email("Escribe un correo electrónico válido.").trim().toLowerCase(),
  /** Ruta interna a la que volver tras entrar. Nunca una URL absoluta. */
  destino: z
    .string()
    .regex(/^\/[^/\\]?[^\s]*$/, "Destino no válido.")
    .optional(),
});
export type SolicitudEnlace = z.infer<typeof esquemaSolicitudEnlace>;

/* ── Clientes ────────────────────────────────────────────────────────── */

const textoOpcional = (maximo: number) =>
  z.string().trim().max(maximo, `Máximo ${maximo} caracteres.`).default("");

export const esquemaCliente = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "Máximo 120 caracteres."),
  nif: identificadorFiscal,
  email: z.union([z.literal(""), z.email("El correo no es válido.")]).default(""),
  telefono: textoOpcional(30),
  direccion: textoOpcional(160),
  ciudad: textoOpcional(80),
  codigoPostal: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{5}$/, "El código postal tiene 5 dígitos."),
    ])
    .default(""),
  pais: z.string().trim().max(60).default("España"),
  notas: textoOpcional(500),
});
export type EntradaCliente = z.infer<typeof esquemaCliente>;

/* ── Facturas ────────────────────────────────────────────────────────── */

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "La fecha no es válida.")
  .refine((valor) => !Number.isNaN(Date.parse(valor)), "La fecha no es válida.");

export const esquemaLineaFactura = z.object({
  descripcion: z
    .string()
    .trim()
    .min(1, "Describe el concepto.")
    .max(200, "Máximo 200 caracteres."),
  cantidadMilesimas: z
    .int("La cantidad debe ser un número entero de milésimas.")
    .positive("La cantidad debe ser mayor que cero.")
    .max(1_000_000_000),
  precioUnitarioCentimos: z
    .int("El precio debe expresarse en céntimos enteros.")
    .min(0, "El precio no puede ser negativo.")
    .max(100_000_000_000),
  ivaPorcentaje: z.union([
    z.literal(TIPOS_IVA[0]),
    z.literal(TIPOS_IVA[1]),
    z.literal(TIPOS_IVA[2]),
    z.literal(TIPOS_IVA[3]),
  ]),
});

export const esquemaFactura = z.object({
  clienteId: esquemaObjectId,
  serie: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,6}$/, "La serie son 1-6 letras o números en mayúscula.")
    .default("F"),
  fechaEmision: fechaIso,
  fechaVencimiento: fechaIso,
  lineas: z.array(esquemaLineaFactura).min(1, "Añade al menos una línea."),
  retencionIrpfPorcentaje: z
    .int("La retención debe ser un porcentaje entero.")
    .min(0, "La retención no puede ser negativa.")
    .max(100, "La retención no puede superar el 100 %."),
  estado: z.enum(ESTADOS_FACTURA).default("borrador"),
  notas: textoOpcional(1000),
});
export type EntradaFactura = z.infer<typeof esquemaFactura>;

export const esquemaCambioEstado = z.object({
  estado: z.enum(ESTADOS_FACTURA),
});

export const esquemaFiltroFacturas = z.object({
  estado: z.enum(ESTADOS_FACTURA).optional(),
  clienteId: esquemaObjectId.optional(),
  busqueda: z.string().trim().max(120).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(10),
});
