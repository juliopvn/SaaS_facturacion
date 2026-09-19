/**
 * Acceso a la colección de clientes.
 *
 * Invariante de multitenencia: toda consulta lleva `usuarioId` en el filtro.
 * Nunca se busca un cliente solo por su `_id`.
 */
import { ObjectId, type Filter } from "mongodb";

import { ErrorHttp, noEncontrado } from "@/lib/api";
import { coleccionClientes, coleccionFacturas } from "@/lib/db";
import type {
  Cliente,
  ClienteConResumen,
  DocumentoCliente,
  ClienteFacturado,
} from "@/lib/types";
import type { EntradaCliente } from "@/lib/validaciones";

export function serializarCliente(documento: DocumentoCliente): Cliente {
  return {
    id: documento._id.toHexString(),
    nombre: documento.nombre,
    nif: documento.nif,
    email: documento.email,
    telefono: documento.telefono,
    direccion: documento.direccion,
    ciudad: documento.ciudad,
    codigoPostal: documento.codigoPostal,
    pais: documento.pais,
    notas: documento.notas,
    creadoEn: documento.creadoEn.toISOString(),
    actualizadoEn: documento.actualizadoEn.toISOString(),
  };
}

/** Copia de los datos fiscales que queda congelada dentro de la factura. */
export function instantaneaCliente(documento: DocumentoCliente): ClienteFacturado {
  return {
    clienteId: documento._id.toHexString(),
    nombre: documento.nombre,
    nif: documento.nif,
    direccion: documento.direccion,
    ciudad: documento.ciudad,
    codigoPostal: documento.codigoPostal,
    pais: documento.pais,
  };
}

function filtroPropio(usuarioId: ObjectId, clienteId: string): Filter<DocumentoCliente> {
  if (!ObjectId.isValid(clienteId)) {
    throw noEncontrado("ese cliente");
  }
  return { _id: new ObjectId(clienteId), usuarioId };
}

export async function listarClientes(usuarioId: ObjectId): Promise<Cliente[]> {
  const clientes = await coleccionClientes();
  const documentos = await clientes.find({ usuarioId }).sort({ nombre: 1 }).toArray();
  return documentos.map(serializarCliente);
}

/** Listado con el agregado de facturación que muestra la tabla del panel. */
export async function listarClientesConResumen(
  usuarioId: ObjectId,
): Promise<ClienteConResumen[]> {
  const clientes = await coleccionClientes();
  const documentos = await clientes
    .aggregate<
      DocumentoCliente & { facturasEmitidas: number; facturadoCentimos: number }
    >([
      { $match: { usuarioId } },
      {
        $lookup: {
          from: "facturas",
          let: { clienteId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$clienteId", "$$clienteId"] },
                    { $ne: ["$estado", "anulada"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                facturasEmitidas: { $sum: 1 },
                facturadoCentimos: { $sum: "$totales.totalCentimos" },
              },
            },
          ],
          as: "resumen",
        },
      },
      {
        $addFields: {
          facturasEmitidas: {
            $ifNull: [{ $first: "$resumen.facturasEmitidas" }, 0],
          },
          facturadoCentimos: {
            $ifNull: [{ $first: "$resumen.facturadoCentimos" }, 0],
          },
        },
      },
      { $project: { resumen: 0 } },
      { $sort: { nombre: 1 } },
    ])
    .toArray();

  return documentos.map((documento) => ({
    ...serializarCliente(documento),
    facturasEmitidas: documento.facturasEmitidas,
    facturadoCentimos: documento.facturadoCentimos,
  }));
}

export async function obtenerClienteDocumento(
  usuarioId: ObjectId,
  clienteId: string,
): Promise<DocumentoCliente> {
  const clientes = await coleccionClientes();
  const documento = await clientes.findOne(filtroPropio(usuarioId, clienteId));
  if (!documento) throw noEncontrado("ese cliente");
  return documento;
}

export async function obtenerCliente(
  usuarioId: ObjectId,
  clienteId: string,
): Promise<Cliente> {
  return serializarCliente(await obtenerClienteDocumento(usuarioId, clienteId));
}

function conflictoNif(): ErrorHttp {
  return new ErrorHttp(409, "Ya tienes un cliente con ese NIF.", {
    nif: "Ya tienes un cliente con ese NIF.",
  });
}

function esDuplicado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function crearCliente(
  usuarioId: ObjectId,
  datos: EntradaCliente,
): Promise<Cliente> {
  const clientes = await coleccionClientes();
  const ahora = new Date();
  const documento: DocumentoCliente = {
    _id: new ObjectId(),
    usuarioId,
    ...datos,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  try {
    await clientes.insertOne(documento);
  } catch (error) {
    if (esDuplicado(error)) throw conflictoNif();
    throw error;
  }
  return serializarCliente(documento);
}

export async function actualizarCliente(
  usuarioId: ObjectId,
  clienteId: string,
  datos: EntradaCliente,
): Promise<Cliente> {
  const clientes = await coleccionClientes();
  try {
    const resultado = await clientes.findOneAndUpdate(
      filtroPropio(usuarioId, clienteId),
      { $set: { ...datos, actualizadoEn: new Date() } },
      { returnDocument: "after" },
    );
    if (!resultado) throw noEncontrado("ese cliente");
    return serializarCliente(resultado);
  } catch (error) {
    if (esDuplicado(error)) throw conflictoNif();
    throw error;
  }
}

/** Un cliente con facturas no se borra: rompería la trazabilidad contable. */
export async function eliminarCliente(
  usuarioId: ObjectId,
  clienteId: string,
): Promise<void> {
  const filtro = filtroPropio(usuarioId, clienteId);
  const facturas = await coleccionFacturas();
  const emitidas = await facturas.countDocuments({
    usuarioId,
    clienteId: new ObjectId(clienteId),
  });
  if (emitidas > 0) {
    throw new ErrorHttp(
      409,
      `Este cliente tiene ${emitidas} factura${emitidas === 1 ? "" : "s"}. Anula o elimina sus facturas antes de borrarlo.`,
    );
  }

  const clientes = await coleccionClientes();
  const resultado = await clientes.deleteOne(filtro);
  if (resultado.deletedCount === 0) throw noEncontrado("ese cliente");
}
