import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import axios from "axios";
import { tokenManager } from "../utils/tokenManager.js";
import { API_BASE_URL } from "../config/index.js";
import { getGoPlusAccessToken } from "../utils/api.js";

/**
 * Analyze token security data and return structured results
 * @param contractData Raw contract data from GoPlus API
 * @param contractAddress Contract address
 * @returns Structured analysis results
 */
function analyzeTokenSecurityData(contractData: any, contractAddress: string): any {
  try {
    // Basic information extraction
    const basicInfo: any = {
      tokenName: contractData.token_name || 'Unknown',
      tokenSymbol: contractData.token_symbol || 'Unknown',
      totalSupply: contractData.total_supply || 'Unknown',
      holderCount: contractData.holder_count || 'Unknown',
      creatorAddress: contractData.creator_address || 'Unknown',
      ownerAddress: contractData.owner_address || 'Unknown'
    };
    
    // Risk count and classification
    let riskCount = 0;
    let highRisks: string[] = [];
    let mediumRisks: string[] = [];
    let lowRisks: string[] = [];
    
    // === Contract security risk check ===
    
    // Open source status
    if (contractData.is_open_source === "0") {
      highRisks.push("🔴 Contract code is not open source");
      riskCount++;
    } else if (contractData.is_open_source === "1") {
      lowRisks.push("🟢 Contract code is open source");
    }
    
    // Proxy contract
    if (contractData.is_proxy === "1") {
      mediumRisks.push("🟡 Using proxy contract, implementation may have security risks");
      riskCount++;
    }
    
    // Minting function
    if (contractData.is_mintable === "1") {
      mediumRisks.push("🟡 Token can be minted, may lead to price drop");
      riskCount++;
    }
    
    // Contract owner
    if (contractData.owner_address) {
      if (contractData.owner_address === "0x0000000000000000000000000000000000000000") {
        lowRisks.push("🟢 Contract ownership has been destroyed (black hole address)");
      } else {
        mediumRisks.push("🟡 Contract has an owner address, may have administrative privileges");
        riskCount++;
      }
    }
    
    // Reclaim ownership
    if (contractData.can_take_back_ownership === "1") {
      highRisks.push("🔴 Contract can reclaim ownership, high risk");
      riskCount++;
    }
    
    // Hidden owner
    if (contractData.hidden_owner === "1") {
      highRisks.push("🔴 Contract has a hidden owner, extremely high risk");
      riskCount++;
    }
    
    // Self-destruct function
    if (contractData.selfdestruct === "1") {
      highRisks.push("🔴 Contract contains self-destruct function, may lead to asset loss");
      riskCount++;
    }
    
    // External call
    if (contractData.external_call === "1") {
      mediumRisks.push("🟡 Contract contains external calls, may introduce third-party risks");
      riskCount++;
    }
    
    // Modify balance permission
    if (contractData.owner_change_balance === "1") {
      highRisks.push("🔴 Owner can modify any address balance, extremely high risk");
      riskCount++;
    }
    
    // Anti-whale mechanism
    if (contractData.is_anti_whale === "1") {
      if (contractData.anti_whale_modifiable === "1") {
        mediumRisks.push("🟡 Anti-whale mechanism is modifiable");
        riskCount++;
      } else {
        lowRisks.push("🟢 Anti-whale mechanism is enabled");
      }
    }
    
    // Transfer pausable
    if (contractData.transfer_pausable === "1") {
      highRisks.push("🔴 Token transfers can be paused");
      riskCount++;
    }
    
    // Trading cooldown
    if (contractData.trading_cooldown === "1") {
      mediumRisks.push("🟡 Trading cooldown mechanism is enabled");
      riskCount++;
    }
    
    // Slippage modifiable
    if (contractData.slippage_modifiable === "1") {
      mediumRisks.push("🟡 Slippage can be modified");
      riskCount++;
    }
    
    // Personal slippage modifiable
    if (contractData.personal_slippage_modifiable === "1") {
      mediumRisks.push("🟡 Personal slippage can be modified");
      riskCount++;
    }
    
    // === Transaction security risk check ===
    
    // Exchange support
    if (contractData.is_in_dex === "1") {
      lowRisks.push("🟢 Token is listed on decentralized exchange");
      
      // Buy and sell tax rates
      const buyTax = contractData.buy_tax ? parseFloat(contractData.buy_tax) : 0;
      const sellTax = contractData.sell_tax ? parseFloat(contractData.sell_tax) : 0;
      const transferTax = contractData.transfer_tax ? parseFloat(contractData.transfer_tax) : 0;
      
      if (buyTax > 0 || sellTax > 0 || transferTax > 0) {
        const taxInfo = {
          buyTax: buyTax ? (buyTax * 100).toFixed(2) + '%' : '0%',
          sellTax: sellTax ? (sellTax * 100).toFixed(2) + '%' : '0%',
          transferTax: transferTax ? (transferTax * 100).toFixed(2) + '%' : '0%'
        };
        basicInfo.taxInfo = taxInfo;
        
        if (buyTax >= 0.1 || sellTax >= 0.1 || transferTax >= 0.1) {
          highRisks.push(`🔴 Token tax rate is too high: Buy ${taxInfo.buyTax}, Sell ${taxInfo.sellTax}, Transfer ${taxInfo.transferTax}`);
          riskCount++;
        } else if (buyTax >= 0.05 || sellTax >= 0.05 || transferTax >= 0.05) {
          mediumRisks.push(`🟡 Token tax rate is moderate: Buy ${taxInfo.buyTax}, Sell ${taxInfo.sellTax}, Transfer ${taxInfo.transferTax}`);
          riskCount++;
        } else if (buyTax > 0 || sellTax > 0 || transferTax > 0) {
          lowRisks.push(`🟢 Token tax rate is low: Buy ${taxInfo.buyTax}, Sell ${taxInfo.sellTax}, Transfer ${taxInfo.transferTax}`);
        }
      }
      
      // Transaction status check
      if (contractData.cannot_buy === "1") {
        highRisks.push("🔴 Token cannot be purchased, may be a honeypot trap");
        riskCount++;
      }
      
      if (contractData.cannot_sell_all === "1") {
        highRisks.push("🔴 Token cannot be fully sold, may be a scam token");
        riskCount++;
      }
      
      // Liquidity analysis
      if (contractData.lp_holders && contractData.lp_holders.length > 0) {
        const lpInfo = {
          locked: false,
          lockedPercent: 0,
          totalLpHolders: contractData.lp_holders.length,
          totalSupply: contractData.lp_total_supply
        };
        
        for (const holder of contractData.lp_holders) {
          if (holder.is_locked === 1) {
            lpInfo.locked = true;
            lpInfo.lockedPercent += parseFloat(holder.percent || "0");
          }
        }
        
        basicInfo.lpInfo = lpInfo;
        
        if (lpInfo.locked && lpInfo.lockedPercent >= 0.8) {
          lowRisks.push(`🟢 Liquidity is locked ${(lpInfo.lockedPercent * 100).toFixed(2)}%`);
        } else if (lpInfo.locked && lpInfo.lockedPercent >= 0.5) {
          mediumRisks.push(`🟡 Liquidity is partially locked ${(lpInfo.lockedPercent * 100).toFixed(2)}%, some risk exists`);
          riskCount++;
        } else {
          highRisks.push(`🔴 Liquidity is not locked or locked proportion is too low ${(lpInfo.lockedPercent * 100).toFixed(2)}%, high risk`);
          riskCount++;
        }
      }
      
      // DEX information
      if (contractData.dex && contractData.dex.length > 0) {
        const dexList = contractData.dex.map((d: any) => `${d.name} (${d.liquidity_type})`).join(", ");
        basicInfo.dexList = dexList;
        lowRisks.push(`🟢 Listed on DEX: ${dexList}`);
      }
    } else if (contractData.is_in_dex === "0") {
      mediumRisks.push("🟡 Token is not listed on decentralized exchange, liquidity may be insufficient");
      riskCount++;
    }
    
    // Honeypot detection
    if (contractData.is_honeypot === "1") {
      highRisks.push("🔴 Token is detected as honeypot, extremely high risk");
      riskCount++;
    }
    
    // Honeypot with same creator
    if (contractData.honeypot_with_same_creator === "1") {
      highRisks.push("🔴 Creator has created honeypot tokens before, high risk");
      riskCount++;
    }
    
    // Blacklist status
    if (contractData.is_blacklisted === "1") {
      highRisks.push("🔴 Token is blacklisted");
      riskCount++;
    }
    
    // Whitelist status
    if (contractData.is_whitelisted === "1") {
      lowRisks.push("🟢 Token is whitelisted");
    }
    
    // Holder analysis
    if (contractData.holders && contractData.holders.length > 0) {
      const holderInfo = {
        topHolders: contractData.holders.slice(0, 5),
        creatorBalance: contractData.creator_balance || "0",
        creatorPercent: contractData.creator_percent || "0",
        ownerBalance: contractData.owner_balance || "0",
        ownerPercent: contractData.owner_percent || "0"
      };
      
      basicInfo.holderInfo = holderInfo;
      
      // Check creator/owner concentration
      const creatorPercent = parseFloat(contractData.creator_percent || "0");
      const ownerPercent = parseFloat(contractData.owner_percent || "0");
      
      if (creatorPercent > 0.5 || ownerPercent > 0.5) {
        highRisks.push("🔴 Creator/Owner holds more than 50% of tokens, high centralization risk");
        riskCount++;
      } else if (creatorPercent > 0.2 || ownerPercent > 0.2) {
        mediumRisks.push("🟡 Creator/Owner holds significant portion of tokens");
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
      contractAddress,
      riskCount,
      riskLevel,
      securityScore,
      basicInfo,
      risks: {
        high: highRisks,
        medium: mediumRisks,
        low: lowRisks
      },
      details: contractData
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message,
      contractAddress
    };
  }
}

/**
 * Register token security analysis tool to MCP server
 * @param server MCP server instance
 */
export function registerTokenSecurityTool(server: McpServer): void {
  server.tool(
    'token_security',
    'Analyze token security for EVM-compatible blockchains (Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom, Cronos, Gnosis, Moonriver, Moonbeam, OKC, HECO, KCC, Metis, Polygon zkEVM, zkSync Era, Linea, Base, Mantle, Scroll)',
    {
      chain_id: z.string().describe('Blockchain ID (1=Ethereum, 56=BSC, 137=Polygon, 42161=Arbitrum, 204=opBNB, 324=zkSync Era, 59144=Linea, 8453=Base, 5000=Mantle, 130=Unichain, 534352=Scroll, 10=Optimism, 43114=Avalanche, 250=Fantom, 25=Cronos, 128=HECO, 100=Gnosis, 321=KCC, 201022=FON, 42766=ZKFair, 2818=Morph, 1868=Soneium, 1514=Story, 146=Sonic, 2741=Abstract, 177=Hashkey, 80094=Berachain, 10143=Monad, 480=World Chain, 81457=Blast, 1625=Gravity, 185=Mint, 48899=Zircuit, 196=X Layer, 810180=zkLink Nova, 200901=Bitlayer, 4200=Merlin, 169=Manta Pacific)'),
      contract_addresses: z.string().describe('Contract address(es) to analyze, separated by commas for multiple addresses')
    },
    async ({ chain_id, contract_addresses }): Promise<CallToolResult> => {
      try {
        // Get authorization header
        let authHeader = tokenManager.getAuthorizationHeader();
        if (!authHeader) {
          const newToken = await getGoPlusAccessToken();
          tokenManager.setGoPlusToken(newToken);
          authHeader = tokenManager.getAuthorizationHeader();
        }

        // Make API request
        const response = await axios.get(`${API_BASE_URL}/token_security/${chain_id}`, {
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
                    error: "No token security data found for the provided contract address(es)",
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
              analysisResults[contractAddress] = analyzeTokenSecurityData(contractData, contractAddress);
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