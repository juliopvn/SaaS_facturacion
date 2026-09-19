/**
 * Lectura tipada de la configuración. Ningún módulo lee `process.env` por su
 * cuenta: así el fallo por una variable ausente es un error claro y temprano,
 * y `.env.example` documenta exactamente lo que se consume aquí.
 *
 * Todo se lee de forma perezosa (dentro de funciones) para que importar un
 * módulo en el build no exija tener el entorno completo.
 */

export class ErrorConfiguracion extends Error {
  constructor(variable: string) {
    super(
      `Falta la variable de entorno ${variable}. Copia .env.example a .env.local y rellénala.`,
    );
    this.name = "ErrorConfiguracion";
  }
}

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === "") {
    throw new ErrorConfiguracion(nombre);
  }
  return valor.trim();
}

function opcional(nombre: string, porDefecto: string): string {
  const valor = process.env[nombre];
  return valor === undefined || valor.trim() === "" ? porDefecto : valor.trim();
}

function entero(nombre: string, porDefecto: number): number {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === "") return porDefecto;
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero)) {
    throw new Error(`La variable ${nombre} debe ser un número entero.`);
  }
  return numero;
}

export const PROVEEDORES_EMAIL = ["mailhog", "resend"] as const;
export type ProveedorEmail = (typeof PROVEEDORES_EMAIL)[number];

export interface ConfigMongo {
  uri: string;
  baseDeDatos: string;
}

export interface ConfigAlmacenamiento {
  endpoint: string;
  region: string;
  clave: string;
  secreto: string;
  bucket: string;
  /** RustFS y MinIO exigen path-style; R2 y S3 admiten ambos. */
  forzarPathStyle: boolean;
}

export interface ConfigEmail {
  proveedor: ProveedorEmail;
  remitente: string;
  smtpHost: string;
  smtpPuerto: number;
  resendApiKey: string;
}

export interface ConfigApp {
  urlBase: string;
  secretoSesion: string;
  /** Minutos de validez del enlace mágico. */
  minutosValidezEnlace: number;
  /** Días de validez de la cookie de sesión. */
  diasSesion: number;
}

export function configMongo(): ConfigMongo {
  return {
    uri: requerido("MONGODB_URI"),
    baseDeDatos: opcional("MONGODB_DB", "saas_facturacion"),
  };
}

export function configAlmacenamiento(): ConfigAlmacenamiento {
  return {
    endpoint: requerido("AWS_URL"),
    region: opcional("AWS_REGION", "us-east-1"),
    clave: requerido("AWS_USERNAME"),
    secreto: requerido("AWS_PASSWORD"),
    bucket: opcional("AWS_BUCKET", "facturacion"),
    forzarPathStyle: opcional("AWS_FORCE_PATH_STYLE", "true") !== "false",
  };
}

export function configEmail(): ConfigEmail {
  const proveedor = opcional("EMAIL_PROVIDER", "mailhog");
  if (!PROVEEDORES_EMAIL.includes(proveedor as ProveedorEmail)) {
    throw new Error(`EMAIL_PROVIDER debe ser uno de: ${PROVEEDORES_EMAIL.join(", ")}.`);
  }
  return {
    proveedor: proveedor as ProveedorEmail,
    remitente: opcional("EMAIL_FROM", "Facturación <facturas@localhost>"),
    smtpHost: opcional("MAILHOG_HOST", "localhost"),
    smtpPuerto: entero("MAILHOG_PORT", 1025),
    resendApiKey: proveedor === "resend" ? requerido("RESEND_API_KEY") : "",
  };
}

/**
 * Correo de la cuenta demo. Solo se usa para rellenar el formulario de acceso
 * en local; en producción no hay cuenta demo y devuelve `undefined`.
 */
export function emailDemoSugerido(): string | undefined {
  const valor = process.env.DEMO_EMAIL;
  return valor === undefined || valor.trim() === "" ? undefined : valor.trim();
}

export function configApp(): ConfigApp {
  return {
    urlBase: opcional("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
    secretoSesion: requerido("SESSION_SECRET"),
    minutosValidezEnlace: entero("MAGIC_LINK_TTL_MINUTOS", 15),
    diasSesion: entero("SESSION_TTL_DIAS", 7),
  };
}
