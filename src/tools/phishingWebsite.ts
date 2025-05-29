import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { API_BASE_URL } from "../config/index.js";
import { getGoPlusAccessToken } from "../utils/api.js";

/**
 * Register phishing website detection tool to MCP server
 * @param server MCP server instance
 */
export function registerPhishingWebsiteTool(server: McpServer): void {
  server.tool(
    'phishing_website',
    'Detect phishing websites and malicious URLs in the crypto space',
    {
      url: z.string().describe('Website URL to check for phishing and security risks')
    },
    async ({ url }): Promise<CallToolResult> => {
      try {
        // Get authorization header
        let authHeader = tokenManager.getAuthorizationHeader();
        if (!authHeader) {
          const newToken = await getGoPlusAccessToken();
          tokenManager.setGoPlusToken(newToken);
          authHeader = tokenManager.getAuthorizationHeader();
        }

        // Make API request
        const response = await axios.get(`${API_BASE_URL}/phishing_site`, {
          params: {
            url: url
          },
          headers: {
            'Authorization': authHeader
          },
          timeout: 30000
        });

        if (response.data && response.data.code === 1) {
          const result = response.data.result;
          
          if (!result) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: "No phishing detection data found for the provided URL",
                    url: url
                  }, null, 2)
                }
              ]
            };
          }

          // Analyze phishing data - phishing_site is 1 (number) for phishing sites
          const isPhishing = result.phishing_site === 1;
          const analysisResult = {
            url: url,
            is_phishing: isPhishing,
            risk_level: isPhishing ? "HIGH" : "LOW",
            risks: [] as string[],
            warnings: [] as string[],
            website_contract_security: result.website_contract_security || []
          };

          if (isPhishing) {
            analysisResult.risks.push("🔴 Website identified as phishing site - HIGH RISK");
            analysisResult.warnings.push("⚠️ This website has been flagged as a phishing site. Do not connect your wallet or enter sensitive information.");
          } else {
            analysisResult.risks.push("🟢 Website not identified as phishing site");
          }

          // Check for website contract security issues
          if (result.website_contract_security && result.website_contract_security.length > 0) {
            analysisResult.warnings.push(`⚠️ ${result.website_contract_security.length} contract security issue(s) detected on this website`);
            for (const issue of result.website_contract_security) {
              if (issue.risk_level) {
                analysisResult.warnings.push(`⚠️ Contract security risk: ${issue.risk_level}`);
              }
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  analysis_result: analysisResult,
                  raw_data: result,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }
            ]
          };
        } else {
          const errorMsg = response.data?.message || 'Unknown API error';
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `API returned error: ${errorMsg}`,
                  url: url
                }, null, 2)
              }
            ]
          };
        }
      } catch (error: any) {
        let errorMessage = error.message;
        if (error.response) {
          errorMessage = `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
          errorMessage = `Network Error: No response from server - ${error.message}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                url: url,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );
} 