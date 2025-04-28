import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
import { logger } from '../utils/logger.js';
/**
 * Analyze token security data and return structured results
 * @param data Raw data returned by the API
 * @returns Structured analysis results
 */
function analyzeTokenSecurityData(data) {
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
            tokenName: contractData.token_name || 'Unknown',
            tokenSymbol: contractData.token_symbol || 'Unknown',
            totalSupply: contractData.total_supply || 'Unknown',
            decimals: contractData.decimals || 'Unknown',
            blockchain: contractData.chain || 'Unknown',
        };
        // Risk count and classification
        let riskCount = 0;
        let highRisks = [];
        let mediumRisks = [];
        let lowRisks = [];
        // === Contract security risk check ===
        // Open source status
        if (contractData.is_open_source === "0") {
            highRisks.push("🔴 Contract code is not open source");
            riskCount++;
        }
        else if (contractData.is_open_source === "1") {
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
            }
            else {
                mediumRisks.push("🟡 Contract has an owner address, may have administrative privileges");
                riskCount++;
                basicInfo.ownerAddress = contractData.owner_address;
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
        // Gas abuse
        if (contractData.gas_abuse === "1") {
            highRisks.push("🔴 Contract has gas abuse issues, may lead to increased transaction costs");
            riskCount++;
        }
        // === Transaction security risk check ===
        // Exchange support
        if (contractData.is_in_dex === "1") {
            lowRisks.push("🟢 Token is listed on decentralized exchange");
            // Buy and sell tax rates
            const buyTax = contractData.buy_tax ? parseFloat(contractData.buy_tax) : 0;
            const sellTax = contractData.sell_tax ? parseFloat(contractData.sell_tax) : 0;
            if (buyTax > 0 || sellTax > 0) {
                const taxInfo = {
                    buyTax: buyTax ? (buyTax * 100).toFixed(2) + '%' : 'Unknown',
                    sellTax: sellTax ? (sellTax * 100).toFixed(2) + '%' : 'Unknown'
                };
                basicInfo.taxInfo = taxInfo;
                if (buyTax >= 0.1 || sellTax >= 0.1) {
                    highRisks.push(`🔴 Token tax rate is too high: Buy tax ${taxInfo.buyTax}, Sell tax ${taxInfo.sellTax}`);
                    riskCount++;
                }
                else if (buyTax >= 0.05 || sellTax >= 0.05) {
                    mediumRisks.push(`🟡 Token tax rate is moderate: Buy tax ${taxInfo.buyTax}, Sell tax ${taxInfo.sellTax}`);
                    riskCount++;
                }
                else if (buyTax > 0 || sellTax > 0) {
                    lowRisks.push(`🟢 Token tax rate is low: Buy tax ${taxInfo.buyTax}, Sell tax ${taxInfo.sellTax}`);
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
                    totalLpHolders: contractData.lp_holders.length
                };
                let lockedLpCount = 0;
                for (const holder of contractData.lp_holders) {
                    if (holder.locked === "1") {
                        lockedLpCount++;
                        lpInfo.locked = true;
                        lpInfo.lockedPercent += parseFloat(holder.percent || "0");
                    }
                }
                basicInfo.lpInfo = lpInfo;
                if (lpInfo.locked && lpInfo.lockedPercent >= 0.8) {
                    lowRisks.push(`🟢 Liquidity is locked ${(lpInfo.lockedPercent * 100).toFixed(2)}%`);
                }
                else if (lpInfo.locked && lpInfo.lockedPercent >= 0.5) {
                    mediumRisks.push(`🟡 Liquidity is partially locked ${(lpInfo.lockedPercent * 100).toFixed(2)}%，存在一定风险`);
                    riskCount++;
                }
                else {
                    highRisks.push(`🔴 Liquidity is not locked or locked proportion is too low ${(lpInfo.lockedPercent * 100).toFixed(2)}%，存在高风险`);
                    riskCount++;
                }
            }
        }
        else if (contractData.is_in_dex === "0") {
            mediumRisks.push("🟡 Token is not listed on decentralized exchange, liquidity may be insufficient");
            riskCount++;
        }
        // Airdrop scam check
        if (contractData.is_airdrop_scam === "1") {
            highRisks.push("🔴 Token suspected of airdrop scam, extremely high risk");
            riskCount++;
        }
        // Fake token detection
        if (contractData.fake_token && contractData.fake_token.value === 1) {
            highRisks.push(`🔴 Token suspected of being a counterfeit, original token address: ${contractData.fake_token.true_token_address}`);
            riskCount++;
        }
        // Listed on well-known exchanges
        if (contractData.is_in_cex && contractData.is_in_cex.listed === "1") {
            const cexList = contractData.is_in_cex.cex_list.join(", ");
            lowRisks.push(`🟢 Token is listed on well-known centralized exchanges: ${cexList}`);
            basicInfo.cexList = cexList;
        }
        // Trust project
        if (contractData.trust_list === "1") {
            lowRisks.push("🟢 Token has been certified as a trusted project");
        }
        // Other potential risks
        if (contractData.other_potential_risks) {
            highRisks.push(`🔴 Other potential risks: ${contractData.other_potential_risks}`);
            riskCount++;
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
Please use Chinese to reply, and analyze the following token security report as a professional blockchain security expert:

You are an experienced blockchain security expert, analyzing the security of ${basicInfo.tokenName} (${basicInfo.tokenSymbol}) token.

Always follow these guidelines:
1. Use professional but easy-to-understand language to explain risks
2. 🔴 represents high-risk items, must be emphasized
3. 🟡 represents medium-risk items, need to be cautious about
4. 🟢 represents safe items, can be appropriately praised
5. Security score ${securityScore}/100 ${securityScore >= 80 ? '🟢 Relatively safe' : securityScore >= 60 ? '🟡 Need caution' : '🔴 High risk'}

In your analysis:
- First, clearly state "GoPlus security detection report"
- Briefly summarize the overall security status of the token
- List "main inspection items" (not "main risk points")
- Explain the actual impact of these risks on investors
- Provide professional investment advice
- Maintain professional and objective attitude
- Tone should be firm and clear, not ambiguous

Your analysis format should be:
===
${basicInfo.tokenName} (${basicInfo.tokenSymbol}) GoPlus security detection report

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
    return `📡 Service temporarily unavailable - GoPlus security API service cannot be accessed, unable to check token security.
  🔧 Fault details: ${errorMessage}`;
}
/**
 * Token security detection tool
 * @param params Parameter object
 * @returns Detection result
 */
export const tokenSecurityTool = {
    name: "check_token_security",
    description: "💰 Detect security risks of token contract, identify potential security vulnerabilities and risk indicators",
    schema: {
        chainId: z.number().describe("Chain ID, such as Ethereum(1), BSC(56), etc"),
        tokenAddress: z.string().describe("Token contract address")
    },
    handler: async (args, extra) => {
        try {
            const client = await createAuthorizedClient();
            const response = await client.get(`/token_security/${args.chainId}?contract_addresses=${args.tokenAddress}`);
            logger.info("response.data: " + response.data.result);
            // Analyze data and return structured results
            const result = analyzeTokenSecurityData(response.data.result);
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
// Log an informational message
logger.info('This is an informational message.');
// Log a warning message
logger.warn('This is a warning message.');
// Log an error message
logger.error('This is an error message.');
