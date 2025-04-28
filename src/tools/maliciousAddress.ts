import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { logger } from '../utils/logger.js';

export const maliciousAddressTool: Tool = {
  name: "maliciousAddress",
  description: "Detect if an address is associated with malicious activities",
  inputSchema: {
    type: "object",
    properties: {
      chainId: {
        type: "string",
        description: "The chain ID (e.g., '1' for Ethereum mainnet)"
      },
      address: {
        type: "string",
        description: "The address to check"
      }
    },
    required: ["chainId", "address"]
  },
  handler: async (args: any) => {
    try {
      const { chainId, address } = args;
      
      // Get authorization header
      const authHeader = tokenManager.getAuthorizationHeader();
      if (!authHeader) {
        throw new Error("No valid GoPlus API token available");
      }

      // Make request to GoPlus API
      const response = await axios.get(
        `https://api.gopluslabs.io/api/v1/address_security/${chainId}?addresses=${address}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      const data = response.data;
      if (!data || !data.code || data.code !== 1) {
        throw new Error(data?.message || "Failed to fetch address security data");
      }

      const results = data.data;
      if (!results || Object.keys(results).length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No security data found for this address"
            }, null, 2)
          }]
        };
      }

      const addressData = results[address];
      if (!addressData) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No security data found for this address"
            }, null, 2)
          }]
        };
      }

      // Extract security information
      const securityInfo = {
        address,
        chainId,
        risks: {
          high: [] as string[],
          medium: [] as string[],
          low: [] as string[]
        },
        warnings: [] as string[]
      };

      // Check for high risks
      if (addressData.is_contract === "1") {
        securityInfo.risks.high.push("🔴 Address is a contract");
      }
      if (addressData.is_proxy === "1") {
        securityInfo.risks.high.push("🔴 Address is a proxy contract");
      }
      if (addressData.is_honeypot === "1") {
        securityInfo.risks.high.push("🔴 Address is associated with honeypot scams");
      }
      if (addressData.is_blacklisted === "1") {
        securityInfo.risks.high.push("🔴 Address is blacklisted");
      }

      // Check for medium risks
      if (addressData.is_verified === "0") {
        securityInfo.risks.medium.push("🟡 Contract is not verified");
      }
      if (addressData.is_airdrop_scam === "1") {
        securityInfo.risks.medium.push("🟡 Address is associated with airdrop scams");
      }

      // Check for low risks
      if (addressData.is_contract === "0") {
        securityInfo.risks.low.push("🟢 Address is an EOA (Externally Owned Account)");
      }
      if (addressData.is_verified === "1") {
        securityInfo.risks.low.push("🟢 Contract is verified");
      }

      // Add warnings
      if (addressData.warning_count > 0) {
        securityInfo.warnings.push(`⚠️ ${addressData.warning_count} warnings found`);
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
              rawData: addressData
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error(`Error in maliciousAddress tool: ${error.message}`);
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