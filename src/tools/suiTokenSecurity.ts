import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { getGoPlusAccessToken } from "../utils/api.js";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { API_BASE_URL } from "../config/index.js";

/**
 * Analyze Sui token security data and return structured results
 * @param tokenData Raw token data from GoPlus API
 * @param tokenAddress Token address
 * @returns Structured analysis results
 */
function analyzeSuiTokenSecurityData(tokenData: any, tokenAddress: string): any {
  try {
    // Basic information extraction
    const basicInfo: any = {
      tokenName: tokenData.name || 'Unknown',
      tokenSymbol: tokenData.symbol || 'Unknown',
      decimals: tokenData.decimals || 'Unknown',
      totalSupply: tokenData.total_supply || 'Unknown',
      creator: tokenData.creator || 'Unknown'
    };
    
    // Risk count and classification
    let riskCount = 0;
    let highRisks: string[] = [];
    let mediumRisks: string[] = [];
    let lowRisks: string[] = [];
    
    // === Contract security risk check ===
    
    // Mintable status
    if (tokenData.mintable?.value === "1") {
      if (tokenData.mintable?.cap_owner && tokenData.mintable.cap_owner !== "Immutable") {
        highRisks.push("🔴 Token has mint capability, can be minted");
        riskCount++;
        
        // Add cap owner info
        basicInfo.mintCapOwner = tokenData.mintable.cap_owner;
      }
    } else if (tokenData.mintable?.value === "0") {
      lowRisks.push("🟢 Token mint capability is disabled");
    }
    
    // Contract upgradeable status
    if (tokenData.contract_upgradeable?.value === "1") {
      if (tokenData.contract_upgradeable?.cap_owner && tokenData.contract_upgradeable.cap_owner !== "Immutable") {
        highRisks.push("🔴 Contract is upgradeable, implementation can be changed");
        riskCount++;
        
        // Add cap owner info
        basicInfo.upgradeCapOwner = tokenData.contract_upgradeable.cap_owner;
      }
    } else if (tokenData.contract_upgradeable?.value === "0") {
      lowRisks.push("🟢 Contract is not upgradeable");
    }
    
    // Metadata modifiable
    if (tokenData.metadata_modifiable?.value === "1") {
      if (tokenData.metadata_modifiable?.cap_owner && tokenData.metadata_modifiable.cap_owner !== "Immutable") {
        mediumRisks.push("🟡 Token metadata can be modified");
        riskCount++;
        
        // Add cap owner info
        basicInfo.metadataCapOwner = tokenData.metadata_modifiable.cap_owner;
      }
    } else if (tokenData.metadata_modifiable?.value === "0") {
      lowRisks.push("🟢 Token metadata is immutable");
    }
    
    // Blacklist status
    if (tokenData.blacklist?.value === "1") {
      if (tokenData.blacklist?.cap_owner && tokenData.blacklist.cap_owner !== "Immutable") {
        highRisks.push("🔴 Token has blacklist capability");
        riskCount++;
        
        // Add cap owner info
        basicInfo.blacklistCapOwner = tokenData.blacklist.cap_owner;
      }
    } else if (tokenData.blacklist?.value === "0") {
      lowRisks.push("🟢 Token does not have blacklist capability");
    }
    
    // Trusted token status
    if (tokenData.trusted_token === "1") {
      lowRisks.push("🟢 Token is marked as trusted");
    } else if (tokenData.trusted_token === "0") {
      mediumRisks.push("🟡 Token is not marked as trusted");
      riskCount++;
    }
    
    // === Capability ownership analysis ===
    
    // Check if same entity controls multiple capabilities
    const capOwners = new Set();
    const capabilities = [];
    
    if (tokenData.mintable?.cap_owner && tokenData.mintable.cap_owner !== "Immutable") {
      capOwners.add(tokenData.mintable.cap_owner);
      capabilities.push("mint");
    }
    
    if (tokenData.contract_upgradeable?.cap_owner && tokenData.contract_upgradeable.cap_owner !== "Immutable") {
      capOwners.add(tokenData.contract_upgradeable.cap_owner);
      capabilities.push("upgrade");
    }
    
    if (tokenData.metadata_modifiable?.cap_owner && tokenData.metadata_modifiable.cap_owner !== "Immutable") {
      capOwners.add(tokenData.metadata_modifiable.cap_owner);
      capabilities.push("metadata");
    }
    
    if (tokenData.blacklist?.cap_owner && tokenData.blacklist.cap_owner !== "Immutable") {
      capOwners.add(tokenData.blacklist.cap_owner);
      capabilities.push("blacklist");
    }
    
    // Centralization risk analysis
    if (capOwners.size === 1 && capabilities.length > 1) {
      highRisks.push(`🔴 Single entity controls multiple capabilities: ${capabilities.join(", ")}`);
      riskCount++;
    } else if (capOwners.size > 0) {
      basicInfo.capabilityOwners = Array.from(capOwners);
      basicInfo.capabilities = capabilities;
    }
    
    // === Creator analysis ===
    
    if (tokenData.creator) {
      // Check if creator is same as capability owners
      if (capOwners.has(tokenData.creator)) {
        mediumRisks.push("🟡 Token creator still controls some capabilities");
        riskCount++;
      }
    }
    
    // Calculate security score (0-100)
    let securityScore = 100;
    securityScore -= highRisks.length * 25;
    securityScore -= mediumRisks.length * 10;
    securityScore = Math.max(0, securityScore);
    
    // Determine risk level
    let riskLevel = "Low";
    if (securityScore < 30) {
      riskLevel = "Extremely High";
    } else if (securityScore < 50) {
      riskLevel = "High";
    } else if (securityScore < 70) {
      riskLevel = "Medium";
    } else if (securityScore < 85) {
      riskLevel = "Low";
    } else {
      riskLevel = "Very Low";
    }
    
    // Return structured results
    return {
      success: true,
      tokenAddress,
      riskCount,
      riskLevel,
      securityScore,
      basicInfo,
      risks: {
        high: highRisks,
        medium: mediumRisks,
        low: lowRisks
      },
      details: tokenData
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message,
      tokenAddress
    };
  }
}

/**
 * Register Sui token security analysis tool to MCP server
 * @param server MCP server instance
 */
export function registerSuiTokenSecurityTool(server: McpServer): void {
  server.tool(
    'sui_token_security',
    'Analyze Sui token security and detect potential risks',
    {
      contract_addresses: z.string().describe('Sui token contract address(es) to analyze, separated by commas for multiple addresses')
    },
    async ({ contract_addresses }): Promise<CallToolResult> => {
      try {
        // Get authorization header
        let authHeader = tokenManager.getAuthorizationHeader();
        if (!authHeader) {
          const newToken = await getGoPlusAccessToken();
          tokenManager.setGoPlusToken(newToken);
          authHeader = tokenManager.getAuthorizationHeader();
        }

        // Make API request
        const response = await axios.get(`${API_BASE_URL}/sui/token_security`, {
          params: {
            contract_addresses: contract_addresses
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
                    error: "No Sui token security data found for the provided contract address(es)",
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
              analysisResults[contractAddress] = analyzeSuiTokenSecurityData(contractData, contractAddress);
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
                  blockchain: 'Sui',
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