import { z } from "zod";
import { createAuthorizedClient } from "../utils/api.js";
/**
 * Analyze URL security data and return structured results
 * @param data Raw data returned by the API
 * @param url URL being checked
 * @returns Structured analysis results
 */
function analyzeUrlSecurityData(data, url) {
    try {
        if (!data || !data.result) {
            return { success: false, data };
        }
        const result = data.result;
        const isPhishingSite = result.phishing_site === 1;
        const isContractPhishing = result.is_contract_phishing === 1;
        // Return structured results
        return {
            success: true,
            url,
            isPhishingSite,
            isContractPhishing,
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
 * Create a friendly response for error situations
 */
function createErrorResponse(url, errorMessage) {
    return `📡 **Service temporarily unavailable** - GoPlus security API service is unavailable, unable to check URL security.

🔧 **Fault details**: ${errorMessage}

💬 **Suggested measures**:
- Please try again later
- Confirm your network connection
- Check if the API key is correctly configured

⚠️ **Note**: In case of uncertainty about URL security, it is recommended to take the following measures:
- Do not connect wallet to unknown websites
- Do not sign any transactions
- Check if the URL spelling is correct (beware of similar domain phishing)
- Verify the website address through official channels

-----------------------------

General warning signs of phishing websites:
1. Spelling errors or slight changes in the URL
2. Insecure connection (no HTTPS)
3. Website demands immediate action or offers special deals
4. Crude website design and error-ridden text
5. Requests for private keys or mnemonic phrases

GoPlus is committed to protecting your Web3 assets, thank you for your understanding and patience.`;
}
/**
 * Phishing website detection tool
 * @param params Parameter object
 * @returns Detection result
 */
export const phishingWebsiteTool = {
    name: "check_phishing_website",
    description: "🔍 Detect if a URL is a phishing website, protecting your crypto assets",
    schema: {
        url: z.string().describe("Website URL to be checked")
    },
    handler: async (args, extra) => {
        try {
            const client = await createAuthorizedClient();
            const response = await client.get(`/phishing_site?url=${encodeURIComponent(args.url)}`);
            // Analyze data and return structured results
            const result = analyzeUrlSecurityData(response.data, args.url);
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
                            url: args.url,
                            errorType: error.name
                        }, null, 2)
                    }]
            };
        }
    }
};
