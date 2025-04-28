import { tokenSecurityTool } from "./tokenSecurity.js";
import { nftSecurityTool } from "./nftSecurity.js";
import { maliciousAddressTool } from "./maliciousAddress.js";
import { phishingWebsiteTool } from "./phishingWebsite.js";
import { approvalSecurityTool } from "./approvalSecurity.js";
import { solanaTokenSecurityTool } from "./solanaTokenSecurity.js";
import { suiTokenSecurityTool } from "./suiTokenSecurity.js";
// Export all tools
export const tools = [
    tokenSecurityTool,
    nftSecurityTool,
    maliciousAddressTool,
    phishingWebsiteTool,
    approvalSecurityTool,
    solanaTokenSecurityTool,
    suiTokenSecurityTool
];
// Export each tool individually
export { tokenSecurityTool, nftSecurityTool, maliciousAddressTool, phishingWebsiteTool, approvalSecurityTool, solanaTokenSecurityTool, suiTokenSecurityTool };
/**
 * Register all tools with the MCP server
 * @param server MCP server instance
 * @param ctx Context object containing additional information
 */
export function registerTools(server, ctx) {
    for (const tool of tools) {
        server.tool(tool.name, tool.description, tool.schema, async (args, extra) => {
            try {
                return await tool.handler(args, { ...extra, ctx });
            }
            catch (error) {
                console.error(`Error in tool ${tool.name}:`, error);
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: error.message,
                                tool: tool.name
                            }, null, 2)
                        }]
                };
            }
        });
    }
}
