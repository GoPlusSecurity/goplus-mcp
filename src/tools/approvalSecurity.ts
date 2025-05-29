import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { API_BASE_URL } from "../config/index.js";
import { getGoPlusAccessToken } from "../utils/api.js";

/**
 * Register approval security analysis tool to MCP server
 * @param server MCP server instance
 */
export function registerApprovalSecurityTool(server: McpServer): void {
  server.tool(
    'approval_security',
    'Analyze token approvals and detect potential security risks',
    {
      chain_id: z.string().describe('Blockchain ID (1=Ethereum, 56=BSC, 137=Polygon, 42161=Arbitrum, 204=opBNB, 324=zkSync Era, 59144=Linea, 8453=Base, 5000=Mantle, 130=Unichain, 534352=Scroll, 10=Optimism, 43114=Avalanche, 250=Fantom, 25=Cronos, 128=HECO, 100=Gnosis, 321=KCC, 201022=FON, 42766=ZKFair, 2818=Morph, 1868=Soneium, 1514=Story, 146=Sonic, 2741=Abstract, 177=Hashkey, 80094=Berachain, 10143=Monad, 480=World Chain, 81457=Blast, 1625=Gravity, 185=Mint, 48899=Zircuit, 196=X Layer, 810180=zkLink Nova, 200901=Bitlayer, 4200=Merlin, 169=Manta Pacific)'),
      addresses: z.string().describe('Address(es) to check for approvals, separated by commas for multiple addresses')
    },
    async ({ chain_id, addresses }): Promise<CallToolResult> => {
      try {
        // Get authorization header
        let authHeader = tokenManager.getAuthorizationHeader();
        if (!authHeader) {
          const newToken = await getGoPlusAccessToken();
          tokenManager.setGoPlusToken(newToken);
          authHeader = tokenManager.getAuthorizationHeader();
        }

        // Make API request
        const response = await axios.get(`${API_BASE_URL}/approval_security/${chain_id}`, {
          params: {
            contract_addresses: addresses
          },
          headers: {
            'Authorization': authHeader
          },
          timeout: 30000
        });

        if (response.data && response.data.code === 1) {
          const results = response.data.result;
          
          if (!results || Object.keys(results).length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: "No approval security data found for the provided address(es)",
                    chain_id: chain_id,
                    addresses: addresses
                  }, null, 2)
                }
              ]
            };
          }

          // Process each address
          const analysisResults: any = {};
          
          for (const [address, addressData] of Object.entries(results)) {
            if (addressData) {
              // Extract approval information
              const approvalInfo = {
                address: address,
                chain_id: chain_id,
                approvals: (addressData as any).approvals || [],
                risks: {
                  high: [] as string[],
                  medium: [] as string[],
                  low: [] as string[]
                },
                warnings: [] as string[]
              };

              // Analyze approvals
              const approvals = approvalInfo.approvals;
              let highRiskApprovals = 0;
              let mediumRiskApprovals = 0;

              for (const approval of approvals) {
                if (approval.is_contract === "1") {
                  if (approval.is_open_source === "0") {
                    highRiskApprovals++;
                    approvalInfo.risks.high.push(`🔴 Approval to unverified contract: ${approval.spender}`);
                  } else if (approval.is_verified === "0") {
                    mediumRiskApprovals++;
                    approvalInfo.risks.medium.push(`🟡 Approval to unverified contract: ${approval.spender}`);
                  }
                }
                
                if (approval.value && approval.value === "unlimited") {
                  mediumRiskApprovals++;
                  approvalInfo.risks.medium.push(`🟡 Unlimited approval to: ${approval.spender}`);
                }
              }

              // Add summary risks
              if (highRiskApprovals > 0) {
                approvalInfo.risks.high.push(`🔴 ${highRiskApprovals} high-risk approvals found`);
              }
              if (mediumRiskApprovals > 0) {
                approvalInfo.risks.medium.push(`🟡 ${mediumRiskApprovals} medium-risk approvals found`);
              }
              if (approvals.length === 0) {
                approvalInfo.risks.low.push("🟢 No active approvals found");
              } else if (highRiskApprovals === 0 && mediumRiskApprovals === 0) {
                approvalInfo.risks.low.push("🟢 All approvals appear to be safe");
              }

              // Calculate security score
              const riskCount = highRiskApprovals * 2 + mediumRiskApprovals;
              const securityScore = Math.max(0, 100 - (riskCount * 10));

              analysisResults[address] = {
                success: true,
                ...approvalInfo,
                securityScore,
                riskCount,
                totalApprovals: approvals.length,
                highRiskApprovals,
                mediumRiskApprovals
              };
            } else {
              analysisResults[address] = {
                success: false,
                error: "No data available for this address"
              };
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  chain_id: chain_id,
                  analysis_results: analysisResults,
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
                  chain_id: chain_id,
                  addresses: addresses
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
                chain_id: chain_id,
                addresses: addresses,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );
} 