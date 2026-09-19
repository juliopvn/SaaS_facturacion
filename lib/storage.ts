/**
 * Almacenamiento de adjuntos sobre S3.
 *
 * Un único cliente `@aws-sdk/client-s3` sirve para RustFS en local y para
 * Cloudflare R2 en producción: cambia el endpoint y las credenciales, nunca el
 * código. El bucket se crea si no existe.
 */
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { configAlmacenamiento } from "@/lib/env";

const CACHE_CLIENTE = Symbol.for("saas-facturacion.s3");
const CACHE_BUCKET = Symbol.for("saas-facturacion.s3.bucket");

interface CacheGlobal {
  [CACHE_CLIENTE]?: S3Client;
  [CACHE_BUCKET]?: Promise<void>;
}

const global = globalThis as unknown as CacheGlobal;

export function obtenerClienteS3(): S3Client {
  if (!global[CACHE_CLIENTE]) {
    const config = configAlmacenamiento();
    global[CACHE_CLIENTE] = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forzarPathStyle,
      credentials: {
        accessKeyId: config.clave,
        secretAccessKey: config.secreto,
      },
    });
  }
  return global[CACHE_CLIENTE];
}

export function nombreBucket(): string {
  return configAlmacenamiento().bucket;
}

/** Crea el bucket la primera vez que se usa. Idempotente y cacheado por proceso. */
export function asegurarBucket(): Promise<void> {
  if (!global[CACHE_BUCKET]) {
    global[CACHE_BUCKET] = crearBucketSiNoExiste().catch((error: unknown) => {
      delete global[CACHE_BUCKET];
      throw error;
    });
  }
  return global[CACHE_BUCKET];
}

async function crearBucketSiNoExiste(): Promise<void> {
  const cliente = obtenerClienteS3();
  const Bucket = nombreBucket();
  try {
    await cliente.send(new HeadBucketCommand({ Bucket }));
  } catch {
    try {
      await cliente.send(new CreateBucketCommand({ Bucket }));
    } catch (error) {
      // Otra petición en paralelo pudo crearlo entre el Head y el Create.
      const codigo = (error as { name?: string }).name ?? "";
      if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists/.test(codigo)) throw error;
    }
  }
}

export interface ObjetoSubido {
  clave: string;
  tamanoBytes: number;
}

export async function subirObjeto(
  clave: string,
  contenido: Uint8Array,
  tipoMime: string,
): Promise<ObjetoSubido> {
  await asegurarBucket();
  await obtenerClienteS3().send(
    new PutObjectCommand({
      Bucket: nombreBucket(),
      Key: clave,
      Body: contenido,
      ContentType: tipoMime,
    }),
  );
  return { clave, tamanoBytes: contenido.byteLength };
}

/** URL temporal de descarga. Evita exponer el bucket públicamente. */
export async function urlFirmadaDescarga(
  clave: string,
  nombreArchivo: string,
  segundos = 300,
): Promise<string> {
  await asegurarBucket();
  return getSignedUrl(
    obtenerClienteS3(),
    new GetObjectCommand({
      Bucket: nombreBucket(),
      Key: clave,
      ResponseContentDisposition: `attachment; filename="${nombreArchivo.replace(/"/g, "")}"`,
    }),
    { expiresIn: segundos },
  );
}

export async function eliminarObjeto(clave: string): Promise<void> {
  await obtenerClienteS3().send(
    new DeleteObjectCommand({ Bucket: nombreBucket(), Key: clave }),
  );
}
