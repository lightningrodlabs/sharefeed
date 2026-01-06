<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { settingsStore } from '$lib/stores';

  export let open = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  // Subscribe to settings store values
  $: fontSize = $settingsStore.fontSize;
  $: highContrast = $settingsStore.highContrast;
  $: showThumbnails = $settingsStore.showThumbnails;
  $: reducedMotion = $settingsStore.reducedMotion;

  function handleFontSizeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    settingsStore.setFontSize(parseInt(target.value, 10));
  }

  function handleHighContrastChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    settingsStore.setHighContrast(target.checked);
  }

  function handleShowThumbnailsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    settingsStore.setShowThumbnails(target.checked);
  }

  function handleReducedMotionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    settingsStore.setReducedMotion(target.checked);
  }

  function handleReset(): void {
    settingsStore.reset();
  }

  function handleClose(): void {
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }

  function handleOverlayClick(): void {
    dispatch('close');
  }

  function handlePanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  function handlePanelKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
  }
</script>

{#if open}
  <div
    class="panel-overlay"
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      class="accessibility-panel"
      class:high-contrast={highContrast}
      role="dialog"
      aria-label="Accessibility Settings"
      aria-modal="true"
      tabindex="-1"
      on:click={handlePanelClick}
      on:keydown={handlePanelKeydown}
    >
      <header class="panel-header">
        <h2>Display Settings</h2>
        <button
          type="button"
          class="close-button"
          on:click={handleClose}
          aria-label="Close settings"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div class="panel-content">
        <!-- Font Size -->
        <div class="setting-group">
          <label for="font-size" class="setting-label">
            <span class="label-text">Text Size</span>
            <span class="label-value">{fontSize}px</span>
          </label>
          <div class="slider-container">
            <span class="slider-label" aria-hidden="true">A</span>
            <input
              type="range"
              id="font-size"
              min="14"
              max="32"
              step="2"
              value={fontSize}
              on:input={handleFontSizeChange}
              aria-describedby="font-size-desc"
            />
            <span class="slider-label slider-label-large" aria-hidden="true">A</span>
          </div>
          <p id="font-size-desc" class="setting-description">
            Adjust the size of text throughout the app
          </p>
        </div>

        <!-- High Contrast -->
        <div class="setting-group">
          <label class="toggle-setting">
            <input
              type="checkbox"
              checked={highContrast}
              on:change={handleHighContrastChange}
            />
            <span class="toggle-switch" aria-hidden="true"></span>
            <span class="toggle-label">
              <span class="label-text">High Contrast</span>
              <span class="label-description">Increase contrast for better readability</span>
            </span>
          </label>
        </div>

        <!-- Show Thumbnails -->
        <div class="setting-group">
          <label class="toggle-setting">
            <input
              type="checkbox"
              checked={showThumbnails}
              on:change={handleShowThumbnailsChange}
            />
            <span class="toggle-switch" aria-hidden="true"></span>
            <span class="toggle-label">
              <span class="label-text">Show Thumbnails</span>
              <span class="label-description">Display preview images on cards</span>
            </span>
          </label>
        </div>

        <!-- Reduced Motion -->
        <div class="setting-group">
          <label class="toggle-setting">
            <input
              type="checkbox"
              checked={reducedMotion}
              on:change={handleReducedMotionChange}
            />
            <span class="toggle-switch" aria-hidden="true"></span>
            <span class="toggle-label">
              <span class="label-text">Reduce Motion</span>
              <span class="label-description">Minimize animations and transitions</span>
            </span>
          </label>
        </div>
      </div>

      <footer class="panel-footer">
        <button type="button" class="btn btn-secondary btn-block" on:click={handleReset}>
          Reset to Defaults
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    z-index: 100;
    padding: 16px;
  }

  .accessibility-panel {
    --panel-bg: #ffffff;
    --panel-border: #e5e7eb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --primary-color: #6366f1;
    --toggle-bg: #e5e7eb;
    --toggle-active: #6366f1;

    width: 100%;
    max-width: 400px;
    background: var(--panel-bg);
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: slideIn 0.2s ease-out;
  }

  .accessibility-panel.high-contrast {
    --panel-bg: #ffffff;
    --panel-border: #000000;
    --text-primary: #000000;
    --text-secondary: #1f2937;
    border: 3px solid #000000;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--panel-border);
  }

  .panel-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-button {
    padding: 8px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: background 0.2s, color 0.2s;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: var(--text-primary);
  }

  .close-button:focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }

  .panel-content {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label-text {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .label-value {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .slider-label {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
    width: 20px;
    text-align: center;
  }

  .slider-label-large {
    font-size: 22px;
  }

  input[type="range"] {
    flex: 1;
    height: 8px;
    background: var(--toggle-bg);
    border-radius: 4px;
    appearance: none;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--primary-color);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  input[type="range"]:focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 4px;
  }

  .setting-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .toggle-setting {
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    padding: 12px 0;
  }

  .toggle-setting input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-switch {
    position: relative;
    width: 52px;
    height: 28px;
    background: var(--toggle-bg);
    border-radius: 14px;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .toggle-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }

  .toggle-setting input:checked + .toggle-switch {
    background: var(--toggle-active);
  }

  .toggle-setting input:checked + .toggle-switch::after {
    transform: translateX(24px);
  }

  .toggle-setting input:focus-visible + .toggle-switch {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }

  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .label-description {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .panel-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--panel-border);
  }

  /* Touch-friendly sizes */
  @media (pointer: coarse) {
    .toggle-switch {
      width: 60px;
      height: 32px;
    }

    .toggle-switch::after {
      width: 28px;
      height: 28px;
    }

    .toggle-setting input:checked + .toggle-switch::after {
      transform: translateX(28px);
    }

    input[type="range"]::-webkit-slider-thumb {
      width: 32px;
      height: 32px;
    }
  }
</style>
