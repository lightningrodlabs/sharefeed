/**
 * Holochain connection management.
 * Handles connecting to the conductor in different environments.
 */

import {
  AppWebsocket,
  AdminWebsocket,
  type AppClient,
  type AppWebsocketConnectionOptions,
} from '@holochain/client';
import { ShareFeedClient } from './client';

export const APP_ID = 'sharefeed';

let client: AppClient | null = null;
let shareFeedClient: ShareFeedClient | null = null;

export interface ConnectionOptions {
  /** Admin port for dev mode (issues auth token) */
  adminPort?: number;
  /** App port for WebSocket connection */
  appPort?: number;
  /** Full URL override */
  url?: string;
}

/**
 * Connect to the Holochain conductor.
 * In production (Kangaroo), uses launcher API.
 * In development, connects directly with optional admin auth.
 */
export async function connect(options: ConnectionOptions = {}): Promise<ShareFeedClient> {
  if (shareFeedClient) {
    return shareFeedClient;
  }

  // Check for Kangaroo/launcher environment
  const launcher = (window as unknown as { __HC_LAUNCHER__?: HcLauncher }).__HC_LAUNCHER__;

  if (launcher) {
    // Production: use launcher API
    const appPort = await launcher.getAppPort();
    const token = await launcher.getAppToken();
    const wsOptions: AppWebsocketConnectionOptions = {
      url: new URL(`ws://localhost:${appPort}`),
      token,
    };
    client = await AppWebsocket.connect(wsOptions);
  } else {
    // Development: connect directly
    const adminPort = options.adminPort || getEnvPort('VITE_ADMIN_PORT');
    const appPort = options.appPort || getEnvPort('VITE_APP_PORT') || 30000;
    const url = options.url || `ws://localhost:${appPort}`;

    let token: Uint8Array | undefined;

    // If admin port is available, get auth token
    if (adminPort) {
      const adminWs = await AdminWebsocket.connect({ url: new URL(`ws://localhost:${adminPort}`) });
      const tokenResp = await adminWs.issueAppAuthenticationToken({
        installed_app_id: APP_ID,
      });
      token = tokenResp.token;

      // Authorize signing credentials
      const cellIds = await adminWs.listCellIds();
      if (cellIds.length > 0) {
        await adminWs.authorizeSigningCredentials(cellIds[0]);
      }
    }

    const wsOptions: AppWebsocketConnectionOptions = {
      url: new URL(url),
      defaultTimeout: 30000,
    };
    if (token) {
      wsOptions.token = token;
    }

    client = await AppWebsocket.connect(wsOptions);
  }

  shareFeedClient = new ShareFeedClient(client);
  return shareFeedClient;
}

/**
 * Get the current ShareFeed client.
 * Returns null if not connected.
 */
export function getClient(): ShareFeedClient | null {
  return shareFeedClient;
}

/**
 * Get the raw AppClient.
 * Returns null if not connected.
 */
export function getAppClient(): AppClient | null {
  return client;
}

/**
 * Disconnect from the conductor.
 */
export async function disconnect(): Promise<void> {
  if (client) {
    // AppWebsocket doesn't have a disconnect method in current API
    // Just clear the references
    client = null;
    shareFeedClient = null;
  }
}

/**
 * Check if connected to the conductor.
 */
export function isConnected(): boolean {
  return client !== null;
}

// Helper to get port from Vite environment
function getEnvPort(envVar: string): number | undefined {
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && env[envVar]) {
      return parseInt(env[envVar], 10);
    }
  }
  return undefined;
}

// Launcher API type
interface HcLauncher {
  getAppPort(): Promise<number>;
  getAppToken(): Promise<Uint8Array>;
}
