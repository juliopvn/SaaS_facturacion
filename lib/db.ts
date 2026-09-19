/**
 * Singleton del cliente de MongoDB.
 *
 * Regla del proyecto: ninguna ruta, repositorio ni script crea su propio
 * `MongoClient`. En desarrollo la conexión se guarda en `globalThis` para que
 * el hot reload de Next no abra un pool nuevo en cada recarga.
 */
import { MongoClient, type Collection, type Db, type Document } from "mongodb";

import { configMongo } from "@/lib/env";
import type {
  DocumentoCliente,
  DocumentoContador,
  DocumentoFactura,
  DocumentoTokenAcceso,
  DocumentoUsuario,
} from "@/lib/types";

const CACHE = Symbol.for("saas-facturacion.mongo");

interface CacheGlobal {
  [CACHE]?: Promise<MongoClient>;
}

const global = globalThis as unknown as CacheGlobal;

function conectar(): Promise<MongoClient> {
  const { uri } = configMongo();
  return new MongoClient(uri, {
    appName: "saas-facturacion",
    // Falla rápido en local si Docker no está levantado, en vez de colgar la petición.
    serverSelectionTimeoutMS: 5_000,
    retryWrites: true,
  }).connect();
}

/** Cliente conectado y compartido por todo el proceso. */
export function obtenerCliente(): Promise<MongoClient> {
  if (!global[CACHE]) {
    global[CACHE] = conectar().catch((error: unknown) => {
      // Sin esto una caída puntual dejaría cacheada una promesa rechazada para siempre.
      delete global[CACHE];
      throw error;
    });
  }
  return global[CACHE];
}

export async function obtenerBaseDeDatos(): Promise<Db> {
  const cliente = await obtenerCliente();
  return cliente.db(configMongo().baseDeDatos);
}

async function coleccion<T extends Document>(nombre: string): Promise<Collection<T>> {
  const db = await obtenerBaseDeDatos();
  return db.collection<T>(nombre);
}

export const NOMBRES_COLECCIONES = {
  usuarios: "usuarios",
  tokensAcceso: "tokens_acceso",
  clientes: "clientes",
  facturas: "facturas",
  contadores: "contadores",
} as const;

export const coleccionUsuarios = (): Promise<Collection<DocumentoUsuario>> =>
  coleccion<DocumentoUsuario>(NOMBRES_COLECCIONES.usuarios);

export const coleccionTokensAcceso = (): Promise<Collection<DocumentoTokenAcceso>> =>
  coleccion<DocumentoTokenAcceso>(NOMBRES_COLECCIONES.tokensAcceso);

export const coleccionClientes = (): Promise<Collection<DocumentoCliente>> =>
  coleccion<DocumentoCliente>(NOMBRES_COLECCIONES.clientes);

export const coleccionFacturas = (): Promise<Collection<DocumentoFactura>> =>
  coleccion<DocumentoFactura>(NOMBRES_COLECCIONES.facturas);

export const coleccionContadores = (): Promise<Collection<DocumentoContador>> =>
  coleccion<DocumentoContador>(NOMBRES_COLECCIONES.contadores);

/**
 * Índices de la base. Es idempotente: `createIndex` no hace nada si el índice
 * ya existe. Lo invocan el seed y el arranque en desarrollo.
 */
export async function asegurarIndices(): Promise<void> {
  const [usuarios, tokens, clientes, facturas] = await Promise.all([
    coleccionUsuarios(),
    coleccionTokensAcceso(),
    coleccionClientes(),
    coleccionFacturas(),
  ]);

  await Promise.all([
    usuarios.createIndex({ email: 1 }, { unique: true }),
    tokens.createIndex({ tokenHash: 1 }, { unique: true }),
    // TTL: MongoDB borra solo los tokens caducados.
    tokens.createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0 }),
    clientes.createIndex({ usuarioId: 1, nombre: 1 }),
    clientes.createIndex({ usuarioId: 1, nif: 1 }, { unique: true }),
    facturas.createIndex({ usuarioId: 1, fechaEmision: -1 }),
    facturas.createIndex({ usuarioId: 1, numero: 1 }, { unique: true }),
    facturas.createIndex({ usuarioId: 1, clienteId: 1 }),
    facturas.createIndex({ usuarioId: 1, estado: 1 }),
  ]);
}

/** Cierra el pool. Solo para scripts de un solo uso (seed, migraciones). */
export async function cerrarConexion(): Promise<void> {
  const pendiente = global[CACHE];
  if (!pendiente) return;
  delete global[CACHE];
  const cliente = await pendiente;
  await cliente.close();
}
