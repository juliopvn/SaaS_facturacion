/** POST /api/auth/enlace — pide un enlace mágico de acceso. */
import { NextResponse } from "next/server";

import { ErrorHttp, leerCuerpo, rutaSegura } from "@/lib/api";
import { configApp } from "@/lib/env";
import { consumir } from "@/lib/limitador";
import { enviarEnlaceAcceso } from "@/lib/mailer";
import { emitirTokenAcceso } from "@/lib/repositorios/acceso";
import { esquemaSolicitudEnlace } from "@/lib/validaciones";

interface RespuestaEnlace {
  enviado: true;
  /** Para que la interfaz pueda decir «caduca en 15 minutos». */
  minutosValidez: number;
}

export function POST(peticion: Request) {
  return rutaSegura<RespuestaEnlace>(async () => {
    const { email, destino } = await leerCuerpo(peticion, esquemaSolicitudEnlace);

    const limite = consumir(`enlace:${email}`, 10, 300);
    if (!limite.permitido) {
      throw new ErrorHttp(
        429,
        `Has pedido demasiados enlaces. Prueba otra vez en ${limite.segundosEspera} segundos.`,
      );
    }

    const { urlBase, minutosValidezEnlace } = configApp();
    const { token } = await emitirTokenAcceso(email, destino ?? "/panel");

    const enlace = new URL("/api/auth/verificar", urlBase);
    enlace.searchParams.set("token", token);
    await enviarEnlaceAcceso(email, enlace.toString());

    return NextResponse.json<RespuestaEnlace>({
      enviado: true,
      minutosValidez: minutosValidezEnlace,
    });
  });
}
