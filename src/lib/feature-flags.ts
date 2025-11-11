// src/lib/feature-flags.ts

type Environment = "local" | "production";
export type Feature = "auth" | "collections";

type FeatureFlagsConfig = Partial<Record<Feature, boolean>>;

const featureFlagsConfig: Record<Environment, FeatureFlagsConfig> = {
  // Konfiguracja dla `npm run dev` i testów E2E
  local: {
    auth: true,
    collections: true,
  },
  // Konfiguracja dla `npm run build`
  production: {
    auth: true,
    collections: false,
  },
};

/**
 * Zwraca aktualne środowisko na podstawie wbudowanej zmiennej Astro/Vite.
 * Nie wymaga żadnej dodatkowej konfiguracji.
 */
function getEnvironment(): Environment {
  // `import.meta.env.PROD` jest automatycznie ustawiane na `true`
  // przez Vite podczas budowania aplikacji na produkcję (`npm run build`).
  if (import.meta.env.PROD) {
    return "production";
  }
  // W każdym innym przypadku (np. `npm run dev`) jesteśmy w trybie lokalnym.
  return "local";
}

/**
 * Sprawdza, czy dana funkcjonalność jest włączona dla aktualnego środowiska.
 */
export function isFeatureEnabled(feature: Feature): boolean {
  const environment = getEnvironment();
  const environmentFlags = featureFlagsConfig[environment];

  if (!environmentFlags) {
    return false;
  }

  return environmentFlags[feature] ?? false;
}
