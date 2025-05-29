import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { API_BASE_URL } from "../config/index.js";
import { getGoPlusAccessToken } from "../utils/api.js";

/**
 * Register NFT security analysis tool to MCP server
 * @param server MCP server instance
 */
export function registerNftSecurityTool(server: McpServer): void {
  server.tool(
    'nft_security',
    'Analyze NFT contract security and detect potential risks',
    {
      chain_id: z.string().describe('Blockchain ID (1=Ethereum, 56=BSC, 137=Polygon, 42161=Arbitrum, 204=opBNB, 324=zkSync Era, 59144=Linea, 8453=Base, 5000=Mantle, 130=Unichain, 534352=Scroll, 10=Optimism, 43114=Avalanche, 250=Fantom, 25=Cronos, 128=HECO, 100=Gnosis, 321=KCC, 201022=FON, 42766=ZKFair, 2818=Morph, 1868=Soneium, 1514=Story, 146=Sonic, 2741=Abstract, 177=Hashkey, 80094=Berachain, 10143=Monad, 480=World Chain, 81457=Blast, 1625=Gravity, 185=Mint, 48899=Zircuit, 196=X Layer, 810180=zkLink Nova, 200901=Bitlayer, 4200=Merlin, 169=Manta Pacific)'),
      contract_addresses: z.string().describe('NFT contract address(es) to analyze, separated by commas for multiple addresses'),
      token_id: z.string().optional().describe('Optional token ID for specific NFT analysis')
    },
    async ({ chain_id, contract_addresses, token_id }): Promise<CallToolResult> => {
      try {
        // Get authorization header
        let authHeader = tokenManager.getAuthorizationHeader();
        if (!authHeader) {
          const newToken = await getGoPlusAccessToken();
          tokenManager.setGoPlusToken(newToken);
          authHeader = tokenManager.getAuthorizationHeader();
        }

        // Prepare request parameters
        const params: any = {
          contract_addresses: contract_addresses
        };
        
        // Add token_id if provided
        if (token_id) {
          params.token_id = token_id;
        }

        // Make API request
        const response = await axios.get(`${API_BASE_URL}/nft_security/${chain_id}`, {
          params: params,
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
                    error: "No NFT security data found for the provided contract address(es)",
                    chain_id: chain_id,
                    contract_addresses: contract_addresses
                  }, null, 2)
                }
              ]
            };
          }

          // Process each contract address
          const analysisResults: any = {};
          
          for (const [contractAddress, contractData] of Object.entries(results)) {
            if (contractData) {
              // Extract security information
              const securityInfo = {
                contract_address: contractAddress,
                chain_id: chain_id,
                nft_name: (contractData as any).nft_name || 'Unknown',
                nft_symbol: (contractData as any).nft_symbol || 'Unknown',
                risks: {
                  high: [] as string[],
                  medium: [] as string[],
                  low: [] as string[]
                },
                warnings: [] as string[]
              };

              // Check for high risks
              if ((contractData as any).is_honeypot === "1") {
                securityInfo.risks.high.push("🔴 NFT contract is a honeypot");
              }
              if ((contractData as any).transfer_without_approval === "1") {
                securityInfo.risks.high.push("🔴 NFT can be transferred without approval");
              }
              if ((contractData as any).restricted_approval === "1") {
                securityInfo.risks.high.push("🔴 NFT has restricted approval mechanism");
              }

              // Check for medium risks
              if ((contractData as any).is_open_source === "0") {
                securityInfo.risks.medium.push("🟡 Contract code is not open source");
              }
              if ((contractData as any).is_proxy === "1") {
                securityInfo.risks.medium.push("🟡 Using proxy contract");
              }
              if ((contractData as any).owner_address && (contractData as any).owner_address !== "0x0000000000000000000000000000000000000000") {
                securityInfo.risks.medium.push("🟡 Contract has an owner address");
              }

              // Check for low risks
              if ((contractData as any).is_open_source === "1") {
                securityInfo.risks.low.push("🟢 Contract code is open source");
              }
              if ((contractData as any).is_verified === "1") {
                securityInfo.risks.low.push("🟢 Contract is verified");
              }

              // Calculate security score
              const riskCount = 
                securityInfo.risks.high.length * 2 + 
                securityInfo.risks.medium.length;
              const securityScore = Math.max(0, 100 - (riskCount * 15));

              analysisResults[contractAddress] = {
                success: true,
                ...securityInfo,
                securityScore,
                riskCount,
                rawData: contractData
              };
            } else {
              analysisResults[contractAddress] = {
                success: false,
                error: "No data available for this contract address"
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
                  contract_addresses: contract_addresses
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
                contract_addresses: contract_addresses,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );
} 