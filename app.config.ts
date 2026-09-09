/**
 * Dynamic Expo config — per-environment app variants.
 *
 * Punto ships three build tracks (AGENTS.md §9.5), and a development AND a
 * preview build must be installable side-by-side on the same device. Each
 * track therefore gets its own native identity derived from the EAS build
 * profile:
 *
 * | Profile     | App name       | android.package             | ios.bundleIdentifier        | scheme      |
 * |-------------|----------------|-----------------------------|-----------------------------|-------------|
 * | development | Punto Dev      | com.javiercaz.punto.dev     | com.javiercaz.punto.dev     | puntodev    |
 * | preview     | Punto Preview  | com.javiercaz.punto.preview | com.javiercaz.punto.preview | puntopreview |
 * | production  | Punto          | com.javiercaz.punto         | com.javiercaz.punto         | punto       |
 *
 * Static config (plugins, icons, splash, web output…) stays in app.json and
 * is passed in as `config`; only the identity fields above are overridden.
 *
 * When no profile is set (plain `expo start`, `expo run:android`, jest…), we
 * default to the **development** variant so the local dev server matches the
 * expo-dev-client binary installed on the device (same scheme / launcher URL).
 */
import type { ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

const BASE_IDENTIFIER = 'com.javiercaz.punto';
const BASE_SCHEME = 'punto';

/** Short suffix used in identifiers/schemes/labels: development → "dev". */
function getShortVariant(variant: AppVariant): string {
  return variant === 'development' ? 'dev' : variant;
}
function getVariant(): AppVariant {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile === 'preview' || profile === 'production') {
    return profile;
  }
  // Local development targets the dev-client build by default.
  return 'development';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const variant = getVariant();
  const isProduction = variant === 'production';

  const identity = isProduction
    ? { name: 'Punto', scheme: BASE_SCHEME, identifier: BASE_IDENTIFIER }
    : (() => {
        const short = getShortVariant(variant);
        return {
          name: `Punto ${capitalize(short)}`,
          scheme: `${BASE_SCHEME}${short}`,
          identifier: `${BASE_IDENTIFIER}.${short}`,
        };
      })();

  return {
    ...config,
    name: identity.name,
    scheme: identity.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: identity.identifier,
    },
    android: {
      ...config.android,
      package: identity.identifier,
    },
  };
};
