/**
 * Holochain client module exports.
 */

export { ShareFeedClient, ROLE_NAME, ZOME_NAME } from './client';
export { connect, disconnect, getClient, getAppClient, isConnected, APP_ID } from './connection';
export type {
  ShareItem,
  ShareItemInfo,
  Feed,
  FeedInfo,
  TimeRangeInput,
  UpdateShareItemInput,
  UpdateFeedInput,
  AddShareToFeedInput,
  RemoveShareFromFeedInput,
  AddMemberToFeedInput,
  ActionHash,
  AgentPubKey,
  HcRecord,
  Timestamp,
} from './types';
