import { useColorScheme as useSystemColorScheme } from 'react-native';

/**
 * Normalized OS color scheme: returns only 'light' | 'dark'.
 * react-native can report 'unspecified'/'null'; callers only ever need a
 * concrete scheme, so collapse anything non-dark to 'light'.
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useSystemColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
