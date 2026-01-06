<script lang="ts">
  import { profilesStore } from '$lib/stores';
  import { createEventDispatcher } from 'svelte';
  import { getAppClient } from '$lib/holochain';
  import { encodeHashToBase64 } from '@holochain/client';
  import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';

  const dispatch = createEventDispatcher();

  // Get the myProfile observable from the profiles store
  $: myProfileStore = $profilesStore?.myProfile;
  // Subscribe to it reactively
  $: myProfileStatus = myProfileStore ? $myProfileStore : null;
  $: loading = !myProfileStatus || myProfileStatus.status === 'pending';
  $: profile = myProfileStatus?.status === 'complete' && myProfileStatus?.value
    ? { nickname: myProfileStatus.value.entry.nickname, fields: myProfileStatus.value.entry.fields }
    : null;

  // Get the current agent's pub key for the avatar
  $: client = getAppClient();
  $: myPubKey = client?.myPubKey ? encodeHashToBase64(client.myPubKey) : null;

  function handleClick() {
    dispatch('click');
  }
</script>

<button
  type="button"
  class="profile-button"
  on:click={handleClick}
  aria-label={profile ? `Profile: ${profile.nickname}` : 'Create profile'}
  title={profile ? profile.nickname : 'Create profile'}
>
  {#if loading}
    <div class="loading-indicator"></div>
  {:else if profile && myPubKey}
    <agent-avatar
      size="32"
      agent-pub-key={myPubKey}
      disable-tooltip={true}
      disable-copy={true}
    ></agent-avatar>
  {:else}
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  {/if}
</button>

<style>
  .profile-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 0;
    background: none;
    border: 2px solid var(--header-border, #e5e7eb);
    border-radius: 12px;
    cursor: pointer;
    color: var(--text-secondary, #6b7280);
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .profile-button:hover {
    background: #f9fafb;
    border-color: var(--primary-color, #6366f1);
    color: var(--primary-color, #6366f1);
  }

  .profile-button:focus-visible {
    outline: 3px solid var(--primary-color, #6366f1);
    outline-offset: 2px;
  }

  .profile-button:active {
    transform: scale(0.95);
  }

  .loading-indicator {
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top-color: var(--primary-color, #6366f1);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  agent-avatar {
    --agent-avatar-size: 32px;
  }
</style>
