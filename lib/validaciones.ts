/**
 * Esquemas de entrada. Todo lo que llega de fuera (API routes, formularios,
 * seed) pasa por aquí antes de tocar la base de datos.
 */
import { z } from "zod";

import { ESTADOS_FACTURA, TIPOS_IVA } from "@/lib/types";

/* ── NIF ─────────────────────────────────────────────────────────────── */

export const MENSAJE_NIF = "El NIF debe tener 8 números y una letra.";

/**
 * Validación deliberadamente simple: 8 dígitos y una letra. No se comprueba la
 * letra de control ni se admiten NIE o CIF. Es una decisión de producto para un
 * proyecto personal; si algún día hiciera falta rigor fiscal, este es el único
 * sitio que habría que endurecer.
 */
export function esNifValido(valor: string): boolean {
  return /^\d{8}[A-Z]$/.test(valor.trim().toUpperCase().replace(/[\s-]/g, ""));
}

const nif = z
  .string()
  .trim()
  .min(1, "El NIF es obligatorio.")
  .transform((valor) => valor.toUpperCase().replace(/[\s-]/g, ""))
  .refine(esNifValido, MENSAJE_NIF);

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
  nif,
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
