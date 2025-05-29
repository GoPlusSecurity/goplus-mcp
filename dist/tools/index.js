"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTools = registerTools;
const tokenSecurity_js_1 = require("./tokenSecurity.js");
const nftSecurity_js_1 = require("./nftSecurity.js");
const maliciousAddress_js_1 = require("./maliciousAddress.js");
const phishingWebsite_js_1 = require("./phishingWebsite.js");
const approvalSecurity_js_1 = require("./approvalSecurity.js");
const solanaTokenSecurity_js_1 = require("./solanaTokenSecurity.js");
const suiTokenSecurity_js_1 = require("./suiTokenSecurity.js");
/**
 * Register all tools with the MCP server
 * @param server MCP server instance
 * @param ctx Context object containing additional information
 */
function registerTools(server, ctx) {
    try {
        // Register all tools
        (0, tokenSecurity_js_1.registerTokenSecurityTool)(server);
        (0, nftSecurity_js_1.registerNftSecurityTool)(server);
        (0, maliciousAddress_js_1.registerMaliciousAddressTool)(server);
        (0, phishingWebsite_js_1.registerPhishingWebsiteTool)(server);
        (0, approvalSecurity_js_1.registerApprovalSecurityTool)(server);
        (0, solanaTokenSecurity_js_1.registerSolanaTokenSecurityTool)(server);
        (0, suiTokenSecurity_js_1.registerSuiTokenSecurityTool)(server);
    }
    catch (error) {
        throw error;
    }
}
