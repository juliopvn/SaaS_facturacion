# AGENTS.md — cómo se trabaja en este repositorio

Guía para cualquier agente o persona que toque este código. Si vas a cambiar
algo, lee primero **Reglas no negociables**: son invariantes del dominio, no
preferencias de estilo.

> **No crees un `README.md` nuevo.** Ya existe uno y es el documento de producto:
> qué es la aplicación y cómo se usa. Las convenciones de desarrollo van aquí.

---

## 1. Puesta en marcha

```bash
cp .env.example .env.local        # y pon un SESSION_SECRET propio
openssl rand -base64 32           # genera uno

docker compose up -d              # MongoDB, MailHog y RustFS
npm install
npm run seed                      # datos de demostración (idempotente)
npm run dev                       # http://localhost:3000
```

Entra en <http://localhost:3000/acceso> con `demo@talonario.test` y recoge el
enlace mágico en MailHog: <http://localhost:8025>.

### Comandos

| Comando                | Qué hace                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo (Turbopack) en el puerto 3000.                |
| `npm run build`        | Compilación de producción. Falla ante cualquier error de tipos.      |
| `npm start`            | Sirve la compilación de producción.                                  |
| `npm run lint`         | ESLint con la configuración de Next 16.                              |
| `npm run typecheck`    | `tsc --noEmit`.                                                      |
| `npm run format`       | Prettier sobre el código (no toca `README.md`, `PROMT.md` ni este archivo). |
| `npm run format:check` | Comprueba el formato sin escribir. Es lo que corre en CI.            |
| `npm run seed`         | Sesga la base con datos de demo. Equivale a `npx tsx scripts/seed.ts`. |
| `npm run test:unit`    | Pruebas del motor de dinero y de las validaciones (`node:test`).     |
| `npm run test:e2e`     | Suite de Playwright contra el entorno local.                         |
| `npm run test`         | Unitarias y después E2E.                                             |

### Infraestructura local

| Servicio | Puerto            | Para qué                                          |
| -------- | ----------------- | ------------------------------------------------- |
| MongoDB  | `27017`           | Base `saas_facturacion`.                           |
| MailHog  | `1025` SMTP / `8025` web | Intercepta todo el correo saliente.          |
| RustFS   | `9001`            | Almacenamiento S3 de los adjuntos.                 |

```bash
docker compose up -d      # levantar
docker compose ps         # estado
docker compose logs -f mongo
docker compose down       # parar (los datos persisten en volúmenes)
docker compose down -v    # parar y borrar los datos
```

### Cosas que suelen dar guerra

- **Ya tienes un `mongod` en el puerto 27017.** macOS resuelve `localhost` a
  `127.0.0.1` antes que a la interfaz de Docker, así que la aplicación hablaría
  con tu Mongo local y no con el contenedor. Compruébalo con
  `lsof -nP -iTCP:27017 -sTCP:LISTEN`: si aparece un `mongod` que no es de
  Docker, párale (`brew services stop mongodb-community`) o cambia el puerto en
  `docker-compose.yml` y en `MONGODB_URI`.
- **MongoDB 7, no 8.** Las imágenes 8.x se niegan a arrancar sobre el kernel que
  usa Docker Desktop (SERVER-121912). El proyecto no usa nada exclusivo de 8.x.
- **MailHog en Apple Silicon** corre emulado (`platform: linux/amd64`). Funciona,
  solo arranca un poco más lento.
- **Falta una variable de entorno**: el error lo dice por su nombre y te manda a
  `.env.example`. Toda la configuración se lee en `lib/env.ts`; nadie más toca
  `process.env`.

### Depurar

- **Correo**: <http://localhost:8025>. La suite E2E no usa esa interfaz: lee la
  API (`GET /api/v2/messages`) desde `e2e/utilidades/mailhog.ts`.
- **Adjuntos**: RustFS expone consola en <http://localhost:9001>
  (`rustfsadmin` / `rustfsadmin`). El bucket `facturacion` lo crea la aplicación
  sola la primera vez que se sube algo (`asegurarBucket`).
- **Base de datos**: `docker exec -it facturacion-mongo mongosh saas_facturacion`.
- **Trazas de un test que falla**: `npx playwright show-trace test-results/<...>/trace.zip`.

---

## 2. Reglas no negociables

### 2.1 Todo el dinero es un entero de céntimos

Ningún importe es un `float`. Se almacena, se suma y se multiplica como entero.

- La aritmética vive **solo** en `lib/dinero.ts`.
- La división entre 100 vive **solo** en `lib/formato.ts`. Si escribes `/ 100`
  en cualquier otro archivo, está mal. (La landing tiene un `/ 100` marcado como
  contraejemplo: enseña a propósito el resultado de operar en coma flotante.)
- Las cantidades llevan tres decimales implícitos: el campo se llama
  `cantidadMilesimas` y 1,5 unidades son `1500`.
- Los porcentajes (IVA, IRPF) son enteros: `21`, no `0.21`.
- Sufijos obligatorios en los nombres: `*Centimos`, `*Milesimas`, `*Porcentaje`.
- El IVA se calcula **sobre la base agregada de cada tipo**, no sumando la cuota
  de cada línea: son resultados distintos y el bueno es el primero.
- Los totales que llegan del cliente se ignoran. El servidor siempre recalcula
  con `calcularTotales` antes de guardar.

### 2.2 Un único cliente de MongoDB

`lib/db.ts` exporta el singleton y una función por colección. Ninguna ruta,
repositorio ni script construye su propio `MongoClient`. La única excepción es
`e2e/global-setup.ts`, que abre una conexión propia y efímera para comprobar
que Docker está levantado antes de que arranque la aplicación.

### 2.3 Server Components leen; Client Components llaman a la API

- Los **Server Components** (`app/**/page.tsx`, `layout.tsx`) importan los
  repositorios de `lib/repositorios/` y leen Mongo directamente.
- Los **Client Components** (`"use client"`) nunca importan repositorios: usan
  `lib/peticiones.ts` contra las rutas de `app/api/`.
- Las mutaciones pasan siempre por una API route.

### 2.4 Toda consulta va acotada al usuario

Cada función de repositorio recibe `usuarioId` y lo mete en el filtro de Mongo.
Nunca se busca un recurso solo por su `_id`. Si añades una consulta, el
`usuarioId` va dentro del `find`/`update`, no en un `if` posterior.

### 2.5 Las API routes responden `{ error }`

Ante un fallo, una ruta devuelve `{ error: string }` —y `detalles` por campo si
es de validación— con el código HTTP adecuado. Nunca un stack ni un mensaje del
driver. El envoltorio `rutaSegura` de `lib/api.ts` lo garantiza; úsalo siempre.

### 2.6 Nada de `any`

TypeScript estricto, sin `any` ni en tipos ni en aserciones. Lo desconocido se
tipa como `unknown` y se estrecha. **Todas las interfaces de dominio viven en
`lib/types.ts`**; ningún módulo declara las suyas por su cuenta.

### 2.7 `proxy.ts` decide quién ve el panel

Es el sustituto de `middleware.ts` en Next 16 y **siempre corre en Node.js**
(no admite `export const runtime`). Solo valida la firma de la cookie: no
consulta la base de datos. La comprobación de propiedad real la hacen los
repositorios (regla 2.4). Las rutas `/api/**` quedan fuera de su `matcher`
a propósito: responden 401 con el contrato de error, que le sirve mejor a un
cliente `fetch` que una redirección HTML.

---

## 3. Estructura

```
app/
  page.tsx                  landing pública
  acceso/                   entrada con enlace mágico
  panel/                    zona privada (protegida por proxy.ts)
    layout.tsx              resuelve el usuario y monta el GlobalContext
    page.tsx                resumen
    clientes/ facturas/ ajustes/
  api/
    auth/enlace             POST   pide el enlace mágico
    auth/verificar          GET    canjea el token y abre la sesión
    auth/sesion             GET/DELETE
    clientes/ facturas/ perfil/
components/
  ui/                       primitivas (Boton, Campo, Sello, Aviso)
  landing/                  hero y formulario de acceso
  panel/                    tablas y formularios del panel
context/GlobalContext.tsx   preferencias (localStorage) + usuario autenticado
lib/
  types.ts                  TODAS las interfaces del dominio
  dinero.ts                 aritmética en céntimos
  formato.ts                única capa que divide entre 100
  db.ts                     singleton de MongoDB e índices
  env.ts                    lectura tipada de la configuración
  sesion.ts                 firma de la cookie y tokens de un solo uso
  autenticacion.ts          sesión del lado servidor (`exigirSesion`, …)
  api.ts                    contrato de error y `rutaSegura`
  validaciones.ts           esquemas Zod, incluida la letra de control del NIF
  mailer.ts                 email (MailHog | Resend, por variable de entorno)
  storage.ts                S3 (RustFS | Cloudflare R2, por variable de entorno)
  peticiones.ts             cliente HTTP de los Client Components
  limitador.ts              límite de peticiones en memoria
  repositorios/             acceso a datos, siempre acotado por usuario
proxy.ts                    protección de rutas
scripts/seed.ts             datos de demostración idempotentes
tests/                      pruebas unitarias (node:test)
e2e/                        suite de Playwright
```

### Modelo de datos

| Colección       | Contenido                                                       |
| --------------- | --------------------------------------------------------------- |
| `usuarios`      | Cuenta y datos fiscales del emisor. Índice único por `email`.    |
| `tokens_acceso` | Tokens del enlace mágico, hasheados, con TTL que los borra solo. |
| `clientes`      | Cartera de cada usuario. Único por `(usuarioId, nif)`.           |
| `facturas`      | Líneas, totales y copia congelada del cliente. Único por `(usuarioId, numero)`. |
| `contadores`    | Numeración correlativa por usuario, serie y ejercicio.           |

Dos decisiones que conviene conocer antes de tocar facturas:

- **La factura guarda una copia del cliente** (`cliente`), no solo su `_id`. Si
  el cliente cambia de dirección, las facturas ya emitidas no cambian.
- **El número se reserva con `$inc` sobre `contadores`**, de forma atómica. Dos
  facturas creadas a la vez no pueden compartir número.
- **Solo se edita o borra un borrador.** Una factura emitida se anula.

---

## 4. Cómo añadir cosas

**Un campo nuevo en un modelo**

1. Añádelo a la interfaz de `lib/types.ts` (la `Documento*` y la serializable).
2. Actualiza el `serializar*` del repositorio.
3. Añádelo al esquema Zod de `lib/validaciones.ts`.
4. Añádelo al seed si aporta un caso que merezca la pena demostrar.

**Una API route nueva**

Va en `app/api/<recurso>/route.ts`, y su esqueleto es siempre el mismo:

```ts
export function POST(peticion: Request) {
  return rutaSegura<{ recurso: Recurso }>(async () => {
    const { usuarioId } = await exigirSesion();
    const datos = await leerCuerpo(peticion, esquemaRecurso);
    return NextResponse.json({ recurso: await crearRecurso(usuarioId, datos) });
  });
}
```

`exigirSesion` lanza un 401 solo, `leerCuerpo` un 422 con los errores por campo,
y `rutaSegura` convierte cualquier excepción al contrato `{ error }`.

**Una pantalla nueva del panel**

Server Component que llama al repositorio, `Encabezado` arriba y las primitivas
de `components/ui/`. Si necesita interacción, extrae solo esa parte a un Client
Component.

**Pruebas**

- Si tocas `lib/dinero.ts`, añade el caso a `tests/dinero.test.ts` con el
  resultado calculado a mano. Una prueba que repite lo que hace el código no
  comprueba nada.
- Si añades una funcionalidad de usuario, añade un `.spec.ts` en `e2e/`. Los
  ganchos del marcado son `data-prueba="..."` (así está configurado
  `testIdAttribute` en `playwright.config.ts`), y se ponen solo donde un selector
  accesible no basta.
- Si la funcionalidad necesita datos, siémbralos en `scripts/seed.ts` con un
  `ObjectId` fijo y mantén el seed idempotente: primero borra lo de la cuenta
  demo, después inserta.

---

## 5. Diseño de la interfaz

La referencia visual es el **talonario de facturas autocopiativo**: la hoja
original, las copias rosa y azul debajo, la tinta violeta del tampón y los
números alineados en tipografía mecánica.

- Los colores son variables CSS en `app/globals.css`, expuestas a Tailwind por
  `@theme inline`. Usa `bg-papel`, `text-tinta`, `border-regla`… No metas
  hexadecimales sueltos en los componentes.
- Clases propias: `.hoja` (el contenedor de papel), `.cifra` (monoespaciada con
  cifras tabulares, obligatoria en todo importe), `.rotulo` (los encabezados en
  versalitas), `.sello-tampon`, `.no-imprimir`.
- Tema claro y oscuro: el mismo juego de variables, redefinido bajo
  `[data-tema="oscuro"]`. Si añades un color, defínelo en los dos.
- Accesibilidad mínima: foco visible, `prefers-reduced-motion` respetado, tablas
  con `<caption>` y `scope`, y nada de `window.confirm` (usa `BotonEliminar`).

---

## 6. Antes de dar algo por terminado

```bash
npm run typecheck && npm run lint && npm run format:check
npm run test:unit
npm run test:e2e
```

Y si has tocado dinero, repasa la regla 2.1 una vez más: céntimos enteros en
todas partes, la división entre 100 solo en `lib/formato.ts`.
