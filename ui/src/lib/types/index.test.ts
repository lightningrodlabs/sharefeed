import { describe, it, expect } from 'vitest';
import type { AccessibilitySettings } from './index';
import { DEFAULT_ACCESSIBILITY_SETTINGS } from './index';

describe('DEFAULT_ACCESSIBILITY_SETTINGS', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.fontSize).toBe(18);
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.highContrast).toBe(false);
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.showThumbnails).toBe(true);
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.reducedMotion).toBe(false);
  });

  it('should satisfy AccessibilitySettings type', () => {
    const settings: AccessibilitySettings = DEFAULT_ACCESSIBILITY_SETTINGS;
    expect(settings).toHaveProperty('fontSize');
    expect(settings).toHaveProperty('highContrast');
    expect(settings).toHaveProperty('showThumbnails');
    expect(settings).toHaveProperty('reducedMotion');
  });
});
