import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
import { API_BASE_URL } from "../config/index.js";
import fs from "fs";
import path from "path";
import os from "os";
// Function to log messages
function logToFile(message) {
    try {
        // Use the user's temporary directory to save logs, ensuring write permissions
        const tempDir = os.tmpdir();
        const logDir = path.join(tempDir, 'w3security-mcp-logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, 'malicious_address.log');
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} - ${message}\n`;
        fs.appendFileSync(logFile, logMessage);
    }
    catch (error) {
        // Fail silently, ensuring it does not affect main functionality
    }
}
// Generate mock data for when the API is unavailable
const getMockData = (address) => {
    return {
        code: 1,
        message: "OK",
        result: {
            cybercrime: "0",
            money_laundering: "0",
            number_of_malicious_contracts_created: "0",
            gas_abuse: "0",
            financial_crime: "0",
            darkweb_transactions: "0",
            reinit: "0",
            phishing_activities: "0",
            contract_address: "0",
            fake_kyc: "0",
            blacklist_doubt: "0",
            fake_standard_interface: "0",
            data_source: "Mock Data",
            stealing_attack: "0",
            blackmail_activities: "0",
            sanctioned: "0",
            malicious_mining_activities: "0",
            mixer: "0",
            fake_token: "0",
            honeypot_related_address: "0"
        }
    };
};
/**
 * Analyze malicious address data and return structured results
 * @param data Raw data returned by the API
 * @param address Address to be checked
 * @returns Structured analysis results
 */
// Analyze malicious address data and return structured results
function analyzeMaliciousAddressData(data, address) {
    try {
        if (!data || !data.result) {
            return { success: false, data };
        }
        const result = data.result;
        // Count the number of malicious activities
        const maliciousActivities = Object.entries(result)
            .filter(([key, value]) => value === "1")
            .map(([key]) => key);
        const isMalicious = maliciousActivities.length > 0;
        const riskLevel = isMalicious ? "high" : "low";
        // Return structured results
        return {
            success: true,
            address,
            isMalicious,
            riskLevel,
            maliciousActivities,
            dataSource: result.data_source || "Unknown",
            details: result
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
 * Malicious address detection tool
 * @param params Parameter object
 * @returns Detection result
 */
// Malicious address detection tool
export const maliciousAddressTool = {
    name: "check_malicious_address",
    description: "⚠️ Identify possible malicious addresses or scam wallets, protect users from potential threats",
    schema: {
        chainId: z.number().describe("Chain ID, such as Ethereum (1), BSC (56), etc."),
        address: z.string().describe("Address to be checked")
    },
    handler: async (args, extra) => {
        logToFile(`Start checking address: chainId=${args.chainId}, address=${args.address}`);
        try {
            logToFile(`Creating authorized client...`);
            // Create authorized client
            const client = await createAuthorizedClient();
            if (!client) {
                throw new Error('Failed to create authorized client: client is null');
            }
            // Log the request URL - modify request format according to API specifications
            const requestUrl = `/address_security/${args.address}${args.chainId ? `?chain_id=${args.chainId}` : ''}`;
            logToFile(`Sending request: GET ${API_BASE_URL}${requestUrl}`);
            // Send request
            const response = await client.get(requestUrl);
            // Log response data
            logToFile(`Response status code: ${response.status}`);
            // Analyze data and return structured results
            const result = analyzeMaliciousAddressData(response.data, args.address);
            // Create a more concise result output
            const outputResult = {
                success: result.success,
                address: result.address,
                isMalicious: result.isMalicious,
                riskLevel: result.riskLevel,
                maliciousActivities: result.maliciousActivities,
                dataSource: result.dataSource
            };
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(outputResult, null, 2)
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
            // If the API is unavailable, try using mock data
            const mockData = getMockData(args.address);
            const mockResult = analyzeMaliciousAddressData(mockData, args.address);
            // Create simplified error output
            const errorOutput = {
                success: false,
                error: errorMessage,
                address: args.address,
                chainId: args.chainId,
                mockData: {
                    isMalicious: mockResult.isMalicious,
                    riskLevel: mockResult.riskLevel,
                    maliciousActivities: mockResult.maliciousActivities
                },
                isMockData: true
            };
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(errorOutput, null, 2)
                    }]
            };
        }
    }
};
