import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
/**
 * Analyze NFT security data and return structured results
 * @param data Raw data returned by the API
 * @returns Structured analysis results
 */
function analyzeNftSecurityData(data) {
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
        // Risk count and classification
        let riskCount = 0;
        let highRisks = [];
        let mediumRisks = [];
        let lowRisks = [];
        // Check common risks
        if (contractData.is_open_source === 0) {
            highRisks.push("Contract code is not open source");
            riskCount++;
        }
        if (contractData.is_proxy === 1) {
            mediumRisks.push("Using proxy contract");
            riskCount++;
        }
        if (contractData.owner_address && contractData.owner_address !== "0x0000000000000000000000000000000000000000") {
            mediumRisks.push("Contract has an owner address, may have administrative privileges");
            riskCount++;
        }
        if (contractData.can_take_back_ownership === 1) {
            highRisks.push("Contract can reclaim ownership");
            riskCount++;
        }
        if (contractData.hidden_owner === 1) {
            highRisks.push("Contract has a hidden owner");
            riskCount++;
        }
        if (contractData.selfdestruct === 1) {
            highRisks.push("Contract contains self-destruct function");
            riskCount++;
        }
        if (contractData.external_call === 1) {
            lowRisks.push("Contract contains external calls");
            riskCount++;
        }
        if (contractData.nft_isWrapped === 1) {
            lowRisks.push("This is a wrapped NFT");
            riskCount++;
        }
        // Determine overall risk level
        let riskLevel = "safe";
        if (highRisks.length > 0) {
            riskLevel = "high";
        }
        else if (mediumRisks.length > 0) {
            riskLevel = "medium";
        }
        else if (lowRisks.length > 0) {
            riskLevel = "low";
        }
        // Return structured results
        return {
            success: true,
            contractAddress,
            riskCount,
            riskLevel,
            risks: {
                high: highRisks,
                medium: mediumRisks,
                low: lowRisks
            },
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
 * Create a friendly response for error situations
 */
function createErrorResponse(contractAddress, errorMessage) {
    return `📡 **Service temporarily unavailable** - GoPlus security API service is unavailable, unable to check NFT contract security.

🔧 **Fault details**: ${errorMessage}

💬 **Suggested measures**:
- Please try again later
- Confirm your network connection
- Check if the API key is correctly configured

⚠️ **Note**: In case of uncertainty about NFT contract security, it is recommended to take the following measures:
- Read the project whitepaper and documentation
- Check if the NFT contract has been audited
- Observe transaction history and holder distribution
- Seek opinions in the community

-----------------------------

General warning signs of NFT contract security:
1. Contract not open source
2. Developers have special privileges
3. Self-destruct function exists
4. Hidden ownership mechanism
5. Risky external calls

GoPlus is committed to protecting your Web3 assets, thank you for your understanding and patience.`;
}
/**
 * NFT contract security detection tool
 * @param params Parameter object
 * @returns Detection results
 */
export const nftSecurityTool = {
    name: "check_nft_security",
    description: "🖼️ Detect security risks of NFT contracts, identify potential vulnerabilities and risk factors",
    schema: {
        chainId: z.number().describe("Chain ID, such as Ethereum (1), BSC (56), etc."),
        contractAddress: z.string().describe("NFT contract address")
    },
    handler: async (args, extra) => {
        try {
            const client = await createAuthorizedClient();
            const response = await client.get(`/nft_security/${args.chainId}?contract_addresses=${args.contractAddress}`);
            // Analyze data and return structured results
            const result = analyzeNftSecurityData(response.data);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }]
            };
        }
        catch (error) {
            // Get detailed error information
            let errorMessage = error.message;
            if (error.response) {
                // API returned an error response
                errorMessage = `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
            }
            else if (error.request) {
                // Request sent but no response received
                errorMessage = `Network Error: No response from server - ${error.message}`;
            }
            // Return error information
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: errorMessage,
                            contractAddress: args.contractAddress,
                            chainId: args.chainId,
                            errorType: error.name
                        }, null, 2)
                    }]
            };
        }
    }
};
