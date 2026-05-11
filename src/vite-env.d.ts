/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** Set to 'true' to show the Admin link in the sidebar (default: hidden). */
  readonly VITE_SHOW_ADMIN_NAV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
