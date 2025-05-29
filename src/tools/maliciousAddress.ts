import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { API_BASE_URL } from "../config/index.js";
import { getGoPlusAccessToken } from "../utils/api.js";

/**
 * Register malicious address detection tool to MCP server
 * @param server MCP server instance
 */
export function registerMaliciousAddressTool(server: McpServer): void {
  server.tool(
    'malicious_address',
    'Detect malicious addresses and potential scams across multiple blockchains',
    {
      chain_id: z.string().describe('Blockchain ID (1=Ethereum, 56=BSC, 137=Polygon, 42161=Arbitrum, 204=opBNB, 324=zkSync Era, 59144=Linea, 8453=Base, 5000=Mantle, 130=Unichain, 534352=Scroll, 10=Optimism, 43114=Avalanche, 250=Fantom, 25=Cronos, 128=HECO, 100=Gnosis, 321=KCC, 201022=FON, 42766=ZKFair, 2818=Morph, 1868=Soneium, 1514=Story, 146=Sonic, 2741=Abstract, 177=Hashkey, 80094=Berachain, 10143=Monad, 480=World Chain, 81457=Blast, 1625=Gravity, 185=Mint, 48899=Zircuit, 196=X Layer, 810180=zkLink Nova, 200901=Bitlayer, 4200=Merlin, 169=Manta Pacific)'),
      addresses: z.string().describe('Address(es) to check, separated by commas for multiple addresses')
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
        const response = await axios.get(`${API_BASE_URL}/address_security/${addresses}`, {
          params: {
            chain_id: chain_id,
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
                    error: "No address security data found for the provided address(es)",
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
              // Extract security information
              const securityInfo = {
                address,
                chain_id,
                risks: {
                  high: [] as string[],
                  medium: [] as string[],
                  low: [] as string[]
                },
                warnings: [] as string[]
              };

              // Check for high risks
              if ((addressData as any).is_contract === "1") {
                securityInfo.risks.high.push("🔴 Address is a contract");
              }
              if ((addressData as any).is_proxy === "1") {
                securityInfo.risks.high.push("🔴 Address is a proxy contract");
              }
              if ((addressData as any).is_honeypot === "1") {
                securityInfo.risks.high.push("🔴 Address is associated with honeypot scams");
              }
              if ((addressData as any).is_blacklisted === "1") {
                securityInfo.risks.high.push("🔴 Address is blacklisted");
              }

              // Check for medium risks
              if ((addressData as any).is_verified === "0") {
                securityInfo.risks.medium.push("🟡 Contract is not verified");
              }
              if ((addressData as any).is_airdrop_scam === "1") {
                securityInfo.risks.medium.push("🟡 Address is associated with airdrop scams");
              }

              // Check for low risks
              if ((addressData as any).is_contract === "0") {
                securityInfo.risks.low.push("🟢 Address is an EOA (Externally Owned Account)");
              }
              if ((addressData as any).is_verified === "1") {
                securityInfo.risks.low.push("🟢 Contract is verified");
              }

              // Add warnings
              if ((addressData as any).warning_count > 0) {
                securityInfo.warnings.push(`⚠️ ${(addressData as any).warning_count} warnings found`);
              }

              // Calculate security score
              const riskCount = 
                securityInfo.risks.high.length * 2 + 
                securityInfo.risks.medium.length;
              const securityScore = Math.max(0, 100 - (riskCount * 15));

              analysisResults[address] = {
                success: true,
                ...securityInfo,
                securityScore,
                riskCount,
                rawData: addressData
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