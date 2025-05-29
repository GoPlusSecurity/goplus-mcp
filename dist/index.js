#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const index_js_1 = require("./config/index.js");
const index_js_2 = require("./tools/index.js");
const api_js_1 = require("./utils/api.js");
const tokenManager_js_1 = require("./utils/tokenManager.js");
/**
 * Main function to start the GoPlus MCP Server
 */
async function main() {
    try {
        // Validate API credentials
        if (!index_js_1.GOPLUS_API_KEY || !index_js_1.GOPLUS_API_SECRET) {
            console.error("Error: GoPlus API credentials not provided. Please use --key and --secret options.");
            // process.exit(1);
        }
        // Get and cache the access token
        try {
            const token = await (0, api_js_1.getGoPlusAccessToken)();
            tokenManager_js_1.tokenManager.setGoPlusToken(token);
        }
        catch (error) {
            console.error(`Error: Failed to obtain GoPlus API access token: ${error.message}`);
            // process.exit(1);
        }
        // Create MCP server
        const server = new mcp_js_1.McpServer(index_js_1.MCP_SERVER_CONFIG);
        // Register all tools
        (0, index_js_2.registerTools)(server, {});
        // Start server
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
    }
    catch (error) {
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
