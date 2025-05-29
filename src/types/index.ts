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

// Chain ID enumeration
export enum ChainId {
  // EVM Chains
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
  OPTIMISM = 10,
  FANTOM = 250,
  CRONOS = 25,
  HECO = 128,
  GNOSIS = 100,
  KCC = 321,
  OPBNB = 204,
  ZKSYNC_ERA = 324,
  LINEA = 59144,
  BASE = 8453,
  MANTLE = 5000,
  UNICHAIN = 130,
  SCROLL = 534352,
  FON = 201022,
  ZKFAIR = 42766,
  MORPH = 2818,
  SONEIUM = 1868,
  STORY = 1514,
  SONIC = 146,
  ABSTRACT = 2741,
  HASHKEY = 177,
  BERACHAIN = 80094,
  MONAD = 10143,
  WORLD_CHAIN = 480,
  BLAST = 81457,
  GRAVITY = 1625,
  MINT = 185,
  ZIRCUIT = 48899,
  X_LAYER = 196,
  ZKLINK_NOVA = 810180,
  BITLAYER = 200901,
  MERLIN = 4200,
  MANTA_PACIFIC = 169
}

// Chain ID to name mapping
export const ChainIdToName: Record<ChainId, string> = {
  [ChainId.ETHEREUM]: "Ethereum",
  [ChainId.BSC]: "BSC",
  [ChainId.POLYGON]: "Polygon",
  [ChainId.ARBITRUM]: "Arbitrum",
  [ChainId.AVALANCHE]: "Avalanche",
  [ChainId.OPTIMISM]: "Optimism",
  [ChainId.FANTOM]: "Fantom",
  [ChainId.CRONOS]: "Cronos",
  [ChainId.HECO]: "HECO",
  [ChainId.GNOSIS]: "Gnosis",
  [ChainId.KCC]: "KCC",
  [ChainId.OPBNB]: "opBNB",
  [ChainId.ZKSYNC_ERA]: "zkSync Era",
  [ChainId.LINEA]: "Linea Mainnet",
  [ChainId.BASE]: "Base",
  [ChainId.MANTLE]: "Mantle",
  [ChainId.UNICHAIN]: "Unichain",
  [ChainId.SCROLL]: "Scroll",
  [ChainId.FON]: "FON",
  [ChainId.ZKFAIR]: "ZKFair",
  [ChainId.MORPH]: "Morph",
  [ChainId.SONEIUM]: "Soneium",
  [ChainId.STORY]: "Story",
  [ChainId.SONIC]: "Sonic",
  [ChainId.ABSTRACT]: "Abstract",
  [ChainId.HASHKEY]: "Hashkey",
  [ChainId.BERACHAIN]: "Berachain",
  [ChainId.MONAD]: "Monad",
  [ChainId.WORLD_CHAIN]: "World Chain",
  [ChainId.BLAST]: "Blast",
  [ChainId.GRAVITY]: "Gravity",
  [ChainId.MINT]: "Mint",
  [ChainId.ZIRCUIT]: "Zircuit",
  [ChainId.X_LAYER]: "X Layer Mainnet",
  [ChainId.ZKLINK_NOVA]: "zkLink Nova",
  [ChainId.BITLAYER]: "Bitlayer Mainnet",
  [ChainId.MERLIN]: "Merlin",
  [ChainId.MANTA_PACIFIC]: "Manta Pacific"
};

// Helper function to get chain name from chain ID
export function getChainName(chainId: ChainId): string {
  return ChainIdToName[chainId] || "Unknown Chain";
}

// Helper function to get chain ID from string
export function getChainIdFromString(chainId: string): ChainId | undefined {
  // Handle numeric chain IDs
  const numericId = parseInt(chainId);
  if (!isNaN(numericId)) {
    return numericId as ChainId;
  }
  return undefined;
} 