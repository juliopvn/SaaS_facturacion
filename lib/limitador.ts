/**
 * Limitador de peticiones en memoria, por proceso.
 *
 * Suficiente para frenar el abuso del formulario de acceso en una instancia.
 * En un despliegue con varias instancias habría que moverlo a un almacén
 * compartido (Redis o la propia MongoDB); se documenta aquí para que quien lo
 * necesite sepa qué sustituir.
 */
const CACHE = Symbol.for("saas-facturacion.limitador");

interface Ventana {
  restantes: number;
  reinicioEn: number;
}

interface CacheGlobal {
  [CACHE]?: Map<string, Ventana>;
}

const global = globalThis as unknown as CacheGlobal;

function registro(): Map<string, Ventana> {
  if (!global[CACHE]) global[CACHE] = new Map<string, Ventana>();
  return global[CACHE];
}

export interface ResultadoLimite {
  permitido: boolean;
  segundosEspera: number;
}

export function consumir(
  clave: string,
  maximo: number,
  ventanaSegundos: number,
): ResultadoLimite {
  const mapa = registro();
  const ahora = Date.now();
  const actual = mapa.get(clave);

  if (!actual || actual.reinicioEn <= ahora) {
    mapa.set(clave, {
      restantes: maximo - 1,
      reinicioEn: ahora + ventanaSegundos * 1000,
    });
    return { permitido: true, segundosEspera: 0 };
  }

  if (actual.restantes <= 0) {
    return {
      permitido: false,
      segundosEspera: Math.ceil((actual.reinicioEn - ahora) / 1000),
    };
  }

  actual.restantes -= 1;
  return { permitido: true, segundosEspera: 0 };
}
