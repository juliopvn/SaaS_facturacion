/**
 * Acceso a la colección de facturas.
 *
 * Invariante de multitenencia: toda consulta lleva `usuarioId` en el filtro.
 * Invariante de dinero: los totales se recalculan aquí con `lib/dinero.ts` a
 * partir de las líneas; nunca se aceptan los que envíe el cliente.
 */
import { ObjectId, type Filter } from "mongodb";

import { ErrorHttp, noEncontrado } from "@/lib/api";
import { coleccionClientes, coleccionContadores, coleccionFacturas } from "@/lib/db";
import { calcularTotales } from "@/lib/dinero";
import { instantaneaCliente } from "@/lib/repositorios/clientes";
import type {
  Adjunto,
  DocumentoFactura,
  EstadoFactura,
  Factura,
  FiltroFacturas,
  PaginaFacturas,
  ResumenPanel,
} from "@/lib/types";
import type { EntradaFactura } from "@/lib/validaciones";

export function serializarFactura(documento: DocumentoFactura): Factura {
  return {
    id: documento._id.toHexString(),
    clienteId: documento.clienteId.toHexString(),
    numero: documento.numero,
    serie: documento.serie,
    ejercicio: documento.ejercicio,
    secuencia: documento.secuencia,
    estado: documento.estado,
    cliente: documento.cliente,
    lineas: documento.lineas,
    retencionIrpfPorcentaje: documento.retencionIrpfPorcentaje,
    totales: documento.totales,
    fechaEmision: documento.fechaEmision.toISOString(),
    fechaVencimiento: documento.fechaVencimiento.toISOString(),
    notas: documento.notas,
    adjuntos: documento.adjuntos,
    creadaEn: documento.creadaEn.toISOString(),
    actualizadaEn: documento.actualizadaEn.toISOString(),
  };
}

function filtroPropio(usuarioId: ObjectId, facturaId: string): Filter<DocumentoFactura> {
  if (!ObjectId.isValid(facturaId)) throw noEncontrado("esa factura");
  return { _id: new ObjectId(facturaId), usuarioId };
}

/* ── Numeración ──────────────────────────────────────────────────────── */

/**
 * Siguiente número de la serie, reservado de forma atómica con `$inc`.
 * Dos facturas creadas a la vez no pueden recibir el mismo número.
 */
async function reservarSecuencia(
  usuarioId: ObjectId,
  serie: string,
  ejercicio: number,
): Promise<number> {
  const contadores = await coleccionContadores();
  const resultado = await contadores.findOneAndUpdate(
    { _id: `${usuarioId.toHexString()}:${serie}:${ejercicio}` },
    { $inc: { secuencia: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!resultado) throw new Error("No se ha podido reservar el número de factura.");
  return resultado.secuencia;
}

export function componerNumero(
  serie: string,
  ejercicio: number,
  secuencia: number,
): string {
  return `${serie}-${ejercicio}-${String(secuencia).padStart(4, "0")}`;
}

/* ── Escritura ───────────────────────────────────────────────────────── */

async function clientePropio(usuarioId: ObjectId, clienteId: string) {
  const clientes = await coleccionClientes();
  const cliente = await clientes.findOne({
    _id: new ObjectId(clienteId),
    usuarioId,
  });
  if (!cliente) {
    throw new ErrorHttp(422, "Ese cliente no existe en tu cuenta.", {
      clienteId: "Elige un cliente de tu lista.",
    });
  }
  return cliente;
}

export async function crearFactura(
  usuarioId: ObjectId,
  entrada: EntradaFactura,
): Promise<Factura> {
  const cliente = await clientePropio(usuarioId, entrada.clienteId);
  const fechaEmision = new Date(entrada.fechaEmision);
  const fechaVencimiento = new Date(entrada.fechaVencimiento);
  if (fechaVencimiento < fechaEmision) {
    throw new ErrorHttp(422, "Revisa los datos del formulario.", {
      fechaVencimiento: "El vencimiento no puede ser anterior a la emisión.",
    });
  }

  const ejercicio = fechaEmision.getUTCFullYear();
  const secuencia = await reservarSecuencia(usuarioId, entrada.serie, ejercicio);
  const ahora = new Date();

  const documento: DocumentoFactura = {
    _id: new ObjectId(),
    usuarioId,
    clienteId: cliente._id,
    numero: componerNumero(entrada.serie, ejercicio, secuencia),
    serie: entrada.serie,
    ejercicio,
    secuencia,
    estado: entrada.estado,
    cliente: instantaneaCliente(cliente),
    lineas: entrada.lineas,
    retencionIrpfPorcentaje: entrada.retencionIrpfPorcentaje,
    totales: calcularTotales(entrada.lineas, entrada.retencionIrpfPorcentaje),
    fechaEmision,
    fechaVencimiento,
    notas: entrada.notas,
    adjuntos: [],
    creadaEn: ahora,
    actualizadaEn: ahora,
  };

  const facturas = await coleccionFacturas();
  await facturas.insertOne(documento);
  return serializarFactura(documento);
}

/** Solo se edita un borrador: una factura emitida es un documento cerrado. */
export async function actualizarFactura(
  usuarioId: ObjectId,
  facturaId: string,
  entrada: EntradaFactura,
): Promise<Factura> {
  const actual = await obtenerFacturaDocumento(usuarioId, facturaId);
  if (actual.estado !== "borrador") {
    throw new ErrorHttp(
      409,
      "Solo puedes editar una factura en borrador. Anúlala y emite una nueva.",
    );
  }

  const cliente = await clientePropio(usuarioId, entrada.clienteId);
  const fechaEmision = new Date(entrada.fechaEmision);
  const fechaVencimiento = new Date(entrada.fechaVencimiento);
  if (fechaVencimiento < fechaEmision) {
    throw new ErrorHttp(422, "Revisa los datos del formulario.", {
      fechaVencimiento: "El vencimiento no puede ser anterior a la emisión.",
    });
  }

  const facturas = await coleccionFacturas();
  const resultado = await facturas.findOneAndUpdate(
    filtroPropio(usuarioId, facturaId),
    {
      $set: {
        clienteId: cliente._id,
        cliente: instantaneaCliente(cliente),
        lineas: entrada.lineas,
        retencionIrpfPorcentaje: entrada.retencionIrpfPorcentaje,
        totales: calcularTotales(entrada.lineas, entrada.retencionIrpfPorcentaje),
        fechaEmision,
        fechaVencimiento,
        estado: entrada.estado,
        notas: entrada.notas,
        actualizadaEn: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  if (!resultado) throw noEncontrado("esa factura");
  return serializarFactura(resultado);
}

const TRANSICIONES: Record<EstadoFactura, readonly EstadoFactura[]> = {
  borrador: ["emitida", "anulada"],
  emitida: ["pagada", "anulada"],
  pagada: ["anulada"],
  anulada: [],
};

export async function cambiarEstadoFactura(
  usuarioId: ObjectId,
  facturaId: string,
  estado: EstadoFactura,
): Promise<Factura> {
  const actual = await obtenerFacturaDocumento(usuarioId, facturaId);
  if (actual.estado === estado) return serializarFactura(actual);
  if (!TRANSICIONES[actual.estado].includes(estado)) {
    throw new ErrorHttp(409, `Una factura ${actual.estado} no puede pasar a ${estado}.`);
  }

  const facturas = await coleccionFacturas();
  const resultado = await facturas.findOneAndUpdate(
    filtroPropio(usuarioId, facturaId),
    { $set: { estado, actualizadaEn: new Date() } },
    { returnDocument: "after" },
  );
  if (!resultado) throw noEncontrado("esa factura");
  return serializarFactura(resultado);
}

export async function eliminarFactura(
  usuarioId: ObjectId,
  facturaId: string,
): Promise<void> {
  const actual = await obtenerFacturaDocumento(usuarioId, facturaId);
  if (actual.estado !== "borrador") {
    throw new ErrorHttp(
      409,
      "Solo se borran los borradores. Una factura emitida se anula, no se elimina.",
    );
  }
  const facturas = await coleccionFacturas();
  await facturas.deleteOne(filtroPropio(usuarioId, facturaId));
}

/* ── Lectura ─────────────────────────────────────────────────────────── */

export async function obtenerFacturaDocumento(
  usuarioId: ObjectId,
  facturaId: string,
): Promise<DocumentoFactura> {
  const facturas = await coleccionFacturas();
  const documento = await facturas.findOne(filtroPropio(usuarioId, facturaId));
  if (!documento) throw noEncontrado("esa factura");
  return documento;
}

export async function obtenerFactura(
  usuarioId: ObjectId,
  facturaId: string,
): Promise<Factura> {
  return serializarFactura(await obtenerFacturaDocumento(usuarioId, facturaId));
}

export async function listarFacturas(
  usuarioId: ObjectId,
  filtro: FiltroFacturas,
): Promise<PaginaFacturas> {
  const facturas = await coleccionFacturas();
  const consulta: Filter<DocumentoFactura> = { usuarioId };

  if (filtro.estado) consulta.estado = filtro.estado;
  if (filtro.clienteId && ObjectId.isValid(filtro.clienteId)) {
    consulta.clienteId = new ObjectId(filtro.clienteId);
  }
  if (filtro.busqueda) {
    const patron = new RegExp(
      filtro.busqueda.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    consulta.$or = [{ numero: patron }, { "cliente.nombre": patron }];
  }

  const porPagina = Math.min(Math.max(filtro.porPagina, 1), 100);
  const pagina = Math.max(filtro.pagina, 1);

  const [documentos, total] = await Promise.all([
    facturas
      .find(consulta)
      .sort({ fechaEmision: -1, secuencia: -1 })
      .skip((pagina - 1) * porPagina)
      .limit(porPagina)
      .toArray(),
    facturas.countDocuments(consulta),
  ]);

  return {
    facturas: documentos.map(serializarFactura),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

/** Cifras de cabecera del panel. Todo en céntimos, agregado en la base. */
export async function obtenerResumenPanel(usuarioId: ObjectId): Promise<ResumenPanel> {
  const [facturas, clientes] = await Promise.all([
    coleccionFacturas(),
    coleccionClientes(),
  ]);
  const ahora = new Date();

  const [agregado] = await facturas
    .aggregate<{
      facturadoCentimos: number;
      cobradoCentimos: number;
      pendienteCentimos: number;
      ivaRepercutidoCentimos: number;
      totalFacturas: number;
      borradores: number;
      vencidas: number;
    }>([
      { $match: { usuarioId } },
      {
        $group: {
          _id: null,
          totalFacturas: { $sum: 1 },
          facturadoCentimos: {
            $sum: {
              $cond: [
                { $in: ["$estado", ["emitida", "pagada"]] },
                "$totales.totalCentimos",
                0,
              ],
            },
          },
          cobradoCentimos: {
            $sum: {
              $cond: [{ $eq: ["$estado", "pagada"] }, "$totales.totalCentimos", 0],
            },
          },
          pendienteCentimos: {
            $sum: {
              $cond: [{ $eq: ["$estado", "emitida"] }, "$totales.totalCentimos", 0],
            },
          },
          ivaRepercutidoCentimos: {
            $sum: {
              $cond: [
                { $in: ["$estado", ["emitida", "pagada"]] },
                "$totales.cuotaIvaCentimos",
                0,
              ],
            },
          },
          borradores: {
            $sum: { $cond: [{ $eq: ["$estado", "borrador"] }, 1, 0] },
          },
          vencidas: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$estado", "emitida"] },
                    { $lt: ["$fechaVencimiento", ahora] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const totalClientes = await clientes.countDocuments({ usuarioId });

  return {
    facturadoCentimos: agregado?.facturadoCentimos ?? 0,
    cobradoCentimos: agregado?.cobradoCentimos ?? 0,
    pendienteCentimos: agregado?.pendienteCentimos ?? 0,
    ivaRepercutidoCentimos: agregado?.ivaRepercutidoCentimos ?? 0,
    totalFacturas: agregado?.totalFacturas ?? 0,
    borradores: agregado?.borradores ?? 0,
    vencidas: agregado?.vencidas ?? 0,
    totalClientes,
  };
}

/* ── Adjuntos ────────────────────────────────────────────────────────── */

export async function anadirAdjunto(
  usuarioId: ObjectId,
  facturaId: string,
  adjunto: Adjunto,
): Promise<Factura> {
  const facturas = await coleccionFacturas();
  const resultado = await facturas.findOneAndUpdate(
    filtroPropio(usuarioId, facturaId),
    { $push: { adjuntos: adjunto }, $set: { actualizadaEn: new Date() } },
    { returnDocument: "after" },
  );
  if (!resultado) throw noEncontrado("esa factura");
  return serializarFactura(resultado);
}

export async function quitarAdjunto(
  usuarioId: ObjectId,
  facturaId: string,
  adjuntoId: string,
): Promise<{ factura: Factura; clave: string }> {
  const documento = await obtenerFacturaDocumento(usuarioId, facturaId);
  const adjunto = documento.adjuntos.find((candidato) => candidato.id === adjuntoId);
  if (!adjunto) throw noEncontrado("ese adjunto");

  const facturas = await coleccionFacturas();
  const resultado = await facturas.findOneAndUpdate(
    filtroPropio(usuarioId, facturaId),
    { $pull: { adjuntos: { id: adjuntoId } }, $set: { actualizadaEn: new Date() } },
    { returnDocument: "after" },
  );
  if (!resultado) throw noEncontrado("esa factura");
  return { factura: serializarFactura(resultado), clave: adjunto.clave };
}
