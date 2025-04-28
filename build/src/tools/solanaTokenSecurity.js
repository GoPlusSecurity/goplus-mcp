import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
import { logger } from '../utils/logger.js';
/**
 * Analyze Solana token security data and return structured results
 * @param data Raw data returned by the API
 * @returns Structured analysis results
 */
function analyzeSolanaTokenSecurityData(data) {
    try {
        if (!data || !data.result) {
            return { success: false, data };
        }
        const results = data.result;
        const contractAddress = Object.keys(results)[0];
        const contractData = results[contractAddress];
        // If there is no contract data, return the raw data
        if (!contractData) {
            return { success: false, data };
        }
        // Basic information extraction
        const basicInfo = {
            tokenName: contractData.metadata?.name || 'Unknown',
            tokenSymbol: contractData.metadata?.symbol || 'Unknown',
            totalSupply: contractData.total_supply || 'Unknown',
            holderCount: contractData.holder_count || 'Unknown',
            description: contractData.metadata?.description || 'Unknown'
        };
        // Risk count and classification
        let riskCount = 0;
        let highRisks = [];
        let mediumRisks = [];
        let lowRisks = [];
        // Check balance mutable authority
        if (contractData.balance_mutable_authority?.status === "1") {
            highRisks.push("🔴 Token balance can be modified by authority");
            riskCount++;
        }
        // Check closable status
        if (contractData.closable?.status === "1") {
            highRisks.push("🔴 Token accounts can be closed");
            riskCount++;
        }
        // Check default account state
        if (contractData.default_account_state === "1") {
            mediumRisks.push("🟡 Token uses default account state");
            riskCount++;
        }
        // Check default account state upgradable
        if (contractData.default_account_state_upgradable?.status === "1") {
            mediumRisks.push("🟡 Default account state can be modified");
            riskCount++;
        }
        // Check freezable status
        if (contractData.freezable?.status === "1") {
            highRisks.push("🔴 Token accounts can be frozen");
            riskCount++;
        }
        // Check metadata mutable status
        if (contractData.metadata_mutable?.status === "1") {
            mediumRisks.push("🟡 Token metadata can be modified");
            riskCount++;
            // Check metadata upgrade authority
            const metadataAuthority = contractData.metadata_mutable?.metadata_upgrade_authority || [];
            if (metadataAuthority.length > 0) {
                const maliciousAuthority = metadataAuthority.find((auth) => auth.malicious_address === 1);
                if (maliciousAuthority) {
                    highRisks.push(`🔴 Metadata upgrade authority is malicious: ${maliciousAuthority.address}`);
                    riskCount++;
                }
            }
        }
        // Check mintable status
        if (contractData.mintable?.status === "1") {
            mediumRisks.push("🟡 Token is mintable, may lead to price drop");
            riskCount++;
        }
        // Check non-transferable status
        if (contractData.non_transferable === "1") {
            highRisks.push("🔴 Token is non-transferable");
            riskCount++;
        }
        // Check transfer fee upgradable status
        if (contractData.transfer_fee_upgradable?.status === "1") {
            mediumRisks.push("🟡 Transfer fee can be modified");
            riskCount++;
        }
        // Check transfer hook upgradable status
        if (contractData.transfer_hook_upgradable?.status === "1") {
            mediumRisks.push("🟡 Transfer hook can be modified");
            riskCount++;
        }
        // Check DEX information
        if (contractData.dex && contractData.dex.length > 0) {
            const activeDexes = contractData.dex.filter((dex) => dex.price !== "-1");
            if (activeDexes.length > 0) {
                lowRisks.push(`🟢 Token is listed on ${activeDexes.length} DEX(es)`);
                // Check liquidity
                const totalTvl = activeDexes.reduce((sum, dex) => sum + parseFloat(dex.tvl || "0"), 0);
                if (totalTvl < 10000) {
                    mediumRisks.push(`🟡 Low liquidity: $${totalTvl.toFixed(2)} TVL`);
                    riskCount++;
                }
                // Check price volatility
                activeDexes.forEach((dex) => {
                    if (dex.day && dex.day.price_max !== "-1" && dex.day.price_min !== "-1") {
                        const maxPrice = parseFloat(dex.day.price_max);
                        const minPrice = parseFloat(dex.day.price_min);
                        const volatility = ((maxPrice - minPrice) / minPrice) * 100;
                        if (volatility > 20) {
                            mediumRisks.push(`🟡 High price volatility on ${dex.dex_name}: ${volatility.toFixed(2)}%`);
                            riskCount++;
                        }
                    }
                });
            }
            else {
                mediumRisks.push("🟡 No active DEX listings found");
                riskCount++;
            }
        }
        // Check holder distribution
        if (contractData.holders && contractData.holders.length > 0) {
            const topHolder = contractData.holders[0];
            const topHolderPercentage = parseFloat(topHolder.percent) * 100;
            if (topHolderPercentage > 50) {
                highRisks.push(`🔴 High concentration: Top holder owns ${topHolderPercentage.toFixed(2)}%`);
                riskCount++;
            }
            else if (topHolderPercentage > 20) {
                mediumRisks.push(`🟡 Concentrated holdings: Top holder owns ${topHolderPercentage.toFixed(2)}%`);
                riskCount++;
            }
        }
        // Check if it's a trusted token
        if (contractData.trusted_token === 1) {
            lowRisks.push("🟢 Token is marked as trusted");
        }
        // Determine overall risk level
        let riskLevel = "safe";
        let riskLevelEmoji = "🟢";
        if (highRisks.length > 0) {
            riskLevel = "high";
            riskLevelEmoji = "🔴";
        }
        else if (mediumRisks.length > 0) {
            riskLevel = "medium";
            riskLevelEmoji = "🟡";
        }
        else if (lowRisks.length > 0) {
            riskLevel = "low";
            riskLevelEmoji = "🟢";
        }
        // Generate comprehensive score (0-100)
        let securityScore = 100;
        securityScore -= highRisks.length * 20; // Each high risk item deducts 20 points
        securityScore -= mediumRisks.length * 10; // Each medium risk item deducts 10 points
        securityScore -= lowRisks.length * 5; // Each low risk item deducts 5 points
        // Ensure score is within 0-100 range
        securityScore = Math.max(0, Math.min(100, securityScore));
        // Add LLM prompt to guide how to present token security analysis results
        const llmPrompt = `
Please analyze the following Solana token security report as a professional blockchain security expert:

You are analyzing the security of ${basicInfo.tokenName} (${basicInfo.tokenSymbol}) token on Solana.

Always follow these guidelines:
1. Use professional but easy-to-understand language to explain risks
2. 🔴 represents high-risk items, must be emphasized
3. 🟡 represents medium-risk items, need to be cautious about
4. 🟢 represents safe items, can be appropriately praised
5. Security score ${securityScore}/100 ${securityScore >= 80 ? '🟢 Relatively safe' : securityScore >= 60 ? '🟡 Need caution' : '🔴 High risk'}

In your analysis:
- First, clearly state "GoPlus Solana Token Security Report"
- Briefly summarize the overall security status of the token
- List "main inspection items" (not "main risk points")
- Explain the actual impact of these risks on investors
- Provide professional investment advice
- Maintain professional and objective attitude
- Tone should be firm and clear, not ambiguous

Your analysis format should be:
===
${basicInfo.tokenName} (${basicInfo.tokenSymbol}) GoPlus Solana Token Security Report

Overall security score: ${securityScore}/100 ${securityScore >= 80 ? '🟢 Relatively safe' : securityScore >= 60 ? '🟡 Need caution' : '🔴 High risk'}

[Overall security status overview]

Main inspection items:
[List main inspection items, use corresponding emoji to identify risk level]

Investor impact:
[Explain the impact of risks on investors]

Professional advice:
[Provide investment advice based on security score]
===

Remember, your analysis may affect users' investment decisions, please maintain professional objectivity.
`;
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
            llmPrompt,
            details: contractData
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            data
        };
    }
}
/**
 * Create a friendly response for error cases
 */
function createErrorResponse(tokenAddress, errorMessage) {
    return `📡 Service temporarily unavailable - GoPlus security API service cannot be accessed, unable to check Solana token security.
  🔧 Fault details: ${errorMessage}`;
}
/**
 * Solana token security detection tool
 * @param params Parameter object
 * @returns Detection result
 */
export const solanaTokenSecurityTool = {
    name: "check_solana_token_security",
    description: "💰 Detect security risks of Solana token, identify potential security vulnerabilities and risk indicators",
    schema: {
        tokenAddress: z.string().describe("Solana token address")
    },
    handler: async (args, extra) => {
        try {
            const client = await createAuthorizedClient();
            const response = await client.get(`/solana/token_security?contract_addresses=${args.tokenAddress}`);
            logger.info("response.data: " + response.data.result);
            // Analyze data and return structured results
            const result = analyzeSolanaTokenSecurityData(response.data);
            // Return LLM prompt
            return {
                content: [{
                        type: "text",
                        text: result.llmPrompt || JSON.stringify(result, null, 2)
                    }]
            };
        }
        catch (error) {
            // Get detailed error information
            let errorMessage = error.message;
            if (error.response) {
                // API returned error response
                errorMessage = `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
            }
            else if (error.request) {
                // Request sent but no response received
                errorMessage = `Network Error: No response from server - ${error.message}`;
            }
            // Return friendly error response
            return {
                content: [{
                        type: "text",
                        text: createErrorResponse(args.tokenAddress, errorMessage)
                    }]
            };
        }
    }
};
