/**
 * Datos de demostración.
 *
 *   npm run seed          (o: npx tsx scripts/seed.ts)
 *
 * Es idempotente: borra todo lo que pertenece a la cuenta demo y lo vuelve a
 * sembrar con identificadores fijos, así que ejecutarlo dos veces seguidas deja
 * la base exactamente igual. No toca los datos de ninguna otra cuenta.
 *
 * El catálogo cubre los casos que importan al probar el cálculo en céntimos:
 * una línea y varias, los cuatro tipos de IVA, retención de IRPF, cantidades
 * fraccionarias, un importe de un céntimo y otro de seis cifras.
 */
import "./entorno";

import { ObjectId } from "mongodb";

import {
  asegurarIndices,
  cerrarConexion,
  coleccionClientes,
  coleccionContadores,
  coleccionFacturas,
  coleccionTokensAcceso,
  coleccionUsuarios,
} from "@/lib/db";
import { calcularTotales } from "@/lib/dinero";
import { formatearEuros } from "@/lib/formato";
import { instantaneaCliente } from "@/lib/repositorios/clientes";
import { componerNumero } from "@/lib/repositorios/facturas";
import type {
  DocumentoCliente,
  DocumentoFactura,
  EstadoFactura,
  LineaFactura,
} from "@/lib/types";
import { esquemaCliente } from "@/lib/validaciones";

const EMAIL_DEMO = process.env.DEMO_EMAIL ?? "demo@talonario.test";

/** Identificadores fijos: sembrar dos veces reutiliza los mismos documentos. */
const ID_USUARIO = new ObjectId("650000000000000000000001");
const ID_CLIENTES = {
  gráfica: new ObjectId("650000000000000000000101"),
  huerta: new ObjectId("650000000000000000000102"),
  marcos: new ObjectId("650000000000000000000103"),
  delta: new ObjectId("650000000000000000000104"),
} as const;

const HOY = new Date();

/** Fecha a N días vista (negativo = pasado), normalizada a medianoche UTC. */
function dias(desplazamiento: number): Date {
  const fecha = new Date(HOY);
  fecha.setUTCDate(fecha.getUTCDate() + desplazamiento);
  fecha.setUTCHours(0, 0, 0, 0);
  return fecha;
}

interface DatosClienteDemo {
  _id: ObjectId;
  nombre: string;
  nif: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  pais: string;
  notas: string;
}

const CLIENTES: DatosClienteDemo[] = [
  {
    _id: ID_CLIENTES.gráfica,
    nombre: "Gráfica Mediterránea S.L.",
    nif: "B23456783",
    email: "administracion@graficamediterranea.test",
    telefono: "961 234 567",
    direccion: "Carrer de la Impremta, 14",
    ciudad: "València",
    codigoPostal: "46022",
    pais: "España",
    notas: "Paga a 30 días. Enviar factura también en PDF.",
  },
  {
    _id: ID_CLIENTES.huerta,
    nombre: "Cooperativa La Huerta",
    nif: "G12345674",
    email: "cuentas@lahuerta.test",
    telefono: "968 445 120",
    direccion: "Camino de los Naranjos, s/n",
    ciudad: "Murcia",
    codigoPostal: "30011",
    pais: "España",
    notas: "Retención de IRPF del 15 % en todos los trabajos.",
  },
  {
    _id: ID_CLIENTES.marcos,
    nombre: "Marcos Iglesias Ferrer",
    nif: "12345678Z",
    email: "marcos@iglesiasferrer.test",
    telefono: "606 778 991",
    direccion: "Rúa do Vilar, 3, 2º",
    ciudad: "Santiago de Compostela",
    codigoPostal: "15705",
    pais: "España",
    notas: "Autónomo. Prefiere recibir todo por correo.",
  },
  {
    _id: ID_CLIENTES.delta,
    nombre: "Sistemas Delta S.A.",
    nif: "A76543214",
    email: "proveedores@sistemasdelta.test",
    telefono: "915 002 331",
    direccion: "Paseo de la Castellana, 200",
    ciudad: "Madrid",
    codigoPostal: "28046",
    pais: "España",
    notas: "Portal de proveedores. Requiere número de pedido en las notas.",
  },
];

interface FacturaDemo {
  _id: ObjectId;
  clienteId: ObjectId;
  serie: string;
  estado: EstadoFactura;
  diasEmision: number;
  diasVencimiento: number;
  retencionIrpfPorcentaje: number;
  notas: string;
  lineas: LineaFactura[];
}

const FACTURAS: FacturaDemo[] = [
  {
    // Caso mínimo: una sola línea, el IVA general.
    _id: new ObjectId("650000000000000000000201"),
    clienteId: ID_CLIENTES.gráfica,
    serie: "F",
    estado: "pagada",
    diasEmision: -75,
    diasVencimiento: -45,
    retencionIrpfPorcentaje: 0,
    notas: "Cobrada por transferencia el mismo mes.",
    lineas: [
      {
        descripcion: "Diseño de identidad visual",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 180_000,
        ivaPorcentaje: 21,
      },
    ],
  },
  {
    // Caso completo: los cuatro tipos de IVA conviviendo, con retención de IRPF.
    _id: new ObjectId("650000000000000000000202"),
    clienteId: ID_CLIENTES.huerta,
    serie: "F",
    estado: "emitida",
    diasEmision: -40,
    diasVencimiento: 20,
    retencionIrpfPorcentaje: 15,
    notas: "Incluye materiales impresos y producto agrícola.",
    lineas: [
      {
        descripcion: "Consultoría de marca",
        cantidadMilesimas: 12_000,
        precioUnitarioCentimos: 6_500,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "Catálogo impreso (tirada corta)",
        cantidadMilesimas: 500_000,
        precioUnitarioCentimos: 240,
        ivaPorcentaje: 10,
      },
      {
        descripcion: "Cajas de naranja de muestra",
        cantidadMilesimas: 24_000,
        precioUnitarioCentimos: 1_150,
        ivaPorcentaje: 4,
      },
      {
        descripcion: "Formación bonificada al equipo",
        cantidadMilesimas: 8_000,
        precioUnitarioCentimos: 4_000,
        ivaPorcentaje: 0,
      },
    ],
  },
  {
    // Importe grande y ya vencida: alimenta el aviso del panel.
    _id: new ObjectId("650000000000000000000203"),
    clienteId: ID_CLIENTES.delta,
    serie: "F",
    estado: "emitida",
    diasEmision: -60,
    diasVencimiento: -15,
    retencionIrpfPorcentaje: 0,
    notas: "Pedido de compra PD-2214.",
    lineas: [
      {
        descripcion: "Rediseño del portal corporativo",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 9_450_000,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "Mantenimiento evolutivo (6 meses)",
        cantidadMilesimas: 6_000,
        precioUnitarioCentimos: 320_000,
        ivaPorcentaje: 21,
      },
    ],
  },
  {
    // Importe mínimo: un céntimo. El 21 % redondea a cero.
    _id: new ObjectId("650000000000000000000204"),
    clienteId: ID_CLIENTES.marcos,
    serie: "F",
    estado: "borrador",
    diasEmision: -5,
    diasVencimiento: 25,
    retencionIrpfPorcentaje: 0,
    notas: "Ajuste simbólico pendiente de confirmar con el cliente.",
    lineas: [
      {
        descripcion: "Ajuste de redondeo del ejercicio anterior",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 1,
        ivaPorcentaje: 21,
      },
    ],
  },
  {
    // Anulada: no cuenta en el facturado.
    _id: new ObjectId("650000000000000000000205"),
    clienteId: ID_CLIENTES.gráfica,
    serie: "F",
    estado: "anulada",
    diasEmision: -90,
    diasVencimiento: -60,
    retencionIrpfPorcentaje: 0,
    notas: "Anulada: el proyecto se reformuló y se refacturó en F-0001.",
    lineas: [
      {
        descripcion: "Bocetos preliminares",
        cantidadMilesimas: 3_000,
        precioUnitarioCentimos: 12_000,
        ivaPorcentaje: 10,
      },
      {
        descripcion: "Reunión de arranque",
        cantidadMilesimas: 2_000,
        precioUnitarioCentimos: 5_000,
        ivaPorcentaje: 10,
      },
    ],
  },
  {
    // Cantidades fraccionarias: horas con decimales sobre precios impares.
    _id: new ObjectId("650000000000000000000206"),
    clienteId: ID_CLIENTES.marcos,
    serie: "F",
    estado: "pagada",
    diasEmision: -20,
    diasVencimiento: 10,
    retencionIrpfPorcentaje: 7,
    notas: "Horas de septiembre. Retención reducida de nuevo autónomo.",
    lineas: [
      {
        descripcion: "Maquetación web (horas)",
        cantidadMilesimas: 12_750,
        precioUnitarioCentimos: 4_275,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "Revisión de textos (horas)",
        cantidadMilesimas: 1_500,
        precioUnitarioCentimos: 3_333,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "Licencia tipográfica repercutida",
        cantidadMilesimas: 250,
        precioUnitarioCentimos: 19_999,
        ivaPorcentaje: 21,
      },
    ],
  },
];

async function sembrar(): Promise<void> {
  await asegurarIndices();

  const [usuarios, clientes, facturas, contadores, tokens] = await Promise.all([
    coleccionUsuarios(),
    coleccionClientes(),
    coleccionFacturas(),
    coleccionContadores(),
    coleccionTokensAcceso(),
  ]);

  // Limpieza acotada a la cuenta demo: el resto de cuentas queda intacto.
  await Promise.all([
    clientes.deleteMany({ usuarioId: ID_USUARIO }),
    facturas.deleteMany({ usuarioId: ID_USUARIO }),
    contadores.deleteMany({ _id: { $regex: `^${ID_USUARIO.toHexString()}:` } }),
    tokens.deleteMany({ email: EMAIL_DEMO }),
  ]);

  const ahora = new Date();
  await usuarios.replaceOne(
    { _id: ID_USUARIO },
    {
      email: EMAIL_DEMO,
      emisor: {
        nombre: "Ana Ruiz · Estudio de diseño",
        nif: "45872913B",
        direccion: "Carrer de Sant Pere, 8, 3r 1a",
        ciudad: "Barcelona",
        codigoPostal: "08003",
        pais: "España",
      },
      creadoEn: ahora,
      ultimoAccesoEn: null,
    },
    { upsert: true },
  );
  // Si el correo demo ya existía en otra cuenta, el índice único lo impediría.
  await usuarios.deleteMany({ email: EMAIL_DEMO, _id: { $ne: ID_USUARIO } });

  const documentosCliente: DocumentoCliente[] = CLIENTES.map((cliente) => {
    // Pasa por el mismo esquema que el formulario: los datos demo son válidos.
    const validado = esquemaCliente.parse(cliente);
    return {
      _id: cliente._id,
      usuarioId: ID_USUARIO,
      ...validado,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
  });
  await clientes.insertMany(documentosCliente);

  const porId = new Map(
    documentosCliente.map((cliente) => [cliente._id.toHexString(), cliente]),
  );

  // La numeración se asigna en orden cronológico, como en la vida real.
  const enOrden = [...FACTURAS].sort((a, b) => a.diasEmision - b.diasEmision);
  const secuenciaPorSerie = new Map<string, number>();

  const documentosFactura: DocumentoFactura[] = enOrden.map((demo) => {
    const cliente = porId.get(demo.clienteId.toHexString());
    if (!cliente)
      throw new Error(`Cliente demo ausente: ${demo.clienteId.toHexString()}`);

    const fechaEmision = dias(demo.diasEmision);
    const ejercicio = fechaEmision.getUTCFullYear();
    const claveSerie = `${demo.serie}:${ejercicio}`;
    const secuencia = (secuenciaPorSerie.get(claveSerie) ?? 0) + 1;
    secuenciaPorSerie.set(claveSerie, secuencia);

    return {
      _id: demo._id,
      usuarioId: ID_USUARIO,
      clienteId: cliente._id,
      numero: componerNumero(demo.serie, ejercicio, secuencia),
      serie: demo.serie,
      ejercicio,
      secuencia,
      estado: demo.estado,
      cliente: instantaneaCliente(cliente),
      lineas: demo.lineas,
      retencionIrpfPorcentaje: demo.retencionIrpfPorcentaje,
      totales: calcularTotales(demo.lineas, demo.retencionIrpfPorcentaje),
      fechaEmision,
      fechaVencimiento: dias(demo.diasVencimiento),
      notas: demo.notas,
      adjuntos: [],
      creadaEn: fechaEmision,
      actualizadaEn: fechaEmision,
    };
  });
  await facturas.insertMany(documentosFactura);

  // Los contadores continúan donde lo dejó el seed: la próxima factura sigue la serie.
  await Promise.all(
    [...secuenciaPorSerie.entries()].map(([claveSerie, secuencia]) =>
      contadores.replaceOne(
        { _id: `${ID_USUARIO.toHexString()}:${claveSerie}` },
        { secuencia },
        { upsert: true },
      ),
    ),
  );

  const facturado = documentosFactura
    .filter((factura) => factura.estado === "emitida" || factura.estado === "pagada")
    .reduce((suma, factura) => suma + factura.totales.totalCentimos, 0);

  console.log(`Cuenta demo:   ${EMAIL_DEMO}`);
  console.log(`Clientes:      ${documentosCliente.length}`);
  console.log(`Facturas:      ${documentosFactura.length}`);
  console.log(`Facturado:     ${formatearEuros(facturado)} (${facturado} céntimos)`);
  console.log("");
  for (const factura of documentosFactura) {
    console.log(
      `  ${factura.numero}  ${factura.estado.padEnd(8)}  ${factura.cliente.nombre.padEnd(28)}  ${formatearEuros(factura.totales.totalCentimos).padStart(14)}`,
    );
  }
  console.log("");
  console.log(
    "Entra en http://localhost:3000/acceso con ese correo y recoge el enlace en http://localhost:8025",
  );
}

sembrar()
  .then(() => cerrarConexion())
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error("El seed ha fallado:", error);
    await cerrarConexion().catch(() => undefined);
    process.exit(1);
  });
