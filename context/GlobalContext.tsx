"use client";

/**
 * Estado global de la interfaz.
 *
 * Se compone de dos piezas para no obligar a la landing a consultar la sesión:
 *
 *  - `ProveedorPreferencias` envuelve toda la app y vive solo en el navegador
 *    (tema y filas por página, persistidos en `localStorage`).
 *  - `ProveedorUsuario` envuelve únicamente el panel y recibe el usuario ya
 *    resuelto por el Server Component del layout, sin ida y vuelta extra.
 *
 * `useGlobal()` devuelve las dos: fuera del panel, `usuario` es `null`.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  PREFERENCIAS_POR_DEFECTO,
  TEMAS,
  type Preferencias,
  type Tema,
  type Usuario,
} from "@/lib/types";

const CLAVE_ALMACEN = "talonario.preferencias";

interface ContextoPreferencias {
  preferencias: Preferencias;
  cambiarTema: (tema: Tema) => void;
  alternarTema: () => void;
  cambiarFilasPorPagina: (filas: number) => void;
}

interface ContextoUsuario {
  usuario: Usuario | null;
  actualizarUsuario: (usuario: Usuario) => void;
}

const PreferenciasContext = createContext<ContextoPreferencias | null>(null);
const UsuarioContext = createContext<ContextoUsuario>({
  usuario: null,
  actualizarUsuario: () => undefined,
});

function esTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && TEMAS.includes(valor as Tema);
}

/*
 * `localStorage` es estado externo a React, así que se lee con
 * `useSyncExternalStore` en lugar de copiarlo a `useState` desde un efecto:
 * no hay render en cascada y la hidratación se resuelve sola (en el servidor
 * se sirven los valores por defecto y React vuelve a pintar con los reales).
 *
 * La instantánea se cachea porque `useSyncExternalStore` exige que
 * `getSnapshot` devuelva siempre la misma referencia mientras nada cambie.
 */
const almacen = {
  instantanea: null as Preferencias | null,
  oyentes: new Set<() => void>(),
};

function leerAlmacen(): Preferencias {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN);
    const datos: unknown = crudo ? JSON.parse(crudo) : null;
    const candidato = (
      typeof datos === "object" && datos !== null ? datos : {}
    ) as Record<string, unknown>;
    const temaPintado = document.documentElement.dataset.tema;
    return {
      tema: esTema(candidato.tema)
        ? candidato.tema
        : esTema(temaPintado)
          ? temaPintado
          : PREFERENCIAS_POR_DEFECTO.tema,
      filasPorPagina:
        typeof candidato.filasPorPagina === "number" && candidato.filasPorPagina > 0
          ? candidato.filasPorPagina
          : PREFERENCIAS_POR_DEFECTO.filasPorPagina,
    };
  } catch {
    // Modo privado, almacenamiento lleno o JSON corrupto: valores por defecto.
    return PREFERENCIAS_POR_DEFECTO;
  }
}

function instantaneaCliente(): Preferencias {
  almacen.instantanea ??= leerAlmacen();
  return almacen.instantanea;
}

function instantaneaServidor(): Preferencias {
  return PREFERENCIAS_POR_DEFECTO;
}

function suscribir(oyente: () => void): () => void {
  almacen.oyentes.add(oyente);
  return () => {
    almacen.oyentes.delete(oyente);
  };
}

function escribirPreferencias(siguientes: Preferencias): void {
  almacen.instantanea = siguientes;
  document.documentElement.dataset.tema = siguientes.tema;
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(siguientes));
  } catch {
    // Sin almacenamiento la preferencia dura lo que dure la pestaña.
  }
  for (const oyente of almacen.oyentes) oyente();
}

/** Script que corre antes del primer pintado para que no haya destello de tema. */
export const SCRIPT_TEMA = `(function(){try{var p=localStorage.getItem("${CLAVE_ALMACEN}");var t=p?JSON.parse(p).tema:null;if(t!=="claro"&&t!=="oscuro"){t=matchMedia("(prefers-color-scheme: dark)").matches?"oscuro":"claro";}document.documentElement.dataset.tema=t;}catch(e){document.documentElement.dataset.tema="claro";}})();`;

export function ProveedorPreferencias({ children }: { children: ReactNode }) {
  const preferencias = useSyncExternalStore(
    suscribir,
    instantaneaCliente,
    instantaneaServidor,
  );

  const valor = useMemo<ContextoPreferencias>(
    () => ({
      preferencias,
      cambiarTema: (tema) => escribirPreferencias({ ...preferencias, tema }),
      alternarTema: () =>
        escribirPreferencias({
          ...preferencias,
          tema: preferencias.tema === "claro" ? "oscuro" : "claro",
        }),
      cambiarFilasPorPagina: (filasPorPagina) =>
        escribirPreferencias({ ...preferencias, filasPorPagina }),
    }),
    [preferencias],
  );

  return (
    <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>
  );
}

export function ProveedorUsuario({
  usuarioInicial,
  children,
}: {
  usuarioInicial: Usuario | null;
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioInicial);
  const [usuarioServidor, setUsuarioServidor] = useState<Usuario | null>(usuarioInicial);

  // El layout del panel vuelve a renderizar tras cada `router.refresh()`: cuando
  // llega un usuario nuevo del servidor, manda él sobre la copia local.
  if (usuarioServidor !== usuarioInicial) {
    setUsuarioServidor(usuarioInicial);
    setUsuario(usuarioInicial);
  }

  const valor = useMemo<ContextoUsuario>(
    () => ({ usuario, actualizarUsuario: setUsuario }),
    [usuario],
  );

  return <UsuarioContext.Provider value={valor}>{children}</UsuarioContext.Provider>;
}

export function useGlobal(): ContextoPreferencias & ContextoUsuario {
  const preferencias = useContext(PreferenciasContext);
  const usuario = useContext(UsuarioContext);
  if (!preferencias) {
    throw new Error("useGlobal debe usarse dentro de <ProveedorPreferencias>.");
  }
  return { ...preferencias, ...usuario };
}
