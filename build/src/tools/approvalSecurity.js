import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
/**
 * Analyze contract approval security data and return structured results
 * @param data Raw data returned by the API
 * @returns Structured analysis results
 */
function analyzeApprovalSecurityData(data, contractAddress) {
    try {
        if (!data || !data.result) {
            return { success: false, data };
        }
        const results = data.result;
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
        // Check authorization-related risks
        if (contractData.is_open_source === 0) {
            highRisks.push("Contract code is not open source");
            riskCount++;
        }
        if (contractData.is_proxy === 1) {
            mediumRisks.push("Using proxy contract");
            riskCount++;
        }
        if (contractData.invalid_approval === 1) {
            highRisks.push("Invalid approval exists");
            riskCount++;
        }
        if (contractData.is_multi_call === 1) {
            mediumRisks.push("Using multi-call");
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
 * Approval contract security detection tool
 * @param params Parameter object
 * @returns Detection result
 */
export const approvalSecurityTool = {
    name: "check_approval_security",
    description: "🛡️ Detect the security of approval contracts, assess potential risks of approval contracts",
    schema: {
        chainId: z.number().describe("Chain ID, such as Ethereum (1), BSC (56), etc."),
        contractAddress: z.string().describe("Approval contract address")
    },
    handler: async (args, extra) => {
        try {
            const client = await createAuthorizedClient();
            const response = await client.get(`/approval_security/${args.chainId}?contract_addresses=${args.contractAddress}`);
            // Analyze data and return structured results
            const result = analyzeApprovalSecurityData(response.data, args.contractAddress);
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
