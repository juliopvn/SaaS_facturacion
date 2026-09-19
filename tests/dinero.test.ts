/**
 * Pruebas del motor de dinero.
 *
 *   npm run test:unit
 *
 * Los valores esperados están calculados a mano: si la prueba se limitara a
 * repetir lo que hace el código, no comprobaría nada.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ErrorDinero,
  aplicarPorcentaje,
  baseLineaCentimos,
  calcularDesgloseIva,
  calcularTotales,
  dividirRedondeando,
  parsearCantidadAMilesimas,
  parsearEurosACentimos,
} from "../lib/dinero";
import { formatearEuros } from "../lib/formato";
import { esIdentificadorFiscalValido } from "../lib/validaciones";
import type { LineaFactura } from "../lib/types";

describe("dividirRedondeando", () => {
  it("redondea al más cercano y los empates se alejan del cero", () => {
    assert.equal(dividirRedondeando(100, 3), 33);
    assert.equal(dividirRedondeando(200, 3), 67);
    assert.equal(dividirRedondeando(5, 10), 1); // 0,5 → 1
    assert.equal(dividirRedondeando(15, 10), 2); // 1,5 → 2
    assert.equal(dividirRedondeando(25, 10), 3); // 2,5 → 3, no 2 como el redondeo bancario
    assert.equal(dividirRedondeando(-5, 10), -1);
  });

  it("rechaza lo que no sea aritmética entera", () => {
    assert.throws(() => dividirRedondeando(10.5, 2), ErrorDinero);
    assert.throws(() => dividirRedondeando(10, 0), ErrorDinero);
  });
});

describe("aplicarPorcentaje", () => {
  it("calcula el IVA sin arrastrar decimales", () => {
    assert.equal(aplicarPorcentaje(10_000, 21), 2_100);
    assert.equal(aplicarPorcentaje(33_649, 21), 7_066); // 70,6629 → 70,66
    assert.equal(aplicarPorcentaje(4_990, 4), 200); // 1,996 → 2,00
    assert.equal(aplicarPorcentaje(1, 21), 0); // 0,0021 → 0
  });

  it("no comete el error de la coma flotante", () => {
    // 0,1 + 0,2 en céntimos es exactamente 30, no 30,000000000000004.
    assert.equal(10 + 20, 30);
    // 1,005 € al 21 %: en flotante daría 0,21105 y redondearía mal.
    assert.equal(aplicarPorcentaje(100_5, 21), 211);
  });
});

describe("baseLineaCentimos", () => {
  const linea = (
    cantidadMilesimas: number,
    precioUnitarioCentimos: number,
  ): LineaFactura => ({
    descripcion: "prueba",
    cantidadMilesimas,
    precioUnitarioCentimos,
    ivaPorcentaje: 21,
  });

  it("multiplica cantidades fraccionarias por precios impares", () => {
    assert.equal(baseLineaCentimos(linea(1_000, 4_550)), 4_550); // 1 × 45,50
    assert.equal(baseLineaCentimos(linea(12_750, 4_275)), 54_506); // 12,75 × 42,75 = 545,0625 → 545,06
    assert.equal(baseLineaCentimos(linea(250, 19_999)), 5_000); // 0,25 × 199,99 = 49,9975 → 50,00
    assert.equal(baseLineaCentimos(linea(1_000, 1)), 1); // el céntimo suelto sobrevive
  });
});

describe("calcularDesgloseIva", () => {
  it("agrupa las bases por tipo antes de calcular la cuota", () => {
    const lineas: LineaFactura[] = [
      {
        descripcion: "a",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 3,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "b",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 3,
        ivaPorcentaje: 21,
      },
    ];
    // Por línea: 3 × 21 % = 0,63 → 1 céntimo cada una, 2 en total.
    // Agrupado (que es lo correcto): 6 × 21 % = 1,26 → 1 céntimo.
    assert.deepEqual(calcularDesgloseIva(lineas), [
      { ivaPorcentaje: 21, baseCentimos: 6, cuotaCentimos: 1 },
    ]);
  });

  it("ordena el desglose por tipo y omite los que no se usan", () => {
    const lineas: LineaFactura[] = [
      {
        descripcion: "a",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 10_000,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "b",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 5_000,
        ivaPorcentaje: 4,
      },
    ];
    assert.deepEqual(
      calcularDesgloseIva(lineas).map((fila) => fila.ivaPorcentaje),
      [4, 21],
    );
  });
});

describe("calcularTotales", () => {
  it("reproduce la factura de referencia de la suite E2E", () => {
    const lineas: LineaFactura[] = [
      {
        descripcion: "Horas de consultoría",
        cantidadMilesimas: 3_000,
        precioUnitarioCentimos: 4_550,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "Licencia de software",
        cantidadMilesimas: 1_000,
        precioUnitarioCentimos: 19_999,
        ivaPorcentaje: 21,
      },
      {
        descripcion: "Libro técnico",
        cantidadMilesimas: 2_000,
        precioUnitarioCentimos: 2_495,
        ivaPorcentaje: 4,
      },
    ];

    const totales = calcularTotales(lineas, 15);

    assert.equal(totales.baseImponibleCentimos, 38_639);
    assert.equal(totales.cuotaIvaCentimos, 7_266);
    assert.equal(totales.retencionIrpfCentimos, 5_796);
    assert.equal(totales.totalCentimos, 40_109);
    assert.deepEqual(totales.desgloseIva, [
      { ivaPorcentaje: 4, baseCentimos: 4_990, cuotaCentimos: 200 },
      { ivaPorcentaje: 21, baseCentimos: 33_649, cuotaCentimos: 7_066 },
    ]);
  });

  it("una factura sin líneas vale cero, no NaN", () => {
    const totales = calcularTotales([], 0);
    assert.equal(totales.totalCentimos, 0);
    assert.deepEqual(totales.desgloseIva, []);
  });

  it("rechaza retenciones fuera de rango", () => {
    assert.throws(() => calcularTotales([], 101), ErrorDinero);
    assert.throws(() => calcularTotales([], -1), ErrorDinero);
  });
});

describe("entrada de texto", () => {
  it("acepta coma o punto decimal", () => {
    assert.equal(parsearEurosACentimos("12,50"), 1_250);
    assert.equal(parsearEurosACentimos("12.5"), 1_250);
    assert.equal(parsearEurosACentimos("0,01"), 1);
    assert.equal(parsearEurosACentimos(" 1 234 "), 123_400);
    assert.equal(parsearCantidadAMilesimas("1,5"), 1_500);
    assert.equal(parsearCantidadAMilesimas("0,125"), 125);
  });

  it("rechaza lo que no es un número o tiene demasiados decimales", () => {
    assert.throws(() => parsearEurosACentimos("12,505"), ErrorDinero);
    assert.throws(() => parsearEurosACentimos("doce"), ErrorDinero);
    assert.throws(() => parsearEurosACentimos(""), ErrorDinero);
    assert.throws(() => parsearCantidadAMilesimas("1,0005"), ErrorDinero);
  });
});

describe("formato", () => {
  it("divide entre 100 solo al presentar, con la convención española", () => {
    assert.equal(formatearEuros(40_109).replace(/ /g, " "), "401,09 €");
    assert.equal(formatearEuros(0).replace(/ /g, " "), "0,00 €");
    assert.equal(formatearEuros(1).replace(/ /g, " "), "0,01 €");
  });
});

describe("identificadores fiscales", () => {
  it("valida la letra de control de NIF, NIE y CIF", () => {
    assert.ok(esIdentificadorFiscalValido("12345678Z")); // NIF
    assert.ok(esIdentificadorFiscalValido("X1234567L")); // NIE
    assert.ok(esIdentificadorFiscalValido("B23456783")); // CIF con dígito
    assert.ok(esIdentificadorFiscalValido("G12345674")); // CIF
  });

  it("rechaza letras de control incorrectas y formatos inventados", () => {
    assert.equal(esIdentificadorFiscalValido("12345678A"), false);
    assert.equal(esIdentificadorFiscalValido("X1234567A"), false);
    assert.equal(esIdentificadorFiscalValido("B23456780"), false);
    assert.equal(esIdentificadorFiscalValido("ABC"), false);
    assert.equal(esIdentificadorFiscalValido(""), false);
  });
});
