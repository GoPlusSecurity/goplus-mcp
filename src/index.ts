#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_CONFIG, GOPLUS_API_KEY, GOPLUS_API_SECRET } from "./config/index.js";
import { registerTools } from "./tools/index.js";
import { getGoPlusAccessToken } from "./utils/api.js";
import { tokenManager } from "./utils/tokenManager.js";

/**
 * Main function to start the GoPlus MCP Server
 */
async function main() {
  try {
    // Validate API credentials
    if (!GOPLUS_API_KEY || !GOPLUS_API_SECRET) {
      console.error("Error: GoPlus API credentials not provided. Please use --key and --secret options.");
      // process.exit(1);
    }
    
    // Get and cache the access token
    try {
      const token = await getGoPlusAccessToken();
      tokenManager.setGoPlusToken(token);
    } catch (error: any) {
      console.error(`Error: Failed to obtain GoPlus API access token: ${error.message}`);
      // process.exit(1);
    }

    // Create MCP server
    const server = new McpServer(MCP_SERVER_CONFIG);
    
    // Register all tools
    registerTools(server, {});
    
    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (error: any) {
    console.error(`Error: Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Start server
main().catch((error) => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 