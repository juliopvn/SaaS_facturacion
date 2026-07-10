# 🧾 SaaS de Facturación — Next.js + MongoDB

## 🎯 Objetivo del proyecto

Construir un **SaaS de facturación**: cada usuario gestiona sus clientes y emite facturas desde un panel privado, con autenticación por magic link.

Con este proyecto el alumno aprende:

- A modelar un dominio de negocio real (clientes, facturas, líneas de factura, IVA, totales).
- **Autenticación passwordless** con magic link enviado por email.
- A manejar **dinero en céntimos** (enteros) para evitar los errores de coma flotante.
- A integrar storage S3 (RustFS) para PDFs y adjuntos, y MailHog para el correo de desarrollo.

## 🏗️ Arquitectura

```
┌────────────┐          ┌───────────────────┐         ┌──────────┐
│  Next.js   │ ───────► │   API Routes      │ ──────► │ MongoDB  │
│  (panel +  │          │   (facturas,      │         │ saas_    │
│   landing) │          │    clientes...)   │         │facturacion│
└────────────┘          └─────┬──────┬──────┘         └──────────┘
                              │      │
                   Nodemailer ▼      ▼ @aws-sdk/client-s3
                       ┌──────────┐  ┌──────────────┐
                       │ MailHog  │  │ RustFS (S3)  │
                       │  :1025   │  │   :9001      │
                       └──────────┘  └──────────────┘
```

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS 4 (landing hecha con la skill `frontend-design`) |
| Base de datos | MongoDB driver nativo — singleton en `lib/db.ts` |
| Email | Nodemailer → MailHog (Docker) |
| Storage | RustFS S3-compatible (Docker) — el bucket se crea si no existe |
| Estado global | `GlobalContext` de React (usuario autenticado, preferencias) |
| Protección de rutas | `proxy.ts` (sustituto de `middleware.ts` en Next.js 16) |

## ⚙️ Funcionalidades

- **Landing page** profesional pública.
- **Login con magic link**: sin contraseñas; el enlace llega por email (visible en MailHog).
- **Gestión de clientes** del usuario.
- **Emisión de facturas** con líneas, IVA y totales calculados en céntimos.
- **Listado y detalle** de facturas por usuario.

## 💡 Solución

1. **Todo el dinero en céntimos**: las cantidades se almacenan y operan como enteros; solo al renderizar se dividen entre 100 y se formatean. Regla obligatoria del proyecto.
2. **Magic link**: se genera un token de un solo uso, se envía por email vía Nodemailer y al verificarlo se crea la sesión. MailHog intercepta el correo en desarrollo.
3. **Singleton de MongoDB** en `lib/db.ts`: ninguna ruta crea su propio `MongoClient`.
4. **Server Components** leen MongoDB directamente; los **Client Components** llaman a las API routes — separación estricta para aprovechar el App Router.
5. Las rutas API devuelven `{ error: string }` con el código HTTP apropiado en caso de fallo, y no hay tipos `any`: las interfaces viven en `lib/types.ts`.

## 🚀 Cómo ejecutar

1. Arranca MongoDB local, MailHog y RustFS en Docker.
2. Crea `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=saas_facturacion

AWS_USERNAME=rustfsadmin
AWS_PASSWORD=rustfsadmin
AWS_REGION=us-east-1
AWS_URL=http://localhost:9001

MAILHOG_HOST=localhost
MAILHOG_PORT=1025
```

3. Instala, siembra y arranca:

```bash
npm install
npx tsx scripts/seed.ts
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) y recoge el magic link en [http://localhost:8025](http://localhost:8025).
