import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { logger } from '../utils/logger.js';

/**
 * Analyze URL security data and return structured results
 * @param data Raw data returned by the API
 * @param url URL being checked
 * @returns Structured analysis results
 */
function analyzeUrlSecurityData(data: any, url: string): any {
  try {
    if (!data || !data.result) {
      return { success: false, data };
    }
    
    const result = data.result;
    const isPhishingSite = result.phishing_site === 1;
    const isContractPhishing = result.is_contract_phishing === 1;
    
    // Return structured results
    return {
      success: true,
      url,
      isPhishingSite,
      isContractPhishing,
      details: result
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message,
      data 
    };
  }
}

/**
 * Create a friendly response for error situations
 */
function createErrorResponse(url: string, errorMessage: string): string {
  return `📡 **Service temporarily unavailable** - GoPlus security API service is unavailable, unable to check URL security.

🔧 **Fault details**: ${errorMessage}

💬 **Suggested measures**:
- Please try again later
- Confirm your network connection
- Check if the API key is correctly configured

⚠️ **Note**: In case of uncertainty about URL security, it is recommended to take the following measures:
- Do not connect wallet to unknown websites
- Do not sign any transactions
- Check if the URL spelling is correct (beware of similar domain phishing)
- Verify the website address through official channels

-----------------------------

General warning signs of phishing websites:
1. Spelling errors or slight changes in the URL
2. Insecure connection (no HTTPS)
3. Website demands immediate action or offers special deals
4. Crude website design and error-ridden text
5. Requests for private keys or mnemonic phrases

GoPlus is committed to protecting your Web3 assets, thank you for your understanding and patience.`;
}

export const phishingWebsiteTool: Tool = {
  name: "phishingWebsite",
  description: "Detect if a website is a phishing site",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to check"
      }
    },
    required: ["url"]
  },
  handler: async (args: any) => {
    try {
      const { url } = args;
      
      // Get authorization header
      const authHeader = tokenManager.getAuthorizationHeader();
      if (!authHeader) {
        throw new Error("No valid GoPlus API token available");
      }

      // Make request to GoPlus API
      const response = await axios.get(
        `https://api.gopluslabs.io/api/v1/phishing_site?url=${encodeURIComponent(url)}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      const data = response.data;
      if (!data || !data.code || data.code !== 1) {
        throw new Error(data?.message || "Failed to fetch phishing site data");
      }

      const result = data.data;
      if (!result) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No security data found for this URL"
            }, null, 2)
          }]
        };
      }

      // Extract security information
      const securityInfo = {
        url,
        risks: {
          high: [] as string[],
          medium: [] as string[],
          low: [] as string[]
        },
        warnings: [] as string[]
      };

      // Check for high risks
      if (result.is_phishing === "1") {
        securityInfo.risks.high.push("🔴 Website is identified as a phishing site");
      }
      if (result.is_malicious === "1") {
        securityInfo.risks.high.push("🔴 Website is identified as malicious");
      }

      // Check for medium risks
      if (result.is_suspicious === "1") {
        securityInfo.risks.medium.push("🟡 Website shows suspicious behavior");
      }
      if (result.is_blacklisted === "1") {
        securityInfo.risks.medium.push("🟡 Website is blacklisted");
      }

      // Check for low risks
      if (result.is_verified === "1") {
        securityInfo.risks.low.push("🟢 Website is verified");
      }
      if (result.is_whitelisted === "1") {
        securityInfo.risks.low.push("🟢 Website is whitelisted");
      }

      // Add warnings
      if (result.warning_count > 0) {
        securityInfo.warnings.push(`⚠️ ${result.warning_count} warnings found`);
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
              rawData: result
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error(`Error in phishingWebsite tool: ${error.message}`);
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