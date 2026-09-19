"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGlobal } from "@/context/GlobalContext";

export function BarraUsuario() {
  const { usuario, preferencias, alternarTema } = useGlobal();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir(): Promise<void> {
    setSaliendo(true);
    await fetch("/api/auth/sesion", { method: "DELETE" });
    router.replace("/acceso");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={alternarTema}
        aria-pressed={preferencias.tema === "oscuro"}
        className="cifra px-2.5 py-1.5 text-[0.6875rem] tracking-[0.12em] text-white/60 uppercase transition-colors hover:text-white"
      >
        {preferencias.tema === "oscuro" ? "Claro" : "Oscuro"}
      </button>
      <span aria-hidden className="h-4 w-px bg-white/20" />
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        data-prueba="salir"
        title={usuario?.email}
        className="cifra px-2.5 py-1.5 text-[0.6875rem] tracking-[0.12em] text-white/60 uppercase transition-colors hover:text-white disabled:opacity-50"
      >
        {saliendo ? "Saliendo…" : "Salir"}
      </button>
    </div>
  );
}
