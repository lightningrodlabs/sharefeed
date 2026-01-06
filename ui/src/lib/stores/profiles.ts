import { writable, type Writable } from 'svelte/store';
import { ProfilesClient, ProfilesStore as ProfilesStoreClass } from '@holochain-open-dev/profiles';
import type { AppClient } from '@holochain/client';

export const profilesStore: Writable<ProfilesStoreClass | null> = writable(null);

export function initProfilesStore(client: AppClient, roleName: string): void {
  const profilesClient = new ProfilesClient(client, roleName);
  const store = new ProfilesStoreClass(profilesClient, {
    avatarMode: 'avatar-optional',
    minNicknameLength: 3,
  });
  profilesStore.set(store);
}
