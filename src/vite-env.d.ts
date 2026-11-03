/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SERVER_ORIGIN: string;
  readonly VITE_RECAPTCHA_KEY: string;
  /** Optional full ws(s) URL of the collab server; derived from the server origin when unset. */
  readonly VITE_COLLAB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
