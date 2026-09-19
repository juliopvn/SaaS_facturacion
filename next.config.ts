import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * AGENTS.md lo escribimos y mantenemos a mano: documenta las reglas del
   * proyecto, no el andamiaje del framework. Sin esto, `next dev` lo
   * sobrescribiría con su plantilla en cada arranque.
   */
  agentRules: false,
};

export default nextConfig;
