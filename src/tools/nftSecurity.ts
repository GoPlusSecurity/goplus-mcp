import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { logger } from '../utils/logger.js';

export const nftSecurityTool: Tool = {
  name: "nftSecurity",
  description: "Analyze NFT contract security and detect potential risks",
  inputSchema: {
    type: "object",
    properties: {
      chainId: {
        type: "string",
        description: "The chain ID (e.g., '1' for Ethereum mainnet)"
      },
      address: {
        type: "string",
        description: "The NFT contract address"
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
        `https://api.gopluslabs.io/api/v1/nft_security/${chainId}?contract_addresses=${address}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      const data = response.data;
      if (!data || !data.code || data.code !== 1) {
        throw new Error(data?.message || "Failed to fetch NFT security data");
      }

      const results = data.data;
      if (!results || Object.keys(results).length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No security data found for this NFT contract"
            }, null, 2)
          }]
        };
      }

      const contractAddress = Object.keys(results)[0];
      const contractData = results[contractAddress];

      // Extract security information
      const securityInfo = {
        address: contractAddress,
        chainId,
        metadata: {
          name: contractData.name || 'Unknown',
          symbol: contractData.symbol || 'Unknown',
          totalSupply: contractData.total_supply || 'Unknown',
          owner: contractData.owner || 'Unknown'
        },
        risks: {
          high: [] as string[],
          medium: [] as string[],
          low: [] as string[]
        },
        warnings: [] as string[]
      };

      // Check for high risks
      if (contractData.is_proxy === "1") {
        securityInfo.risks.high.push("🔴 Contract is a proxy contract");
      }
      if (contractData.is_mintable === "1") {
        securityInfo.risks.high.push("🔴 Contract is mintable");
      }
      if (contractData.is_blacklist === "1") {
        securityInfo.risks.high.push("🔴 Contract has blacklist functionality");
      }
      if (contractData.is_honeypot === "1") {
        securityInfo.risks.high.push("🔴 Contract is identified as a honeypot");
      }
      if (contractData.is_airdrop_scam === "1") {
        securityInfo.risks.high.push("🔴 Contract is associated with airdrop scams");
      }

      // Check for medium risks
      if (contractData.is_whitelist === "1") {
        securityInfo.risks.medium.push("🟡 Contract has whitelist functionality");
      }
      if (contractData.is_pausable === "1") {
        securityInfo.risks.medium.push("🟡 Contract is pausable");
      }
      if (contractData.is_verified === "0") {
        securityInfo.risks.medium.push("🟡 Contract is not verified");
      }
      if (contractData.is_blacklisted === "1") {
        securityInfo.risks.medium.push("🟡 Contract is blacklisted");
      }

      // Check for low risks
      if (contractData.is_verified === "1") {
        securityInfo.risks.low.push("🟢 Contract is verified");
      }
      if (contractData.is_whitelisted === "1") {
        securityInfo.risks.low.push("🟢 Contract is whitelisted");
      }

      // Add warnings
      if (contractData.warning_count > 0) {
        securityInfo.warnings.push(`⚠️ ${contractData.warning_count} warnings found`);
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
              rawData: contractData
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error(`Error in nftSecurity tool: ${error.message}`);
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