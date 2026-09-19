/**
 * Envío de correo con una única interfaz para toda la aplicación.
 *
 * El proveedor es configuración, no código: `EMAIL_PROVIDER=mailhog` usa SMTP
 * contra el MailHog de Docker y `EMAIL_PROVIDER=resend` usa la API de Resend.
 * El resto del proyecto solo conoce `enviarEmail`.
 */
import nodemailer, { type Transporter } from "nodemailer";

import { configApp, configEmail } from "@/lib/env";

export interface MensajeEmail {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export class ErrorEnvioEmail extends Error {
  constructor(
    mensaje: string,
    readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorEnvioEmail";
  }
}

const CACHE = Symbol.for("saas-facturacion.smtp");

interface CacheGlobal {
  [CACHE]?: Transporter;
}

const global = globalThis as unknown as CacheGlobal;

function transporteSmtp(): Transporter {
  if (!global[CACHE]) {
    const { smtpHost, smtpPuerto } = configEmail();
    global[CACHE] = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPuerto,
      // MailHog no usa TLS ni credenciales: es un buzón de desarrollo.
      secure: false,
      ignoreTLS: true,
    });
  }
  return global[CACHE];
}

async function enviarPorSmtp(mensaje: MensajeEmail): Promise<void> {
  const { remitente } = configEmail();
  await transporteSmtp().sendMail({
    from: remitente,
    to: mensaje.para,
    subject: mensaje.asunto,
    text: mensaje.texto,
    html: mensaje.html,
  });
}

async function enviarPorResend(mensaje: MensajeEmail): Promise<void> {
  const { remitente, resendApiKey } = configEmail();
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remitente,
      to: [mensaje.para],
      subject: mensaje.asunto,
      html: mensaje.html,
      text: mensaje.texto,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new ErrorEnvioEmail(
      `Resend rechazó el envío (${respuesta.status}): ${detalle.slice(0, 300)}`,
    );
  }
}

export async function enviarEmail(mensaje: MensajeEmail): Promise<void> {
  const { proveedor } = configEmail();
  try {
    if (proveedor === "resend") {
      await enviarPorResend(mensaje);
    } else {
      await enviarPorSmtp(mensaje);
    }
  } catch (error) {
    if (error instanceof ErrorEnvioEmail) throw error;
    throw new ErrorEnvioEmail("No se ha podido enviar el correo.", error);
  }
}

/* ── Plantilla del enlace de acceso ──────────────────────────────────── */

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function enviarEnlaceAcceso(para: string, enlace: string): Promise<void> {
  const { minutosValidezEnlace } = configApp();
  const enlaceSeguro = escaparHtml(enlace);

  const texto = [
    "Tu enlace para entrar en Talonario",
    "",
    enlace,
    "",
    `El enlace caduca en ${minutosValidezEnlace} minutos y solo funciona una vez.`,
    "Si no lo has pedido tú, puedes ignorar este correo.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#EDEAE3;font-family:'Helvetica Neue',Arial,sans-serif;color:#1B1E2B;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FBFAF7;border:1px solid #1B1E2B;">
      <tr>
        <td style="padding:28px 32px;border-bottom:1px solid #D9D4C9;">
          <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6B6558;">Talonario · Facturación</div>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;letter-spacing:-0.02em;">Tu enlace de acceso</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
            Pulsa el botón para entrar en tu panel. No hay contraseña que recordar.
          </p>
          <a href="${enlaceSeguro}"
             style="display:inline-block;padding:14px 24px;background:#1B1E2B;color:#FBFAF7;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.01em;">
            Entrar en Talonario
          </a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6B6558;">
            El enlace caduca en ${minutosValidezEnlace} minutos y solo funciona una vez.
            Si no lo has pedido tú, ignora este correo.
          </p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8C8577;word-break:break-all;">
            ¿No funciona el botón? Copia esta dirección:<br />${enlaceSeguro}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await enviarEmail({
    para,
    asunto: "Tu enlace para entrar en Talonario",
    html,
    texto,
  });
}
