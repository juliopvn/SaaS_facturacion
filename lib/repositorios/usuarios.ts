/** Acceso a la colección de usuarios. */
import { ObjectId } from "mongodb";

import { coleccionUsuarios } from "@/lib/db";
import type { DatosEmisor, DocumentoUsuario, Usuario } from "@/lib/types";

/** Emisor en blanco: el usuario lo completa desde el panel. */
export function emisorVacio(email: string): DatosEmisor {
  return {
    nombre: email.split("@")[0],
    nif: "",
    direccion: "",
    ciudad: "",
    codigoPostal: "",
    pais: "España",
  };
}

export function serializarUsuario(documento: DocumentoUsuario): Usuario {
  return {
    id: documento._id.toHexString(),
    email: documento.email,
    emisor: documento.emisor,
    creadoEn: documento.creadoEn.toISOString(),
    ultimoAccesoEn: documento.ultimoAccesoEn?.toISOString() ?? null,
  };
}

/**
 * Registro implícito: el primer acceso con un correo crea la cuenta. Es lo que
 * hace que el magic link sea a la vez alta y login.
 */
export async function buscarOCrearUsuario(email: string): Promise<DocumentoUsuario> {
  const usuarios = await coleccionUsuarios();
  const ahora = new Date();

  const resultado = await usuarios.findOneAndUpdate(
    { email },
    {
      $set: { ultimoAccesoEn: ahora },
      $setOnInsert: {
        email,
        emisor: emisorVacio(email),
        creadoEn: ahora,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!resultado) {
    throw new Error(`No se ha podido crear el usuario ${email}.`);
  }
  return resultado;
}

export async function obtenerUsuarioPorId(id: string): Promise<DocumentoUsuario | null> {
  if (!ObjectId.isValid(id)) return null;
  const usuarios = await coleccionUsuarios();
  return usuarios.findOne({ _id: new ObjectId(id) });
}

export async function obtenerUsuarioPorEmail(
  email: string,
): Promise<DocumentoUsuario | null> {
  const usuarios = await coleccionUsuarios();
  return usuarios.findOne({ email });
}

export async function actualizarEmisor(
  usuarioId: ObjectId,
  emisor: DatosEmisor,
): Promise<Usuario> {
  const usuarios = await coleccionUsuarios();
  const resultado = await usuarios.findOneAndUpdate(
    { _id: usuarioId },
    { $set: { emisor } },
    { returnDocument: "after" },
  );
  if (!resultado) {
    throw new Error("El usuario ya no existe.");
  }
  return serializarUsuario(resultado);
}
