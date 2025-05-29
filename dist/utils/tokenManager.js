"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenManager = void 0;
class TokenManager {
    constructor() {
        this.DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.currentToken = null;
        this.tokenCache = new Map();
        // Start cleanup interval
        setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
    }
    static getInstance() {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }
        return TokenManager.instance;
    }
    /**
     * Set the current GoPlus API token
     * @param token The GoPlus API token
     * @param expiry Optional custom expiry time in milliseconds
     */
    setGoPlusToken(token, expiry) {
        this.currentToken = token;
        const expiresAt = Date.now() + (expiry || this.DEFAULT_EXPIRY);
        this.tokenCache.set('goplus', { token, expiresAt });
    }
    /**
     * Get the current GoPlus API token
     * @returns The current token if valid, null otherwise
     */
    getGoPlusToken() {
        const tokenInfo = this.tokenCache.get('goplus');
        if (!tokenInfo)
            return null;
        if (Date.now() > tokenInfo.expiresAt) {
            this.tokenCache.delete('goplus');
            this.currentToken = null;
            return null;
        }
        return tokenInfo.token;
    }
    /**
     * Check if the current GoPlus API token is valid
     * @returns boolean indicating if the token is valid
     */
    hasValidGoPlusToken() {
        return this.getGoPlusToken() !== null;
    }
    /**
     * Get the authorization header for GoPlus API requests
     * @returns The authorization header value or null if no valid token
     */
    getAuthorizationHeader() {
        const token = this.getGoPlusToken();
        return token ? `${token}` : null;
    }
    /**
     * Clean up expired tokens
     */
    cleanup() {
        const now = Date.now();
        for (const [key, tokenInfo] of this.tokenCache.entries()) {
            if (now > tokenInfo.expiresAt) {
                this.tokenCache.delete(key);
                if (key === 'goplus') {
                    this.currentToken = null;
                }
            }
        }
    }
    /**
     * Clear all tokens
     */
    clearAll() {
        this.tokenCache.clear();
        this.currentToken = null;
    }
}
exports.tokenManager = TokenManager.getInstance();
