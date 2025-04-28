import { tokenSecurityTool } from "./tokenSecurity.js";
import { nftSecurityTool } from "./nftSecurity.js";
import { maliciousAddressTool } from "./maliciousAddress.js";
import { phishingWebsiteTool } from "./phishingWebsite.js";
import { approvalSecurityTool } from "./approvalSecurity.js";
import { solanaTokenSecurityTool } from "./solanaTokenSecurity.js";
import { suiTokenSecurityTool } from "./suiTokenSecurity.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from '../utils/logger.js';
import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Export all tools
export const tools: Tool[] = [
  tokenSecurityTool,
  nftSecurityTool,
  maliciousAddressTool,
  phishingWebsiteTool,
  approvalSecurityTool,
  solanaTokenSecurityTool,
  suiTokenSecurityTool
];

// Export each tool individually
export {
  tokenSecurityTool,
  nftSecurityTool,
  maliciousAddressTool,
  phishingWebsiteTool,
  approvalSecurityTool,
  solanaTokenSecurityTool,
  suiTokenSecurityTool
};

// Context type for tool registration
export interface ToolContext {
  account?: string;
}

/**
 * Register all tools with the MCP server
 * @param server MCP server instance
 * @param ctx Context object containing additional information
 */
export function registerTools(server: McpServer, ctx: ToolContext) {
  for (const tool of tools) {
    if (!tool.inputSchema || !tool.handler) {
      logger.error(`Tool ${tool.name} is missing required properties`);
      continue;
    }

    server.tool(
      tool.name,
      tool.description || "",
      tool.inputSchema,
      async (args: any) => {
        try {
          const handler = tool.handler as (args: any) => Promise<any>;
          return await handler(args);
        } catch (error: any) {
          logger.error(`Error in tool ${tool.name}: ${error.message}`);
          
          // Handle specific error types
          let errorMessage = error.message;
          if (error.response) {
            // API error response
            errorMessage = `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
          } else if (error.request) {
            // Network error
            errorMessage = `Network Error: No response from server - ${error.message}`;
          }

          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                tool: tool.name,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        }
      }
    );
  }
} 