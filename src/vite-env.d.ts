/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Stats worker base URL; unset → tracking and the stats readout are disabled. */
  readonly VITE_STATS_URL?: string;
}
