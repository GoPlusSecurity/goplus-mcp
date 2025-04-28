import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { logger } from '../utils/logger.js';

export const solanaTokenSecurityTool: Tool = {
  name: "solanaTokenSecurity",
  description: "Analyze Solana token security and detect potential risks",
  inputSchema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The Solana token address"
      }
    },
    required: ["address"]
  },
  handler: async (args: any) => {
    try {
      const { address } = args;
      
      // Get authorization header
      const authHeader = tokenManager.getAuthorizationHeader();
      if (!authHeader) {
        throw new Error("No valid GoPlus API token available");
      }

      // Make request to GoPlus API
      const response = await axios.get(
        `https://api.gopluslabs.io/api/v1/solana/token_security?addresses=${address}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      const data = response.data;
      if (!data || !data.code || data.code !== 1) {
        throw new Error(data?.message || "Failed to fetch Solana token security data");
      }

      const results = data.data;
      if (!results || Object.keys(results).length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No security data found for this Solana token"
            }, null, 2)
          }]
        };
      }

      const tokenAddress = Object.keys(results)[0];
      const tokenData = results[tokenAddress];

      // Extract security information
      const securityInfo = {
        address: tokenAddress,
        risks: {
          high: [] as string[],
          medium: [] as string[],
          low: [] as string[]
        },
        metadata: {
          name: tokenData.name || 'Unknown',
          symbol: tokenData.symbol || 'Unknown',
          decimals: tokenData.decimals || 'Unknown',
          supply: tokenData.supply || 'Unknown'
        }
      };

      // Check for high risks
      if (tokenData.is_proxy === "1") {
        securityInfo.risks.high.push("🔴 Token is a proxy contract");
      }
      if (tokenData.is_mintable === "1") {
        securityInfo.risks.high.push("🔴 Token is mintable");
      }
      if (tokenData.is_blacklisted === "1") {
        securityInfo.risks.high.push("🔴 Token is blacklisted");
      }

      // Check for medium risks
      if (tokenData.is_verified === "0") {
        securityInfo.risks.medium.push("🟡 Token is not verified");
      }
      if (tokenData.is_airdrop_scam === "1") {
        securityInfo.risks.medium.push("🟡 Token is associated with airdrop scams");
      }

      // Check for low risks
      if (tokenData.is_verified === "1") {
        securityInfo.risks.low.push("🟢 Token is verified");
      }
      if (tokenData.is_whitelisted === "1") {
        securityInfo.risks.low.push("🟢 Token is whitelisted");
      }

      // Calculate security score
      const riskCount = 
        securityInfo.risks.high.length * 2 + 
        securityInfo.risks.medium.length;
      const securityScore = Math.max(0, 100 - (riskCount * 15));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            data: {
              ...securityInfo,
              securityScore,
              riskCount,
              rawData: tokenData
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error(`Error in solanaTokenSecurity tool: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }
}; 