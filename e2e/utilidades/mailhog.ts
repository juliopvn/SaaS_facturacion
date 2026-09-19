/**
 * Lectura del buzón de MailHog desde las pruebas.
 *
 * Las pruebas no abren la interfaz de MailHog: consultan su API HTTP y sacan
 * el enlace del cuerpo del correo. Así el test comprueba lo que de verdad
 * importa (que el enlace llega y funciona) sin depender de una UI ajena.
 */

const API = process.env.MAILHOG_API_URL ?? "http://localhost:8025";

interface MensajeMailhog {
  Content: {
    Headers: Record<string, string[]>;
    Body: string;
  };
  Raw: { Data: string };
}

interface ListadoMailhog {
  items: MensajeMailhog[];
}

/** Deshace el quoted-printable con que Nodemailer codifica el cuerpo. */
function decodificar(cuerpo: string): string {
  return cuerpo
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

export async function vaciarBuzon(): Promise<void> {
  const respuesta = await fetch(`${API}/api/v1/messages`, { method: "DELETE" });
  if (!respuesta.ok) {
    throw new Error(`MailHog no ha podido vaciar el buzón (${respuesta.status}).`);
  }
}

async function listarMensajes(): Promise<MensajeMailhog[]> {
  const respuesta = await fetch(`${API}/api/v2/messages?limit=50`);
  if (!respuesta.ok) {
    throw new Error(
      `MailHog no responde (${respuesta.status}). ¿Está levantado \`docker compose up\`?`,
    );
  }
  const datos = (await respuesta.json()) as ListadoMailhog;
  return datos.items;
}

/**
 * Espera al último correo dirigido a `email` y devuelve el enlace de acceso.
 * Reintenta porque el envío SMTP es asíncrono respecto a la respuesta HTTP.
 */
export async function esperarEnlaceAcceso(
  email: string,
  esperaMaximaMs = 15_000,
): Promise<string> {
  const limite = Date.now() + esperaMaximaMs;

  while (Date.now() < limite) {
    const mensajes = await listarMensajes();
    for (const mensaje of mensajes) {
      const destinatarios = mensaje.Content.Headers.To ?? [];
      if (!destinatarios.some((destino) => destino.includes(email))) continue;

      const cuerpo = decodificar(mensaje.Raw?.Data ?? mensaje.Content.Body);
      const enlace = cuerpo.match(
        /https?:\/\/[^\s"'<>]+\/api\/auth\/verificar\?token=[A-Za-z0-9_-]+/,
      );
      if (enlace) return enlace[0];
    }
    await new Promise((resolver) => setTimeout(resolver, 400));
  }

  throw new Error(`No ha llegado ningún enlace de acceso para ${email} en MailHog.`);
}
