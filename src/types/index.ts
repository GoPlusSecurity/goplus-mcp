// GoPlus API相关类型定义
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP request handler extra parameter type
 */
export type McpRequestHandlerExtra = {
  request: ServerRequest;
  notify: (notification: ServerNotification) => void;
};

/**
 * Token cache type
 */
export type TokenCache = {
  token: string;
  expiresAt: number; // Expiration timestamp
};

// API response type
export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

// Chain ID type
export enum ChainId {
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
  OPTIMISM = 10,
  FANTOM = 250,
} 