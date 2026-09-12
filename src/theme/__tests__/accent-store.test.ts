/**
 * @jest-environment node
 *
 * Accent store: hydration from a profile loader and session updates. The loader
 * is injected, so no SQLite/native code is involved.
 */

import { useAccentStore } from '@/theme/accent-store';

const loadProfile = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useAccentStore.setState({ accent: 'royal', hasHydrated: false });
});

describe('accent store', () => {
  it('defaults to royal before hydration', () => {
    expect(useAccentStore.getState().accent).toBe('royal');
  });

  it('hydrates the persisted accent from the business profile', async () => {
    loadProfile.mockResolvedValue({ accentColor: 'rose' });

    await useAccentStore.getState().hydrate(loadProfile);

    expect(useAccentStore.getState().accent).toBe('rose');
    expect(useAccentStore.getState().hasHydrated).toBe(true);
  });

  it('keeps the default when there is no business row yet', async () => {
    loadProfile.mockResolvedValue(null);

    await useAccentStore.getState().hydrate(loadProfile);

    expect(useAccentStore.getState().accent).toBe('royal');
  });

  it('falls back to the default when the persisted value is not an accent', async () => {
    loadProfile.mockResolvedValue({ accentColor: 'neon' });

    await useAccentStore.getState().hydrate(loadProfile);

    expect(useAccentStore.getState().accent).toBe('royal');
  });

  it('keeps the default when the loader fails', async () => {
    loadProfile.mockRejectedValue(new Error('db unavailable'));

    await useAccentStore.getState().hydrate(loadProfile);

    expect(useAccentStore.getState().accent).toBe('royal');
    expect(useAccentStore.getState().hasHydrated).toBe(true);
  });

  it('does not load the profile twice after hydration', async () => {
    loadProfile.mockResolvedValue({ accentColor: 'emerald' });
    await useAccentStore.getState().hydrate(loadProfile);

    loadProfile.mockResolvedValue({ accentColor: 'slate' });
    await useAccentStore.getState().hydrate(loadProfile);

    expect(useAccentStore.getState().accent).toBe('emerald');
    expect(loadProfile).toHaveBeenCalledTimes(1);
  });

  it('applies a session accent via setAccent', () => {
    useAccentStore.getState().setAccent('indigo');

    expect(useAccentStore.getState().accent).toBe('indigo');
  });
});
