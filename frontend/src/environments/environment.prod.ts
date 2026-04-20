/**
 * Production environment configuration.
 * Replace `apiUrl` with the deployed backend origin before building.
 * This file is swapped in for `environment.ts` by the Angular build
 * when running `ng build` (production is the default configuration).
 */
export const environment = {
  production: true,
  /** Deployed backend origin, e.g. `'https://api.bynder.com'`. No trailing slash. */
  apiUrl: 'https://api.yourdomain.com',
};
