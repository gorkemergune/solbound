/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** NASA api.nasa.gov key from .env (exposed to the browser bundle via envPrefix 'NASA_') */
  readonly NASA_API_KEY?: string;
}
