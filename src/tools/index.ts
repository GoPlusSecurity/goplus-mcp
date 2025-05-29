import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTokenSecurityTool } from "./tokenSecurity.js";
import { registerNftSecurityTool } from "./nftSecurity.js";
import { registerMaliciousAddressTool } from "./maliciousAddress.js";
import { registerPhishingWebsiteTool } from "./phishingWebsite.js";
import { registerApprovalSecurityTool } from "./approvalSecurity.js";
import { registerSolanaTokenSecurityTool } from "./solanaTokenSecurity.js";
import { registerSuiTokenSecurityTool } from "./suiTokenSecurity.js";

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
  try {
    // Register all tools
    registerTokenSecurityTool(server);
    registerNftSecurityTool(server);
    registerMaliciousAddressTool(server);
    registerPhishingWebsiteTool(server);
    registerApprovalSecurityTool(server);
    registerSolanaTokenSecurityTool(server);
    registerSuiTokenSecurityTool(server);
    
  } catch (error: any) {
    throw error;
  }
} 