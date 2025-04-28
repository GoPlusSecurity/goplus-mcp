import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
import { logger } from '../utils/logger.js';
/**
 * Analyze SUI token security data and return structured results
 * @param data Raw data returned by the API
 * @returns Structured analysis results
 */
function analyzeSuiTokenSecurityData(data) {
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
            tokenName: contractData.name || 'Unknown',
            tokenSymbol: contractData.symbol || 'Unknown',
            totalSupply: contractData.total_supply || 'Unknown',
            decimals: contractData.decimals || 'Unknown',
            creator: contractData.creator || 'Unknown'
        };
        // Risk count and classification
        let riskCount = 0;
        let highRisks = [];
        let mediumRisks = [];
        let lowRisks = [];
        // Check blacklist capability
        if (contractData.blacklist?.value === "1") {
            highRisks.push("🔴 Token has blacklist capability");
            riskCount++;
            if (contractData.blacklist.cap_owner) {
                mediumRisks.push(`🟡 Blacklist capability owned by: ${contractData.blacklist.cap_owner}`);
                riskCount++;
            }
        }
        // Check contract upgradeable status
        if (contractData.contract_upgradeable?.value === "1") {
            highRisks.push("🔴 Contract is upgradeable");
            riskCount++;
            if (contractData.contract_upgradeable.cap_owner) {
                mediumRisks.push(`🟡 Upgrade capability owned by: ${contractData.contract_upgradeable.cap_owner}`);
                riskCount++;
            }
        }
        // Check metadata modifiable status
        if (contractData.metadata_modifiable?.value === "1") {
            mediumRisks.push("🟡 Token metadata can be modified");
            riskCount++;
            if (contractData.metadata_modifiable.cap_owner) {
                mediumRisks.push(`🟡 Metadata modification capability owned by: ${contractData.metadata_modifiable.cap_owner}`);
                riskCount++;
            }
        }
        // Check mintable status
        if (contractData.mintable?.value === "1") {
            mediumRisks.push("🟡 Token is mintable, may lead to price drop");
            riskCount++;
            if (contractData.mintable.cap_owner) {
                mediumRisks.push(`🟡 Minting capability owned by: ${contractData.mintable.cap_owner}`);
                riskCount++;
            }
        }
        // Check if it's a trusted token
        if (contractData.trusted_token === "1") {
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
Please analyze the following SUI token security report as a professional blockchain security expert:

You are analyzing the security of ${basicInfo.tokenName} (${basicInfo.tokenSymbol}) token on SUI.

Always follow these guidelines:
1. Use professional but easy-to-understand language to explain risks
2. 🔴 represents high-risk items, must be emphasized
3. 🟡 represents medium-risk items, need to be cautious about
4. 🟢 represents safe items, can be appropriately praised
5. Security score ${securityScore}/100 ${securityScore >= 80 ? '🟢 Relatively safe' : securityScore >= 60 ? '🟡 Need caution' : '🔴 High risk'}

In your analysis:
- First, clearly state "GoPlus SUI Token Security Report"
- Briefly summarize the overall security status of the token
- List "main inspection items" (not "main risk points")
- Explain the actual impact of these risks on investors
- Provide professional investment advice
- Maintain professional and objective attitude
- Tone should be firm and clear, not ambiguous

Your analysis format should be:
===
${basicInfo.tokenName} (${basicInfo.tokenSymbol}) GoPlus SUI Token Security Report

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
    return `📡 Service temporarily unavailable - GoPlus security API service cannot be accessed, unable to check SUI token security.
  🔧 Fault details: ${errorMessage}`;
}
/**
 * SUI token security detection tool
 * @param params Parameter object
 * @returns Detection result
 */
export const suiTokenSecurityTool = {
    name: "check_sui_token_security",
    description: "💰 Detect security risks of SUI token, identify potential security vulnerabilities and risk indicators",
    schema: {
        tokenAddress: z.string().describe("SUI token address")
    },
    handler: async (args, extra) => {
        try {
            const client = await createAuthorizedClient();
            const response = await client.get(`/sui/token_security?contract_addresses=${args.tokenAddress}`);
            logger.info("response.data: " + response.data.result);
            // Analyze data and return structured results
            const result = analyzeSuiTokenSecurityData(response.data);
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
