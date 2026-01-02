/**
 * ShareFeed Holochain client.
 * Provides typed methods for all zome calls.
 */

import type {
  AppClient,
  AppCallZomeRequest,
  Record as HcRecord,
} from '@holochain/client';
import type {
  ShareItem,
  ShareItemInfo,
  UpdateShareItemInput,
  TimeRangeInput,
  Feed,
  FeedInfo,
  UpdateFeedInput,
  AddShareToFeedInput,
  RemoveShareFromFeedInput,
  AddMemberToFeedInput,
  ActionHash,
  AgentPubKey,
} from './types';

export const ROLE_NAME = 'sharefeed';
export const ZOME_NAME = 'sharefeed';

export class ShareFeedClient {
  constructor(
    public client: AppClient,
    public roleName: string = ROLE_NAME,
    public zomeName: string = ZOME_NAME
  ) {}

  // ========== ShareItem Operations ==========

  async createShareItem(shareItem: ShareItem): Promise<HcRecord> {
    return await this.callZome('create_share_item', shareItem);
  }

  async getShareItem(actionHash: ActionHash): Promise<HcRecord | null> {
    return await this.callZome('get_share_item', actionHash);
  }

  async updateShareItem(input: UpdateShareItemInput): Promise<HcRecord> {
    return await this.callZome('update_share_item', input);
  }

  async deleteShareItem(actionHash: ActionHash): Promise<ActionHash> {
    return await this.callZome('delete_share_item', actionHash);
  }

  async getSharesForWeek(input: TimeRangeInput): Promise<ShareItemInfo[]> {
    return await this.callZome('get_shares_for_week', input);
  }

  async getRecentShares(): Promise<ShareItemInfo[]> {
    return await this.callZome('get_recent_shares', null);
  }

  // ========== Feed Operations ==========

  async createFeed(feed: Feed): Promise<HcRecord> {
    return await this.callZome('create_feed', feed);
  }

  async getFeed(actionHash: ActionHash): Promise<HcRecord | null> {
    return await this.callZome('get_feed', actionHash);
  }

  async updateFeed(input: UpdateFeedInput): Promise<HcRecord> {
    return await this.callZome('update_feed', input);
  }

  async deleteFeed(actionHash: ActionHash): Promise<ActionHash> {
    return await this.callZome('delete_feed', actionHash);
  }

  async getMyFeeds(): Promise<FeedInfo[]> {
    return await this.callZome('get_my_feeds', null);
  }

  // ========== Feed Membership Operations ==========

  async addShareToFeed(input: AddShareToFeedInput): Promise<void> {
    return await this.callZome('add_share_to_feed', input);
  }

  async removeShareFromFeed(input: RemoveShareFromFeedInput): Promise<void> {
    return await this.callZome('remove_share_from_feed', input);
  }

  async getFeedShares(feedHash: ActionHash): Promise<ShareItemInfo[]> {
    return await this.callZome('get_feed_shares', feedHash);
  }

  async addMemberToFeed(input: AddMemberToFeedInput): Promise<void> {
    return await this.callZome('add_member_to_feed', input);
  }

  async getFeedMembers(feedHash: ActionHash): Promise<AgentPubKey[]> {
    return await this.callZome('get_feed_members', feedHash);
  }

  // ========== Private Helper ==========

  private async callZome<T>(fnName: string, payload: unknown): Promise<T> {
    const req: AppCallZomeRequest = {
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name: fnName,
      payload,
    };
    return await this.client.callZome(req);
  }
}
