import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_CONFIG } from "./config/index.js";
import { tools } from "./tools/index.js";
import { McpRequestHandlerExtra } from "./types/index.js";
// Convert types to match SDK expected types

// Define the RequestHandlerExtra type required by the SDK

/**
 * Initialize the MCP server
 */
async function main() {
  try {
    // Create MCP server
    const server = new McpServer(MCP_SERVER_CONFIG);
    
    // Register all tools
    for (const tool of tools) {
      // Use type assertion to avoid type errors
      (server as any).tool(
        tool.name,
        tool.description,
        tool.schema,
        tool.handler
      );
    }
    
    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.exit(1);
  }
}

// Start server
main(); 