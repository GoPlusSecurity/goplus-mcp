import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { logger } from '../utils/logger.js';

export const approvalSecurityTool: Tool = {
  name: "approvalSecurity",
  description: "Analyze token approval security and detect potential risks",
  inputSchema: {
    type: "object",
    properties: {
      chainId: {
        type: "string",
        description: "The chain ID (e.g., '1' for Ethereum mainnet)"
      },
      address: {
        type: "string",
        description: "The token contract address"
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
        `https://api.gopluslabs.io/api/v1/approval_security/${chainId}?contract_addresses=${address}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      const data = response.data;
      if (!data || !data.code || data.code !== 1) {
        throw new Error(data?.message || "Failed to fetch approval security data");
      }

      const results = data.data;
      if (!results || Object.keys(results).length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No security data found for this token"
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
        risks: {
          high: [] as string[],
          medium: [] as string[],
          low: [] as string[]
        },
        approvals: [] as any[]
      };

      // Check for high risks
      if (contractData.is_approval_risk === "1") {
        securityInfo.risks.high.push("🔴 Token has approval risks");
      }
      if (contractData.is_approval_risk_high === "1") {
        securityInfo.risks.high.push("🔴 Token has high approval risks");
      }

      // Check for medium risks
      if (contractData.is_approval_risk_medium === "1") {
        securityInfo.risks.medium.push("🟡 Token has medium approval risks");
      }

      // Check for low risks
      if (contractData.is_approval_risk_low === "1") {
        securityInfo.risks.low.push("🟢 Token has low approval risks");
      }

      // Process approval data
      if (contractData.approvals && Array.isArray(contractData.approvals)) {
        securityInfo.approvals = contractData.approvals.map((approval: any) => ({
          spender: approval.spender,
          amount: approval.amount,
          riskLevel: approval.risk_level || 'unknown'
        }));
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
      logger.error(`Error in approvalSecurity tool: ${error.message}`);
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