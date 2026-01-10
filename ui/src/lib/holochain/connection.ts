/**
 * Holochain connection management.
 * Handles connecting to the conductor in different environments:
 * - Moss/Weave context (uses WeaveClient)
 * - Kangaroo launcher (uses launcher API)
 * - Development (uses direct WebSocket)
 */

import {
  AppWebsocket,
  AdminWebsocket,
  type AppClient,
  type AppWebsocketConnectionOptions,
} from '@holochain/client';
import { WeaveClient, isWeaveContext, initializeHotReload } from '@theweave/api';
import { ShareFeedClient } from './client';
import { appletServices } from '../../we';
import { initProfilesStore } from '$lib/stores/profiles';

export const APP_ID = 'sharefeed';

let client: AppClient | null = null;
let shareFeedClient: ShareFeedClient | null = null;
let weaveClient: WeaveClient | null = null;

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
 * Priority order:
 * 1. Moss/Weave context (uses WeaveClient)
 * 2. Kangaroo launcher (uses launcher API)
 * 3. Development (uses direct WebSocket)
 */
export async function connect(options: ConnectionOptions = {}): Promise<ShareFeedClient> {
  if (shareFeedClient) {
    return shareFeedClient;
  }

  // Initialize hot reload for Moss dev mode
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    try {
      await initializeHotReload();
    } catch {
      // Expected to fail outside Moss context
    }
  }

  // Check for Moss/Weave context first
  if (isWeaveContext()) {
    weaveClient = await WeaveClient.connect(appletServices);
    if (weaveClient.renderInfo.type === 'applet-view') {
      client = weaveClient.renderInfo.appletClient;
    } else {
      throw new Error('Unsupported Weave render type');
    }
  } else {
    // Check for Kangaroo/launcher environment
    const launcher = (window as unknown as { __HC_LAUNCHER__?: HcLauncher }).__HC_LAUNCHER__;

    if (launcher) {
      // Production: use launcher API
      const appPort = await launcher.getAppPort();
      const launcherToken = await launcher.getAppToken();
      // Convert Uint8Array to number[] if needed (AppWebsocketConnectionOptions expects number[])
      const token = launcherToken instanceof Uint8Array
        ? Array.from(launcherToken)
        : launcherToken;
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

      let token: number[] | undefined;

      // If admin port is available, get auth token
      if (adminPort) {
        const adminWs = await AdminWebsocket.connect({ url: new URL(`ws://localhost:${adminPort}`) });
        const tokenResp = await adminWs.issueAppAuthenticationToken({
          installed_app_id: APP_ID,
        });
        // Convert Uint8Array to number[] if needed (AppWebsocketConnectionOptions expects number[])
        token = tokenResp.token instanceof Uint8Array
          ? Array.from(tokenResp.token)
          : tokenResp.token;

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
  }

  shareFeedClient = new ShareFeedClient(client);

  // Initialize ProfilesStore with the connected client
  initProfilesStore(client, 'sharefeed');

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
 * Get the WeaveClient if in Moss context.
 * Returns null if not in Moss or not connected.
 */
export function getWeaveClient(): WeaveClient | null {
  return weaveClient;
}

/**
 * Check if running in Moss/Weave context.
 */
export function inWeaveContext(): boolean {
  return isWeaveContext();
}

/**
 * Disconnect from the conductor.
 */
export async function disconnect(): Promise<void> {
  // Clear all client references
  client = null;
  shareFeedClient = null;
  weaveClient = null;
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
