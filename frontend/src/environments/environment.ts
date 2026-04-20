/**
 * Development environment configuration.
 * `apiUrl` is intentionally empty so that Angular's dev server proxy
 * (configured in `proxy.conf.json`) forwards `/api/*` requests to the
 * local Express backend on port 3000.
 */
export const environment = {
  production: false,
  /** Base URL prepended to every API request. Empty string = same-origin (proxy). */
  apiUrl: '',
};
