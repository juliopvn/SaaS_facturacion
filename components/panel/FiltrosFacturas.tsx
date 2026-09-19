import { ESTADOS_FACTURA, type Cliente, type EstadoFactura } from "@/lib/types";
import { ETIQUETAS_ESTADO } from "@/lib/formato";

/**
 * Filtros del listado.
 *
 * Es un formulario GET normal: la búsqueda queda en la URL (compartible y
 * navegable con el historial) y funciona aunque el JavaScript no cargue.
 */
export function FiltrosFacturas({
  clientes,
  estado,
  clienteId,
  busqueda,
}: {
  clientes: Cliente[];
  estado?: EstadoFactura;
  clienteId?: string;
  busqueda?: string;
}) {
  const control =
    "w-full border border-regla bg-papel px-3 py-2 text-[0.875rem] text-tinta focus:border-sello";

  return (
    <form
      method="get"
      className="border-regla bg-papel-hundido mb-6 grid gap-3 border p-4 sm:grid-cols-[1fr_auto_auto_auto]"
    >
      <div>
        <label htmlFor="busqueda" className="rotulo mb-1.5 block">
          Buscar
        </label>
        <input
          id="busqueda"
          name="busqueda"
          type="search"
          defaultValue={busqueda ?? ""}
          placeholder="Número o nombre de cliente"
          className={control}
        />
      </div>

      <div>
        <label htmlFor="estado" className="rotulo mb-1.5 block">
          Estado
        </label>
        <select id="estado" name="estado" defaultValue={estado ?? ""} className={control}>
          <option value="">Todos</option>
          {ESTADOS_FACTURA.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_ESTADO[valor]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="clienteId" className="rotulo mb-1.5 block">
          Cliente
        </label>
        <select
          id="clienteId"
          name="clienteId"
          defaultValue={clienteId ?? ""}
          className={control}
        >
          <option value="">Todos</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          className="border-regla-fuerte bg-papel hover:bg-sello-tenue hover:border-sello w-full border px-4 py-2 text-[0.875rem] font-medium transition-colors sm:w-auto"
        >
          Filtrar
        </button>
      </div>
    </form>
  );
}
