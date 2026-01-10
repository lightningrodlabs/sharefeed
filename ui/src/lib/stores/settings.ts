import { writable, derived } from 'svelte/store';
import type { AccessibilitySettings } from '$lib/types';
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '$lib/types';

const browser = typeof window !== 'undefined';
const STORAGE_KEY = 'sharefeed_settings';

/**
 * Creates the settings store with Svelte 3 writable pattern.
 * Settings are persisted to localStorage.
 */
function createSettingsStore() {
  // Load initial settings from localStorage
  function loadSettings(): AccessibilitySettings {
    if (!browser) return DEFAULT_ACCESSIBILITY_SETTINGS;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed };
      }
    } catch {
      // Use defaults on error
    }
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }

  const settings = writable<AccessibilitySettings>(loadSettings());

  // Save to localStorage whenever settings change
  if (browser) {
    settings.subscribe((value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Ignore storage errors
      }
    });
  }

  // Derived values for convenience
  const fontSize = derived(settings, ($s) => $s.fontSize);
  const highContrast = derived(settings, ($s) => $s.highContrast);
  const showThumbnails = derived(settings, ($s) => $s.showThumbnails);
  const reducedMotion = derived(settings, ($s) => $s.reducedMotion);

  function setFontSize(size: number): void {
    const clamped = Math.max(14, Math.min(32, size));
    settings.update((s) => ({ ...s, fontSize: clamped }));
  }

  function setHighContrast(enabled: boolean): void {
    settings.update((s) => ({ ...s, highContrast: enabled }));
  }

  function setShowThumbnails(show: boolean): void {
    settings.update((s) => ({ ...s, showThumbnails: show }));
  }

  function setReducedMotion(reduced: boolean): void {
    settings.update((s) => ({ ...s, reducedMotion: reduced }));
  }

  function reset(): void {
    settings.set({ ...DEFAULT_ACCESSIBILITY_SETTINGS });
  }

  // Create a subscribable store that includes derived values
  // This allows components to do $settingsStore.fontSize
  const combinedStore = derived(settings, ($s) => ({
    ...$s,
    fontSize: $s.fontSize,
    highContrast: $s.highContrast,
    showThumbnails: $s.showThumbnails,
    reducedMotion: $s.reducedMotion,
  }));

  return {
    // Main subscribable store
    subscribe: combinedStore.subscribe,
    // Individual derived stores
    fontSize,
    highContrast,
    showThumbnails,
    reducedMotion,
    // Methods
    setFontSize,
    setHighContrast,
    setShowThumbnails,
    setReducedMotion,
    reset,
  };
}

export const settingsStore = createSettingsStore();
