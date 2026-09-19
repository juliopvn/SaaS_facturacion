"use client";

import { useState, type FormEvent } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo, Entrada } from "@/components/ui/Campo";
import type { RespuestaError } from "@/lib/types";

interface Propiedades {
  destino: string;
  /** Correo sugerido en local para que probar no cueste teclear. */
  emailSugerido?: string;
  mostrarPistaMailhog: boolean;
}

interface EnlaceEnviado {
  email: string;
  minutosValidez: number;
}

export function FormularioAcceso({
  destino,
  emailSugerido,
  mostrarPistaMailhog,
}: Propiedades) {
  const [email, setEmail] = useState(emailSugerido ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<EnlaceEnviado | null>(null);

  async function solicitar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch("/api/auth/enlace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, destino }),
      });
      const datos: unknown = await respuesta.json();

      if (!respuesta.ok) {
        const fallo = datos as RespuestaError;
        setError(fallo.detalles?.email ?? fallo.error);
        return;
      }

      const { minutosValidez } = datos as { minutosValidez: number };
      setEnviado({ email, minutosValidez });
    } catch {
      setError("No hemos podido conectar con el servidor. Inténtalo otra vez.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div data-prueba="enlace-enviado">
        <span
          aria-hidden
          className="sello-tampon text-sello inline-block"
          style={{ transform: "rotate(-4deg)" }}
        >
          Enviado
        </span>
        <h1 className="mt-6 text-[1.75rem] leading-tight font-bold">Mira tu correo</h1>
        <p className="text-tinta-media mt-3 leading-relaxed">
          Hemos enviado un enlace a{" "}
          <strong className="cifra text-tinta">{enviado.email}</strong>. Ábrelo desde este
          mismo navegador y entrarás directo al panel.
        </p>
        <p className="text-tinta-tenue mt-4 text-[0.875rem] leading-relaxed">
          El enlace caduca en {enviado.minutosValidez} minutos y solo funciona una vez.
        </p>

        {mostrarPistaMailhog ? (
          <Aviso className="mt-6">
            Entorno local: el correo no sale a internet. Ábrelo en{" "}
            <a
              href="http://localhost:8025"
              target="_blank"
              rel="noreferrer"
              className="cifra text-sello font-semibold underline underline-offset-2"
            >
              localhost:8025
            </a>
            .
          </Aviso>
        ) : null}

        <button
          type="button"
          onClick={() => setEnviado(null)}
          className="text-tinta-media decoration-regla-fuerte hover:text-sello mt-6 text-[0.875rem] underline underline-offset-4 transition-colors"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={solicitar} noValidate>
      <p className="rotulo">Acceso</p>
      <h1 className="mt-4 text-[1.75rem] leading-tight font-bold">
        Entra sin contraseña
      </h1>
      <p className="text-tinta-media mt-3 leading-relaxed">
        Escribe tu correo y te mandamos un enlace de un solo uso. Si es la primera vez, te
        creamos la cuenta al abrirlo.
      </p>

      <Campo
        etiqueta="Correo electrónico"
        htmlFor="email"
        error={error ?? undefined}
        className="mt-7"
      >
        <Entrada
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@estudio.com"
          value={email}
          error={Boolean(error)}
          onChange={(evento) => setEmail(evento.target.value)}
        />
      </Campo>

      <Boton type="submit" disabled={enviando} className="mt-5 w-full">
        {enviando ? "Enviando el enlace…" : "Enviarme el enlace"}
      </Boton>
    </form>
  );
}
