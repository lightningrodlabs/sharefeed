<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { profilesStore } from '$lib/stores';
  import '@holochain-open-dev/profiles/dist/elements/create-profile.js';
  import '@holochain-open-dev/profiles/dist/elements/update-profile.js';
  import { toPromise } from '@holochain-open-dev/stores';

  export let open = false;

  const dispatch = createEventDispatcher();

  let hasProfile = false;
  let loading = true;

  // Check if user has a profile when dialog opens
  $: if (open && $profilesStore) {
    checkProfile();
  }

  async function checkProfile() {
    if (!$profilesStore) return;
    loading = true;
    try {
      const myProfile = await toPromise($profilesStore.myProfile);
      hasProfile = !!myProfile;
    } catch (err) {
      console.error('Failed to check profile:', err);
      hasProfile = false;
    }
    loading = false;
  }

  function handleClose() {
    open = false;
    dispatch('close');
  }

  function handleProfileCreated() {
    dispatch('profile-created');
    handleClose();
  }

  function handleProfileUpdated() {
    dispatch('profile-updated');
    handleClose();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="dialog-backdrop"
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-label="Profile settings"
  >
    <div class="dialog-content" class:create-mode={!hasProfile && !loading}>
      {#if loading}
        <header class="dialog-header">
          <h2>Loading...</h2>
        </header>
        <div class="dialog-body">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      {:else if hasProfile}
        <header class="dialog-header">
          <h2 id="profile-dialog-title">Edit Profile</h2>
          <button
            type="button"
            class="close-button"
            on:click={handleClose}
            aria-label="Close dialog"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div class="dialog-body">
          <update-profile
            on:profile-updated={handleProfileUpdated}
            on:cancel-edit-profile={handleClose}
          ></update-profile>
        </div>
      {:else}
        <button
          type="button"
          class="close-button floating"
          on:click={handleClose}
          aria-label="Close dialog"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <create-profile
          on:profile-created={handleProfileCreated}
          on:cancel-create-profile={handleClose}
        ></create-profile>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog-content {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    max-width: 480px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: #6b7280;
    transition: background 0.2s, color 0.2s;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: #1f2937;
  }

  .close-button:focus-visible {
    outline: 3px solid #6366f1;
    outline-offset: 2px;
  }

  .close-button.floating {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .dialog-content.create-mode {
    position: relative;
    padding: 0;
  }

  .dialog-content.create-mode create-profile {
    display: block;
  }

  .dialog-body {
    padding: 24px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-state p {
    margin: 0;
    color: #6b7280;
    font-size: 16px;
  }

  /* Style the profile web components (they use Shoelace internally) */
  create-profile,
  update-profile {
    /* Primary action button color */
    --sl-color-primary-600: #6366f1;
    --sl-color-primary-700: #4f46e5;

    /* Button styling to match our app */
    --sl-input-border-radius-medium: 12px;

    /* Focus ring */
    --sl-focus-ring-color: #6366f1;
  }
</style>
