# Prompt de implementación por fases — SaaS de Facturación (Next.js + MongoDB)

## 0. Rol e instrucciones de ejecución para el agente

Eres un agente de ingeniería de software autónomo. Vas a construir un SaaS de facturación completo siguiendo el plan por fases descrito abajo, en orden, sin saltarte fases.

Reglas de ejecución:

1. Trabaja fase por fase. Al terminar cada fase, verifica sus criterios de aceptación antes de pasar a la siguiente.
2. No implementes nada del **Bloque 2 (Producción)** hasta que todas las fases del **Bloque 1 (Local)** cumplan sus criterios de aceptación, incluyendo que las pruebas E2E locales pasen en verde.
3. Si te falta una decisión que no puedes tomar por tu cuenta (nombre exacto de un recurso, credenciales, acceso a una cuenta, confirmación de que algo ya existe), detente y pregunta explícitamente al usuario antes de continuar esa fase. No inventes valores para credenciales o IDs de recursos reales.
4. No crees un `README.md` nuevo — ya existe uno en el repositorio. Solo lo actualizarás en la fase final de producción, añadiendo la sección de despliegue.
5. Sí debes crear `AGENTS.md`, `.env.example`, los seeds de datos y la suite de E2E tal como se describe abajo.
6. Todo el código en TypeScript estricto, sin usar `any` en ningún punto.
7. Antes de dar por cerrada cualquier fase que toque dinero, verifica explícitamente que los cálculos se hacen en céntimos (enteros) y que la división entre 100 ocurre únicamente en la capa de presentación.

---

## 1. Resumen del proyecto

Un SaaS de facturación donde cada usuario gestiona sus propios clientes y emite sus propias facturas desde un panel privado, con autenticación sin contraseña (magic link).

### Arquitectura

```
Next.js (panel + landing)
        │
        ▼
API Routes (facturas, clientes, ...)
        │
   ┌────┴─────┐
   ▼          ▼
Nodemailer   @aws-sdk/client-s3
   │              │
   ▼              ▼
MailHog :1025   RustFS (S3) :9001

Next.js/API Routes ──► MongoDB (saas_facturacion)
```

### Stack

| Capa                | Tecnología                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| Frontend            | Next.js 16 + TypeScript + Tailwind CSS 4 (landing hecha con la skill `frontend-design`) |
| Base de datos       | MongoDB, driver nativo — singleton en `lib/db.ts`                                       |
| Email               | Nodemailer → MailHog (Docker, solo local)                                               |
| Storage             | RustFS S3-compatible (Docker, solo local) — el bucket se crea si no existe              |
| Estado global       | `GlobalContext` de React (usuario autenticado, preferencias)                            |
| Protección de rutas | `proxy.ts` (sustituto de `middleware.ts` en Next.js 16)                                 |

### Funcionalidades

- Landing page profesional pública.
- Login con magic link: sin contraseñas; el enlace llega por email (visible en MailHog en local).
- Gestión de clientes del usuario.
- Emisión de facturas con líneas, IVA y totales calculados en céntimos.
- Listado y detalle de facturas por usuario.

### Reglas de solución (obligatorias, no negociables)

1. **Todo el dinero en céntimos**: las cantidades se almacenan y operan como enteros; solo al renderizar se dividen entre 100 y se formatean.
2. **Magic link**: token de un solo uso, se envía por email vía Nodemailer y al verificarlo se crea la sesión. En local, MailHog intercepta el correo.
3. **Singleton de MongoDB** en `lib/db.ts`: ninguna ruta crea su propio `MongoClient`.
4. **Server Components** leen MongoDB directamente; los **Client Components** llaman a las API routes — separación estricta para aprovechar el App Router.
5. Las rutas API devuelven `{ error: string }` con el código HTTP apropiado en caso de fallo, y no hay tipos `any`; las interfaces viven en `lib/types.ts`.

---

## 2. Decisiones de producción ya tomadas (no volver a preguntar)

- **Repositorio / CI**: el repositorio de origen es **GitLab** (ahí se entrega el proyecto). GitLab hace **mirroring hacia una cuenta de GitHub**, y ese repo de GitHub es el que está importado en **Vercel**. El pipeline de CI/CD debe correr en **GitLab CI** (`.gitlab-ci.yml`); el despliegue real lo dispara Vercel de forma nativa cuando el mirror actualiza el repo de GitHub (ver detalle en la Fase 7 de Producción sobre cómo _gatear_ ese mirror con el resultado del pipeline).
- **Storage de producción**: **Cloudflare R2** (S3-compatible, mismo SDK `@aws-sdk/client-s3` que RustFS, solo cambian endpoint/credenciales).
- **Dominio de la app**: subdominio dedicado sobre `jpavon-tech.com`, gestionado en Cloudflare. Nombre de referencia: `facturacion.jpavon-tech.com` (confirmar el nombre exacto con el usuario antes de crear el registro DNS si prefiere otro).
- **Dominio de envío de email (Resend)**: `mail.jpavon-tech.com`.
- **Base de datos de producción**: MongoDB Atlas (el usuario ya tiene cuenta).
- **Hosting**: Vercel (el usuario ya tiene cuenta).

---

## BLOQUE 1 — LOCAL (debe servir al 100% antes de tocar producción)

### Fase 0 — Scaffolding e infraestructura local

- Inicializar Next.js 16 + TypeScript + Tailwind CSS 4.
- `docker-compose.yml` con tres servicios: `mongo`, `mailhog`, `rustfs` (RustFS S3-compatible), con los puertos y credenciales que se documentarán en `.env.example`.
- Crear `lib/db.ts` con el singleton de `MongoClient`.
- Crear `lib/types.ts` con las interfaces base (Usuario, Cliente, Factura, LineaFactura, etc.) sin `any`.
- Crear `proxy.ts` como esqueleto de protección de rutas.

**Criterio de aceptación**: `docker compose up` levanta los tres servicios; `npm run dev` arranca sin errores contra ellos.

### Fase 1 — Autenticación con magic link

- Generación de token de un solo uso con expiración.
- Envío del enlace por email vía Nodemailer → MailHog.
- Endpoint de verificación de token que crea la sesión (cookie `httpOnly`).
- `proxy.ts` protegiendo las rutas privadas del panel.
- `GlobalContext` con el usuario autenticado y preferencias.

**Criterio de aceptación**: un usuario puede pedir el magic link, recogerlo en `localhost:8025` (MailHog), entrar y ver el panel protegido; sin sesión, `proxy.ts` redirige al login.

### Fase 2 — Gestión de clientes

- CRUD de clientes, siempre acotado (`scoped`) al usuario autenticado.
- API routes para mutaciones desde Client Components; Server Components leyendo Mongo directo para listados/detalle.

**Criterio de aceptación**: un usuario solo ve y edita sus propios clientes; nunca los de otro usuario.

### Fase 3 — Emisión, listado y detalle de facturas

- Modelo de factura con líneas, cálculo de IVA y totales, **todo en céntimos** (enteros).
- Formulario de emisión con validación de líneas.
- Listado de facturas por usuario (con filtros/paginación básicos) y vista de detalle.
- Si aplica, subida de adjuntos/PDF a RustFS (creación automática del bucket si no existe).

**Criterio de aceptación**: crear una factura con varias líneas produce el IVA y el total correctos en céntimos, y se renderiza correctamente formateado (dividido entre 100) en listado y detalle.

### Fase 4 — Landing page

- Landing pública profesional, usando la skill `frontend-design`.

**Criterio de aceptación**: la landing es responsive y enlaza correctamente al flujo de login.

### Fase 5 — Seeds de datos

- Crear `scripts/seed.ts`.
- Debe poblar: al menos un usuario demo, varios clientes demo y varias facturas demo cubriendo distintos escenarios (factura con una línea, factura con múltiples líneas, distintos IVAs, importes grandes y pequeños en céntimos).
- El script debe ser **idempotente**: correrlo varias veces no debe duplicar datos (usar upserts o limpiar antes de sembrar).
- Documentar el comando (`npm run seed` o `npx tsx scripts/seed.ts`).

**Criterio de aceptación**: correr el seed dos veces seguidas dejar la base en el mismo estado consistente.

### Fase 6 — Planeación y construcción de E2E testing (local)

- Framework recomendado: **Playwright** (integra bien con Next.js y permite interceptar/consultar MailHog vía su API HTTP para leer el magic link automáticamente).
- Configurar `playwright.config.ts` apuntando a `http://localhost:3000`, con un `globalSetup` que levante o valide que `docker compose` ya está arriba y corra el seed antes de la suite.
- Para obtener el magic link en los tests, consultar la API de MailHog (`GET http://localhost:8025/api/v2/messages`) y extraer el enlace del cuerpo del último correo enviado al usuario de prueba, en vez de leer la UI de MailHog.
- Casos de prueba mínimos a implementar:
  1. La landing carga y el CTA lleva al login.
  2. Flujo completo de magic link: solicitar enlace → recogerlo de MailHog → verificar → ver el panel.
  3. Alta de un cliente nuevo y verificación de que aparece en el listado.
  4. Alta de una factura con varias líneas y verificación de que el IVA y el total mostrados son correctos.
  5. Listado y detalle de facturas: entrar al detalle desde el listado y verificar que los datos coinciden.
  6. Acceso a una ruta protegida sin sesión → debe redirigir al login (verifica `proxy.ts`).
- Añadir script `npm run test:e2e`.
- Añadir a `.env.example` cualquier variable extra que necesiten los tests (por ejemplo, credenciales del usuario demo si no vienen ya del seed).

**Criterio de aceptación**: `npm run test:e2e` corre en verde de forma reproducible contra el entorno local recién sembrado.

### Fase 7 — `.env.example`

- Crear/ajustar `.env.example` en la raíz con **todas** las variables usadas en local, comentadas por bloque:
  - Mongo: `MONGODB_URI`, `MONGODB_DB`
  - Storage (RustFS en local): `AWS_USERNAME`, `AWS_PASSWORD`, `AWS_REGION`, `AWS_URL`
  - Email (MailHog en local): `MAILHOG_HOST`, `MAILHOG_PORT`
  - Sesión/auth: variable de secreto para firmar tokens/sesión (ej. `SESSION_SECRET`), URL base de la app (ej. `APP_URL=http://localhost:3000`)
  - Cualquier variable adicional que hayan introducido las fases anteriores.
- Dejar también, comentadas como referencia (no activas), las variables equivalentes que se usarán en producción (Atlas, R2, Resend) para que quien lea el archivo entienda el mapeo — ver Fase 3 de Producción para los nombres exactos.

**Criterio de aceptación**: un desarrollador nuevo puede copiar `.env.example` a `.env.local`, rellenar los valores locales y levantar el proyecto sin adivinar ninguna variable.

### Fase 8 — `AGENTS.md`

Crear `AGENTS.md` en la raíz, dirigido a futuros agentes/desarrolladores que trabajen en el repo. Debe incluir:

- Comandos esenciales: `docker compose up/down`, `npm install`, `npx tsx scripts/seed.ts`, `npm run dev`, `npm run test:e2e`, lint/typecheck si existen.
- Arquitectura y convenciones obligatorias (resumen de la sección "Reglas de solución" de este documento): dinero en céntimos, singleton de Mongo, separación Server/Client Components, formato de error de las API routes, prohibición de `any`, ubicación de tipos en `lib/types.ts`, rol de `proxy.ts`.
- Cómo correr y depurar localmente (incluyendo cómo revisar los correos en MailHog y los archivos en RustFS).
- Estructura de carpetas del proyecto.
- Convenciones para futuras fases (ej. dónde añadir nuevas API routes, cómo añadir nuevos tipos, cómo extender los seeds y los E2E cuando se añada una funcionalidad nueva).
- Nota explícita: no crear `README.md` (ya existe); las novedades de producto/uso van en `README.md`, las convenciones de desarrollo/agente van en `AGENTS.md`.

**Criterio de aceptación**: `AGENTS.md` permite a un agente nuevo, sin más contexto, levantar el entorno local y entender las reglas del proyecto.

### Checklist final del Bloque 1 (debe cumplirse antes de pasar a producción)

- [ ] `docker compose up` levanta Mongo, MailHog y RustFS sin errores.
- [ ] `.env.example` está completo y actualizado.
- [ ] El seed puebla datos de demo de forma idempotente.
- [ ] Las 5 funcionalidades del resumen funcionan manualmente de punta a punta.
- [ ] `npm run test:e2e` pasa en verde de forma reproducible.
- [ ] `AGENTS.md` está creado y refleja el estado real del proyecto.
- [ ] No se ha creado ningún `README.md` nuevo.

---

## BLOQUE 2 — PRODUCCIÓN

No empezar este bloque hasta que el checklist del Bloque 1 esté completo.

### Fase 0 — Confirmar prerequisitos antes de tocar producción

Antes de ejecutar nada de este bloque, confirma explícitamente con el usuario:

- Que el repo de GitLab ya existe y tiene configurado el mirroring hacia GitHub (o pide ayuda para configurarlo si no).
- Que el repo de GitHub (destino del mirror) ya está importado en Vercel, o si hay que importarlo.
- Que el clúster de MongoDB Atlas ya existe (o hay que crearlo) y a qué tier/región.
- El nombre exacto del subdominio final para la app si el usuario quiere cambiar `facturacion.jpavon-tech.com`.
- Acceso/permisos para crear registros DNS en Cloudflare, crear el bucket en R2 y verificar el dominio en Resend.

### Fase 1 — Abstraer los proveedores externos (storage y email)

Antes de cambiar nada de infraestructura, refactoriza el código para que el proveedor sea solo configuración:

- `lib/storage.ts`: cliente único de `@aws-sdk/client-s3` que lea endpoint/credenciales de variables de entorno, de forma que apuntar a RustFS (local) o a Cloudflare R2 (producción) sea solo cuestión de qué `.env` está activo. No debe haber lógica distinta según el proveedor.
- `lib/mailer.ts`: interfaz única de envío de email; en local usa Nodemailer contra MailHog, en producción usa la API/SMTP de Resend, seleccionado por variable de entorno (ej. `EMAIL_PROVIDER=mailhog|resend`).

**Criterio de aceptación**: cambiar únicamente variables de entorno permite alternar entre entorno local y de producción sin tocar código de negocio.

### Fase 2 — Base de datos: MongoDB Atlas

- Crear (o usar) el clúster de Atlas, la base `saas_facturacion` (o el nombre que ya use el proyecto) y un usuario de base de datos con permisos mínimos necesarios.
- Configurar el acceso de red: dado que Vercel usa IPs dinámicas, decidir entre (a) permitir acceso desde `0.0.0.0/0` protegido por usuario/contraseña fuertes y conexión TLS, o (b) usar la integración nativa Atlas ↔ Vercel si el plan de Atlas la soporta. Confirmar con el usuario cuál prefiere.
- Definir `MONGODB_URI` y `MONGODB_DB` de producción como variables de entorno en Vercel (nunca committeadas).

### Fase 3 — Storage de producción: Cloudflare R2

- Crear el bucket en R2 para adjuntos/PDFs de facturas.
- Generar credenciales de acceso (Access Key/Secret) con permisos limitados al bucket.
- Definir las variables equivalentes a las de RustFS pero apuntando a R2 (mismo esquema de `lib/storage.ts`): endpoint de R2, región, bucket, access key, secret key.
- Confirmar si se necesita servir los adjuntos públicamente (URLs firmadas o bucket público) y configurar CORS si el frontend accede directo al bucket.

### Fase 4 — Email de producción: Resend

- Verificar el dominio `mail.jpavon-tech.com` en Resend (añadir en Cloudflare los registros DNS que pida Resend: SPF, DKIM, y DMARC si se recomienda).
- Configurar el remitente (ej. `facturas@mail.jpavon-tech.com`).
- Definir `RESEND_API_KEY` y el remitente como variables de entorno en Vercel.
- Verificar manualmente el envío de un magic link real usando este dominio antes de dar la fase por cerrada.

### Fase 5 — Dominio en Cloudflare + Vercel

- En Vercel, añadir el dominio `facturacion.jpavon-tech.com` (o el nombre final confirmado) al proyecto.
- En Cloudflare, crear el registro DNS que Vercel indique (normalmente `CNAME` hacia `cname.vercel-dns.com`, o el que Vercel provea) para ese subdominio.
- Confirmar el estado del proxy de Cloudflare (naranja/nube activada vs DNS-only) según lo que Vercel requiera para emitir el certificado SSL correctamente.
- Verificar que el certificado SSL se emite y el dominio resuelve correctamente hacia la app.

### Fase 6 — Variables de entorno y primer despliegue en Vercel

- Cargar en Vercel (entorno Production) todas las variables definidas en las fases 2–4, más `APP_URL` apuntando al dominio final y el secreto de sesión.
- Hacer un primer despliegue manual de verificación desde el repo de GitHub importado.
- Verificar manualmente en el dominio de producción: landing, login por magic link (correo real vía Resend), alta de cliente, alta de factura, listado y detalle.

### Fase 7 — Pipeline de CI/CD (GitLab CI → mirror a GitHub → deploy en Vercel)

Ten en cuenta el flujo particular de este proyecto: **GitLab es el origen**, hace **mirror hacia GitHub**, y **Vercel despliega desde GitHub**. El pipeline de calidad vive en GitLab; el despliegue lo dispara Vercel de forma nativa al detectar cambios en GitHub. Para que el pipeline realmente _gatee_ lo que llega a producción (y no que el mirror empuje código a GitHub sin haber pasado los tests), hay dos opciones — plantéalas y confirma con el usuario cuál prefiere:

- **Opción A (recomendada): mirror controlado desde el pipeline.** En vez de usar el "push mirror" automático nativo de GitLab (que replica cada push sin esperar al resultado del pipeline), definir en `.gitlab-ci.yml` una etapa final `mirror-to-github` que solo se ejecute si las etapas anteriores (lint, typecheck, tests unitarios, E2E) pasaron, y que haga `git push` autenticado hacia el remoto de GitHub. Así, código que falla el pipeline nunca llega a GitHub ni dispara un deploy en Vercel.
- **Opción B (más simple, menos estricta): dejar el push mirror nativo de GitLab tal cual**, y usar el pipeline de GitLab solo como gate informativo/bloqueante de merge requests (protección de rama en GitLab), asumiendo que solo se mergea a la rama que se mirrorea cuando el pipeline ya pasó en el MR.

Etapas sugeridas en `.gitlab-ci.yml`:

1. `install` — cache de dependencias.
2. `lint` — ESLint/TypeScript.
3. `typecheck` — `tsc --noEmit`.
4. `test:unit` — si existen pruebas unitarias.
5. `test:e2e` — levantar los servicios necesarios (Mongo, MailHog, RustFS o mocks) como _services_ del runner o vía `docker compose` dentro del job, correr el seed, y ejecutar `npm run test:e2e`.
6. `build` — `next build` para detectar errores de build antes de mergear.
7. (solo en la rama principal, y solo si todo lo anterior pasó) `mirror-to-github` si se elige la Opción A.

Variables/secrets necesarios en GitLab CI (como CI/CD variables protegidas): credenciales de un remoto de GitHub con permiso de push (token de acceso personal o deploy key), y cualquier variable de entorno que necesiten los tests E2E en el runner.

**Criterio de aceptación**: un merge request con un test roto no debe poder llegar a producción; un merge a la rama principal con todo en verde sí debe terminar desplegado en la URL pública de Vercel.

### Fase 8 — Smoke test / E2E contra producción

- Reutilizar la suite de Playwright de la Fase 6 del Bloque 1, con una configuración separada (`playwright.prod.config.ts` o variable de entorno `BASE_URL`) apuntando a la URL pública.
- Usar una **cuenta de prueba dedicada** en producción (no datos reales) para no contaminar datos de clientes reales.
- Limitar el smoke test a los flujos críticos (login, alta de cliente, alta de factura) en vez de correr toda la suite completa contra producción.

### Fase 9 — Actualizar el `README.md` existente

Una vez obtenida la URL pública y verificado el despliegue, editar el `README.md` ya existente en el repo (no crear uno nuevo) añadiendo una sección de despliegue con:

- La URL pública de producción.
- Un resumen de la arquitectura de producción (Atlas, R2, Resend, Vercel, dominio).
- Cómo funciona el pipeline (GitLab CI → mirror a GitHub → deploy en Vercel) para quien mantenga el proyecto después.

### Checklist final del Bloque 2

- [ ] La app responde en el dominio público de producción con SSL válido.
- [ ] Login por magic link funciona con correo real vía Resend.
- [ ] Los adjuntos se guardan y leen correctamente desde Cloudflare R2.
- [ ] Un MR con un test roto no llega a desplegarse.
- [ ] Un merge a main despliega automáticamente en Vercel.
- [ ] El smoke test E2E contra producción pasa.
- [ ] `README.md` actualizado con la URL pública y la arquitectura de producción.

---

## 3. Qué debe preguntar el agente si algo no queda claro

- Cualquier credencial, token o secreto real (nunca inventarlos ni dejarlos hardcodeados).
- El nombre final del subdominio si difiere de `facturacion.jpavon-tech.com`.
- Si el clúster de Atlas, el bucket de R2 o el dominio en Resend ya existen o hay que crearlos desde cero.
- Si el usuario prefiere la Opción A o B del mirror GitLab → GitHub en la Fase 7 de producción.
- Cualquier ambigüedad sobre si un dato es sensible antes de sembrarlo en los seeds o usarlo en tests E2E contra producción.
