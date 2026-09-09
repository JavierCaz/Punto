import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

/**
 * Web color scheme hook with static-render hydration.
 *
 * To support static rendering, this value needs to be re-calculated on the
 * client side for web. Until the hydration frame fires we report 'light' to
 * avoid a server/client markup mismatch; afterwards the real scheme is used.
 * Non-dark values collapse to 'light' so callers only see 'light' | 'dark'.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Defer past the synchronous effect body to avoid a cascading render.
    const id = requestAnimationFrame(() => {
      setHasHydrated(true);
    });

    return () => {
      cancelAnimationFrame(id);
    };
  }, []);

  const systemScheme = useSystemColorScheme();

  if (hasHydrated) {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return 'light';
}
