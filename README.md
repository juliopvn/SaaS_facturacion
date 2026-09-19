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

## 🌍 Despliegue en producción

**URL pública:** <https://facturacion.jpavon-tech.com>

### Arquitectura de producción

```
                    ┌──────────────────────────────┐
  Navegador ──────► │ Cloudflare DNS (solo DNS)    │
                    │ facturacion.jpavon-tech.com  │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ Vercel · Next.js 16          │
                    │ landing + panel + API routes │
                    └───────┬───────────┬──────────┘
                            │           │
              ┌─────────────┼───────────┼─────────────┐
              ▼             ▼           ▼             │
        MongoDB Atlas   Cloudflare R2   Resend        │
        (datos)         (adjuntos, S3)  (magic link)  │
                                        mail.jpavon-tech.com
```

| Pieza | Servicio | Notas |
|-------|----------|-------|
| Hosting | **Vercel** | Despliega desde el repositorio de GitHub importado. |
| Base de datos | **MongoDB Atlas** | Base `saas_facturacion`, usuario con permisos `readWrite` solo sobre ella. |
| Adjuntos | **Cloudflare R2** | Mismo SDK que RustFS (`@aws-sdk/client-s3`). Los adjuntos se descargan con URLs firmadas temporales: el bucket no necesita acceso público. |
| Correo | **Resend** | Dominio `mail.jpavon-tech.com` verificado (SPF, DKIM). |
| Dominio | **Cloudflare** | Registro CNAME hacia Vercel en modo *DNS only* (sin proxy) para que Vercel emita el SSL. |

Local y producción ejecutan **el mismo código**: solo cambian las variables de entorno. `lib/storage.ts` y
`lib/mailer.ts` eligen proveedor por configuración (`AWS_URL`, `EMAIL_PROVIDER`…), no por ramas de código.
Los nombres exactos y su equivalente local están en [`.env.example`](.env.example). Los valores reales viven
solo en Vercel (entorno *Production*) y nunca en el repositorio.

Para producción hay que definir a mano `EMAIL_PROVIDER=resend` y `RESEND_API_KEY`, y generar un
`SESSION_SECRET` distinto del local: `.env.example` trae valores de desarrollo.

### Cómo llega un cambio a producción

```
git push ──► GitLab (origen) ──► pipeline de GitLab CI (calidad)
                  │
                  └─ push mirror nativo ──► GitHub ──► Vercel despliega
```

1. **GitLab es el origen.** Ahí se entrega el proyecto y ahí corre el pipeline (`.gitlab-ci.yml`).
2. **GitLab replica a GitHub** con su *push mirror* nativo (Settings → Repository → Mirroring repositories).
3. **Vercel** está conectado al repositorio de GitHub y despliega solo cuando el mirror lo actualiza.

El pipeline tiene seis jobs: `lint`, `typecheck`, `formato`, `test:unit`, `test:e2e` y `build`.
El job E2E levanta MongoDB, MailHog y RustFS como procesos (`scripts/ci-servicios.sh`), siembra la base
y ejecuta las 15 pruebas de Playwright contra la aplicación real.

> **Límite conocido de esta configuración (Opción B).** El mirror nativo replica cada push **sin esperar al
> resultado del pipeline**, y replica todas las ramas. Por eso el pipeline no puede, por sí solo, impedir
> que un commit roto llegue a GitHub y a Vercel: solo lo hace de forma indirecta, si se trabaja con
> *merge requests* y se exige que su pipeline pase antes de mergear.
>
> Para que un MR con un test roto no pueda mergearse, activa en GitLab
> **Settings → Merge requests → Merge checks → “Pipelines must succeed”**. Un push directo a `main`
> (permitido a Maintainers) se salta esa barrera. Si algún día se necesita un control estricto, la
> alternativa es desactivar el mirror nativo y hacer el `git push` a GitHub desde una etapa final del
> pipeline que solo corra si todo lo anterior pasó (Opción A).

### Configuración del runner de CI

- El runner activo de la instancia (`cloudrun-ephemeral`) exige la etiqueta `cloudrun`, que va en
  `default.tags`. Sin ella los jobs se quedan en `pending` indefinidamente.
- Usa el *executor* `shell`: **`image:` y `services:` se ignoran** y no hay Docker. Por eso el job E2E
  arranca los servicios con `scripts/ci-servicios.sh` en lugar de usar `services:`.
- La caché no se comparte entre jobs y `node_modules` es demasiado grande para pasarlo como artefacto
  (el coordinador responde `413`), así que cada job ejecuta su propio `npm ci`.
- El runner define sus propias `RUSTFS_ACCESS_KEY` y `RUSTFS_SECRET_KEY`. El script las sobrescribe con
  las credenciales del job para que servidor y cliente coincidan.

### Verificar el despliegue

Smoke test contra la URL pública. Solo cubre lo que **no escribe datos**: la landing y la protección de
rutas (`proxy.ts` y el `401` de la API).

```bash
BASE_URL=https://facturacion.jpavon-tech.com npm run test:e2e:prod
```

Los flujos que escriben (alta de cliente, factura, adjuntos) y el login real **no se automatizan contra
producción**: el enlace mágico llega por Resend a un buzón real, no a MailHog, y no debe contaminarse la
base de datos de producción con datos de prueba. Se comprueban a mano con una cuenta de pruebas.

<!-- BEGIN cc:que-se-valora -->
¡Hola! Aquí te explico qué miraremos con lupa cuando corrijamos tu proyecto de "SaaS Facturación".

## 📋 Qué se valora

En primer lugar, lo que más pesa es que tu aplicación funcione como se espera y cumpla con todo lo que te pedimos en el enunciado. También es muy importante que tu código esté bien escrito y organizado, y que la demo en vídeo muestre claramente lo que has hecho. Por último, aunque con un peso menor, nos fijaremos en cómo has documentado tus decisiones y el proyecto en general.

Recuerda que el detalle del enunciado es lo que manda, y la evaluación no penalizará por cosas que no se pidieron explícitamente.
<!-- END cc:que-se-valora -->
