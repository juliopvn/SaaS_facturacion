/**
 * Tipos del dominio. Única fuente de verdad: ningún módulo declara sus propias
 * interfaces de negocio ni usa `any`.
 *
 * Convención de nombres:
 *  - `Documento*`  → forma exacta con la que vive en MongoDB (usa `ObjectId`, `Date`).
 *  - Sin prefijo   → forma serializable que viaja a Client Components y respuestas API
 *                    (identificadores como `string`, fechas ISO 8601).
 *
 * Convención de dinero: TODO importe es un entero de céntimos (`*Centimos`).
 * Las cantidades llevan tres decimales implícitos (`*Milesimas`: 1,5 uds → 1500).
 * La división entre 100 (o 1000) ocurre solo en `lib/formato.ts`, capa de presentación.
 */
import type { ObjectId } from "mongodb";

/* ── Usuarios y sesión ───────────────────────────────────────────────── */

/** Datos fiscales del emisor que se imprimen en la cabecera de la factura. */
export interface DatosEmisor {
  nombre: string;
  nif: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  pais: string;
}

export interface DocumentoUsuario {
  _id: ObjectId;
  email: string;
  emisor: DatosEmisor;
  creadoEn: Date;
  ultimoAccesoEn: Date | null;
}

export interface Usuario {
  id: string;
  email: string;
  emisor: DatosEmisor;
  creadoEn: string;
  ultimoAccesoEn: string | null;
}

/** Token de un solo uso del magic link. Se guarda hasheado, nunca en claro. */
export interface DocumentoTokenAcceso {
  _id: ObjectId;
  email: string;
  tokenHash: string;
  expiraEn: Date;
  usadoEn: Date | null;
  creadoEn: Date;
  /** Ruta interna a la que volver tras verificar, p. ej. `/panel/facturas`. */
  destino: string;
}

/** Contenido firmado de la cookie de sesión. */
export interface SesionUsuario {
  usuarioId: string;
  email: string;
  /** Emisión y expiración en segundos epoch. */
  emitidaEn: number;
  expiraEn: number;
}

/* ── Clientes ────────────────────────────────────────────────────────── */

export interface DatosCliente {
  nombre: string;
  nif: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  pais: string;
  notas: string;
}

export interface DocumentoCliente extends DatosCliente {
  _id: ObjectId;
  usuarioId: ObjectId;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Cliente extends DatosCliente {
  id: string;
  creadoEn: string;
  actualizadoEn: string;
}

/** Cliente del listado, con los agregados que necesita la tabla. */
export interface ClienteConResumen extends Cliente {
  facturasEmitidas: number;
  facturadoCentimos: number;
}

/* ── Facturas ────────────────────────────────────────────────────────── */

/** Tipos de IVA vigentes en España. */
export const TIPOS_IVA = [0, 4, 10, 21] as const;
export type TipoIva = (typeof TIPOS_IVA)[number];

export const ESTADOS_FACTURA = ["borrador", "emitida", "pagada", "anulada"] as const;
export type EstadoFactura = (typeof ESTADOS_FACTURA)[number];

export interface LineaFactura {
  descripcion: string;
  /** Unidades × 1000. 1,5 uds → 1500. Entero. */
  cantidadMilesimas: number;
  /** Precio por unidad en céntimos. Entero. */
  precioUnitarioCentimos: number;
  ivaPorcentaje: TipoIva;
}

/** Línea con su base imponible ya calculada, lista para render. */
export interface LineaFacturaCalculada extends LineaFactura {
  baseCentimos: number;
  cuotaIvaCentimos: number;
}

/** Una fila del desglose de IVA: un tipo impositivo agrupa varias líneas. */
export interface DesgloseIva {
  ivaPorcentaje: TipoIva;
  baseCentimos: number;
  cuotaCentimos: number;
}

export interface TotalesFactura {
  baseImponibleCentimos: number;
  desgloseIva: DesgloseIva[];
  cuotaIvaCentimos: number;
  retencionIrpfCentimos: number;
  totalCentimos: number;
}

/** Copia inmutable de los datos del cliente en el momento de emitir. */
export interface ClienteFacturado {
  clienteId: string;
  nombre: string;
  nif: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  pais: string;
}

export interface Adjunto {
  id: string;
  nombre: string;
  /** Clave del objeto en el bucket S3. */
  clave: string;
  tipoMime: string;
  tamanoBytes: number;
  subidoEn: string;
}

export interface DocumentoFactura {
  _id: ObjectId;
  usuarioId: ObjectId;
  clienteId: ObjectId;
  numero: string;
  serie: string;
  ejercicio: number;
  secuencia: number;
  estado: EstadoFactura;
  cliente: ClienteFacturado;
  lineas: LineaFactura[];
  /** Retención de IRPF aplicada sobre la base imponible, en porcentaje entero. */
  retencionIrpfPorcentaje: number;
  totales: TotalesFactura;
  fechaEmision: Date;
  fechaVencimiento: Date;
  notas: string;
  adjuntos: Adjunto[];
  creadaEn: Date;
  actualizadaEn: Date;
}

export interface Factura {
  id: string;
  clienteId: string;
  numero: string;
  serie: string;
  ejercicio: number;
  secuencia: number;
  estado: EstadoFactura;
  cliente: ClienteFacturado;
  lineas: LineaFactura[];
  retencionIrpfPorcentaje: number;
  totales: TotalesFactura;
  fechaEmision: string;
  fechaVencimiento: string;
  notas: string;
  adjuntos: Adjunto[];
  creadaEn: string;
  actualizadaEn: string;
}

/** Contador atómico de numeración por usuario, serie y ejercicio. */
export interface DocumentoContador {
  _id: string;
  secuencia: number;
}

/* ── Consultas ───────────────────────────────────────────────────────── */

export interface FiltroFacturas {
  estado?: EstadoFactura;
  clienteId?: string;
  busqueda?: string;
  pagina: number;
  porPagina: number;
}

export interface PaginaFacturas {
  facturas: Factura[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/** Cifras del panel de inicio, todas en céntimos. */
export interface ResumenPanel {
  facturadoCentimos: number;
  cobradoCentimos: number;
  pendienteCentimos: number;
  ivaRepercutidoCentimos: number;
  totalFacturas: number;
  totalClientes: number;
  borradores: number;
  vencidas: number;
}

/* ── Contrato de las API routes ──────────────────────────────────────── */

/** Toda respuesta de error de la API tiene exactamente esta forma. */
export interface RespuestaError {
  error: string;
  /** Errores por campo cuando falla la validación del formulario. */
  detalles?: Record<string, string>;
}

/* ── Preferencias de interfaz (GlobalContext) ────────────────────────── */

export const TEMAS = ["claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

export interface Preferencias {
  tema: Tema;
  /** Filas por página en los listados del panel. */
  filasPorPagina: number;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  tema: "claro",
  filasPorPagina: 10,
};
