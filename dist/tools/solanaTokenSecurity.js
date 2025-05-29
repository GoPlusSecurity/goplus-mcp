"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSolanaTokenSecurityTool = registerSolanaTokenSecurityTool;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const tokenManager_js_1 = require("../utils/tokenManager.js");
const index_js_1 = require("../config/index.js");
const api_js_1 = require("../utils/api.js");
/**
 * Analyze Solana token security data and return structured results
 * @param tokenData Raw token data from GoPlus API
 * @param tokenAddress Token address
 * @returns Structured analysis results
 */
function analyzeSolanaTokenSecurityData(tokenData, tokenAddress) {
    try {
        // Basic information extraction
        const basicInfo = {
            tokenName: tokenData.metadata?.name || 'Unknown',
            tokenSymbol: tokenData.metadata?.symbol || 'Unknown',
            description: tokenData.metadata?.description || 'Unknown',
            totalSupply: tokenData.total_supply || 'Unknown',
            holderCount: tokenData.holder_count || 'Unknown',
            uri: tokenData.metadata?.uri || 'Unknown'
        };
        // Risk count and classification
        let riskCount = 0;
        let highRisks = [];
        let mediumRisks = [];
        let lowRisks = [];
        // === Contract security risk check ===
        // Mintable status
        if (tokenData.mintable?.status === "1") {
            if (tokenData.mintable?.authority && tokenData.mintable.authority.length > 0) {
                highRisks.push("🔴 Token has mint authority, can be minted");
                riskCount++;
            }
        }
        else if (tokenData.mintable?.status === "0") {
            lowRisks.push("🟢 Token mint authority is disabled");
        }
        // Freezable status
        if (tokenData.freezable?.status === "1") {
            if (tokenData.freezable?.authority && tokenData.freezable.authority.length > 0) {
                highRisks.push("🔴 Token accounts can be frozen");
                riskCount++;
            }
        }
        else if (tokenData.freezable?.status === "0") {
            lowRisks.push("🟢 Token freeze authority is disabled");
        }
        // Closable status
        if (tokenData.closable?.status === "1") {
            if (tokenData.closable?.authority && tokenData.closable.authority.length > 0) {
                highRisks.push("🔴 Token accounts can be closed");
                riskCount++;
            }
        }
        else if (tokenData.closable?.status === "0") {
            lowRisks.push("🟢 Token close authority is disabled");
        }
        // Balance mutable authority
        if (tokenData.balance_mutable_authority?.status === "1") {
            if (tokenData.balance_mutable_authority?.authority && tokenData.balance_mutable_authority.authority.length > 0) {
                highRisks.push("🔴 Token balance can be modified by authority");
                riskCount++;
            }
        }
        else if (tokenData.balance_mutable_authority?.status === "0") {
            lowRisks.push("🟢 Token balance is immutable");
        }
        // Metadata mutable
        if (tokenData.metadata_mutable?.status === "1") {
            if (tokenData.metadata_mutable?.metadata_upgrade_authority && tokenData.metadata_mutable.metadata_upgrade_authority.length > 0) {
                mediumRisks.push("🟡 Token metadata can be modified");
                riskCount++;
                // Check for malicious metadata upgrade authority
                for (const authority of tokenData.metadata_mutable.metadata_upgrade_authority) {
                    if (authority.malicious_address === 1) {
                        highRisks.push("🔴 Metadata upgrade authority is flagged as malicious");
                        riskCount++;
                    }
                }
            }
        }
        else if (tokenData.metadata_mutable?.status === "0") {
            lowRisks.push("🟢 Token metadata is immutable");
        }
        // Transfer fee
        if (tokenData.transfer_fee && Object.keys(tokenData.transfer_fee).length > 0) {
            mediumRisks.push("🟡 Token has transfer fees");
            riskCount++;
        }
        // Transfer fee upgradable
        if (tokenData.transfer_fee_upgradable?.status === "1") {
            if (tokenData.transfer_fee_upgradable?.authority && tokenData.transfer_fee_upgradable.authority.length > 0) {
                mediumRisks.push("🟡 Transfer fee can be modified");
                riskCount++;
            }
        }
        // Transfer hook
        if (tokenData.transfer_hook && tokenData.transfer_hook.length > 0) {
            mediumRisks.push("🟡 Token has transfer hooks");
            riskCount++;
        }
        // Transfer hook upgradable
        if (tokenData.transfer_hook_upgradable?.status === "1") {
            if (tokenData.transfer_hook_upgradable?.authority && tokenData.transfer_hook_upgradable.authority.length > 0) {
                mediumRisks.push("🟡 Transfer hook can be modified");
                riskCount++;
            }
        }
        // Non-transferable
        if (tokenData.non_transferable === "1") {
            highRisks.push("🔴 Token is non-transferable");
            riskCount++;
        }
        else if (tokenData.non_transferable === "0") {
            lowRisks.push("🟢 Token is transferable");
        }
        // Default account state
        if (tokenData.default_account_state === "1") {
            mediumRisks.push("🟡 Token uses default account state (frozen)");
            riskCount++;
        }
        else if (tokenData.default_account_state === "0") {
            lowRisks.push("🟢 Token accounts are initialized as unfrozen");
        }
        // Default account state upgradable
        if (tokenData.default_account_state_upgradable?.status === "1") {
            if (tokenData.default_account_state_upgradable?.authority && tokenData.default_account_state_upgradable.authority.length > 0) {
                mediumRisks.push("🟡 Default account state can be modified");
                riskCount++;
            }
        }
        // Trusted token status
        if (tokenData.trusted_token === 1) {
            lowRisks.push("🟢 Token is marked as trusted");
        }
        else if (tokenData.trusted_token === 0) {
            mediumRisks.push("🟡 Token is not marked as trusted");
            riskCount++;
        }
        // === Liquidity and DEX analysis ===
        if (tokenData.dex && tokenData.dex.length > 0) {
            const dexInfo = {
                totalPools: tokenData.dex.length,
                dexes: tokenData.dex.map((d) => ({
                    name: d.dex_name,
                    type: d.type,
                    tvl: d.tvl,
                    price: d.price,
                    burnPercent: d.burn_percent
                }))
            };
            basicInfo.dexInfo = dexInfo;
            lowRisks.push(`🟢 Token is listed on ${dexInfo.totalPools} DEX pool(s)`);
            // Check for high burn percentage (potential rug pull indicator)
            const highBurnPools = tokenData.dex.filter((d) => d.burn_percent > 50);
            if (highBurnPools.length > 0) {
                highRisks.push(`🔴 High burn percentage detected in ${highBurnPools.length} pool(s)`);
                riskCount++;
            }
        }
        else {
            mediumRisks.push("🟡 Token is not listed on any DEX");
            riskCount++;
        }
        // === Holder analysis ===
        if (tokenData.holders && tokenData.holders.length > 0) {
            const holderInfo = {
                topHolders: tokenData.holders.slice(0, 5),
                totalHolders: tokenData.holder_count
            };
            basicInfo.holderInfo = holderInfo;
            // Check for concentration risk
            const topHolder = tokenData.holders[0];
            if (topHolder && topHolder.percent) {
                const topHolderPercent = parseFloat(topHolder.percent);
                if (topHolderPercent > 0.5) {
                    highRisks.push(`🔴 Top holder owns ${(topHolderPercent * 100).toFixed(2)}% of tokens, high centralization risk`);
                    riskCount++;
                }
                else if (topHolderPercent > 0.2) {
                    mediumRisks.push(`🟡 Top holder owns ${(topHolderPercent * 100).toFixed(2)}% of tokens`);
                    riskCount++;
                }
            }
        }
        // LP holders analysis
        if (tokenData.lp_holders && tokenData.lp_holders.length > 0) {
            const lpInfo = {
                totalLpHolders: tokenData.lp_holders.length,
                lockedLp: tokenData.lp_holders.filter((lp) => lp.is_locked === 1).length
            };
            basicInfo.lpInfo = lpInfo;
            if (lpInfo.lockedLp > 0) {
                lowRisks.push(`🟢 ${lpInfo.lockedLp} LP holder(s) have locked liquidity`);
            }
            else {
                mediumRisks.push("🟡 No locked liquidity detected");
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
        }
        else if (securityScore < 50) {
            riskLevel = "High";
        }
        else if (securityScore < 70) {
            riskLevel = "Medium";
        }
        else if (securityScore < 85) {
            riskLevel = "Low";
        }
        else {
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
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            tokenAddress
        };
    }
}
/**
 * Register Solana token security analysis tool to MCP server
 * @param server MCP server instance
 */
function registerSolanaTokenSecurityTool(server) {
    server.tool('solana_token_security', 'Analyze Solana token security and detect potential risks', {
        contract_addresses: zod_1.z.string().describe('Solana token contract address(es) to analyze, separated by commas for multiple addresses')
    }, async ({ contract_addresses }) => {
        try {
            // Get authorization header
            let authHeader = tokenManager_js_1.tokenManager.getAuthorizationHeader();
            if (!authHeader) {
                const newToken = await (0, api_js_1.getGoPlusAccessToken)();
                tokenManager_js_1.tokenManager.setGoPlusToken(newToken);
                authHeader = tokenManager_js_1.tokenManager.getAuthorizationHeader();
            }
            // Make API request
            const response = await axios_1.default.get(`${index_js_1.API_BASE_URL}/solana/token_security`, {
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
                                    error: "No Solana token security data found for the provided contract address(es)",
                                    contract_addresses: contract_addresses
                                }, null, 2)
                            }
                        ]
                    };
                }
                // Process each contract address
                const analysisResults = {};
                for (const [contractAddress, contractData] of Object.entries(results)) {
                    if (contractData) {
                        analysisResults[contractAddress] = analyzeSolanaTokenSecurityData(contractData, contractAddress);
                    }
                    else {
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
                                blockchain: 'Solana',
                                analysis_results: analysisResults,
                                timestamp: new Date().toISOString()
                            }, null, 2)
                        }
                    ]
                };
            }
            else {
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
        }
        catch (error) {
            let errorMessage = error.message;
            if (error.response) {
                errorMessage = `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
            }
            else if (error.request) {
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
    });
}
