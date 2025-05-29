interface TokenInfo {
  token: string;
  expiresAt: number;
}

class TokenManager {
  private static instance: TokenManager;
  private tokenCache: Map<string, TokenInfo>;
  private readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private currentToken: string | null = null;

  private constructor() {
    this.tokenCache = new Map();
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
  }

  public static getInstance(): TokenManager {
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
  public setGoPlusToken(token: string, expiry?: number): void {
    this.currentToken = token;
    const expiresAt = Date.now() + (expiry || this.DEFAULT_EXPIRY);
    this.tokenCache.set('goplus', { token, expiresAt });
  }

  /**
   * Get the current GoPlus API token
   * @returns The current token if valid, null otherwise
   */
  public getGoPlusToken(): string | null {
    const tokenInfo = this.tokenCache.get('goplus');
    if (!tokenInfo) return null;

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
  public hasValidGoPlusToken(): boolean {
    return this.getGoPlusToken() !== null;
  }

  /**
   * Get the authorization header for GoPlus API requests
   * @returns The authorization header value or null if no valid token
   */
  public getAuthorizationHeader(): string | null {
    const token = this.getGoPlusToken();
    return token ? `${token}` : null;
  }

  /**
   * Clean up expired tokens
   */
  private cleanup(): void {
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
  public clearAll(): void {
    this.tokenCache.clear();
    this.currentToken = null;
  }
}

export const tokenManager = TokenManager.getInstance(); 