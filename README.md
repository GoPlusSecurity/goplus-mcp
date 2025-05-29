# GoPlus MCP Server

[GoPlus Security](https://gopluslabs.io) is the leading Web3 security layer, providing comprehensive protection for multiple blockchain ecosystems. This project provides a MCP server for LLM Client to connect to the GoPlus Security Intelligence. Through this server, LLM Client can directly access and analyze blockchain security data, helping users with token security analysis, address risk assessment, and comprehensive Web3 security checks.

## Prerequisites

### API Credentials
To use this MCP server, you need GoPlus API credentials. You can obtain your API key and secret by contacting GoPlus through their official website: [https://gopluslabs.io/security-api](https://gopluslabs.io/security-api)

## Installation

### Global Installation
```bash
npm install -g goplus-mcp
```

### Configuration in Claude
To use this MCP server in the Claude desktop application, add the following to Claude's configuration file:

```json
{
  "mcpServers": {
    "goplus": {
      "command": "npx",
      "args": [
        "-y",
        "goplus-mcp@latest",
        "--key",
        "YOUR_GOPLUS_API_KEY",
        "--secret",
        "YOUR_GOPLUS_API_SECRET"
      ]
    }
  }
}
```

## Command Line Options

| Option | Description | Default Value |
|--------|-------------|---------------|
| `-k, --key <key>` | GoPlus API Key | - |
| `-s, --secret <secret>` | GoPlus API Secret | - |

## Supported Blockchains

### EVM-Compatible Chains

| Chain Name | Chain ID | Network Type |
|------------|----------|--------------|
| Ethereum | 1 | Mainnet |
| BSC | 56 | Mainnet |
| Arbitrum | 42161 | Layer 2 |
| Polygon | 137 | Mainnet |
| opBNB | 204 | Layer 2 |
| zkSync Era | 324 | Layer 2 |
| Linea Mainnet | 59144 | Layer 2 |
| Base | 8453 | Layer 2 |
| Mantle | 5000 | Layer 2 |
| Unichain | 130 | Layer 2 |
| Scroll | 534352 | Layer 2 |
| Optimism | 10 | Layer 2 |
| Avalanche | 43114 | Mainnet |
| Fantom | 250 | Mainnet |
| Cronos | 25 | Mainnet |
| HECO | 128 | Mainnet |
| Gnosis | 100 | Mainnet |
| KCC | 321 | Mainnet |
| FON | 201022 | Mainnet |
| ZKFair | 42766 | Layer 2 |
| Morph | 2818 | Layer 2 |
| Soneium | 1868 | Layer 2 |
| Story | 1514 | Layer 1 |
| Sonic | 146 | Layer 1 |
| Abstract | 2741 | Layer 2 |
| Hashkey | 177 | Layer 1 |
| Berachain | 80094 | Layer 1 |
| Monad | 10143 | Layer 1 |
| World Chain | 480 | Layer 2 |
| Blast | 81457 | Layer 2 |
| Gravity | 1625 | Layer 1 |
| Mint | 185 | Layer 2 |
| Zircuit | 48899 | Layer 2 |
| X Layer Mainnet | 196 | Layer 2 |
| zkLink Nova | 810180 | Layer 2 |
| Bitlayer Mainnet | 200901 | Layer 2 |
| Merlin | 4200 | Layer 2 |
| Manta Pacific | 169 | Layer 2 |

### Non-EVM Chains

| Chain Name | Chain ID | Native Support |
|------------|----------|----------------|
| Solana | solana | ✅ Full Support |
| Tron | tron | ✅ Full Support |
| Sui | - | ✅ Full Support |

## Supported GoPlus Tools

This MCP server provides the following GoPlus security analysis tools:

### Core Security Analysis Tools

- **`token_security`** - Analyze token security for EVM-compatible blockchains with comprehensive risk assessment including honeypot detection, liquidity analysis, and holder concentration

- **`malicious_address`** - Detect malicious addresses and potential scams across multiple blockchains with real-time threat intelligence

- **`phishing_website`** - Detect phishing websites and malicious URLs in the crypto space using GoPlus's extensive database

- **`nft_security`** - Analyze NFT contract security and detect potential risks with optional specific token analysis

- **`approval_security`** - Analyze token approvals and detect potential security risks for user addresses

### Multi-Chain Support Tools

- **`solana_token_security`** - Analyze Solana token security including mint authority, freeze capability, and metadata mutability

- **`sui_token_security`** - Analyze Sui token security including contract upgradeability and capability ownership

## Tool Parameters

### EVM-Compatible Chain Tools
**Parameters for `token_security`, `malicious_address`, `nft_security`, `approval_security`:**
- `chain_id`: Blockchain ID (see supported chains table above)
- `contract_addresses` or `addresses`: Contract/wallet address(es) to analyze (comma-separated for multiple)
- `token_id` (NFT only): Optional token ID for specific NFT analysis

### Cross-Chain Tools
**Parameters for `phishing_website`:**
- `url`: Website URL to check for phishing and security risks

**Parameters for `solana_token_security`, `sui_token_security`:**
- `contract_addresses`: Token contract address(es) to analyze (comma-separated for multiple)

## Usage Examples

### Command Line
```bash
# Start the server
goplus-mcp --key YOUR_API_KEY --secret YOUR_API_SECRET
```

### In Claude
Once configured, you can ask Claude to:
- "Analyze the security of this token contract on Ethereum: 0x..."
- "Check if this address is malicious: 0x..."
- "Is this website a phishing site: https://..."
- "Analyze this NFT contract security on Polygon"
- "Check my token approvals for potential risks"

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/GoPlusSecurity/goplus-mcp.git
   cd goplus-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run the server:
   ```bash
   npm start -- --key YOUR_API_KEY --secret YOUR_API_SECRET
   ```

## API Coverage

This MCP server covers the following GoPlus API endpoints:
- Token Security Analysis (EVM chains)
- Address Security Check
- Phishing Site Detection
- NFT Security Analysis (EVM chains)
- Approval Security Analysis (EVM chains)
- Solana Token Security Analysis
- Sui Token Security Analysis

## License

MIT
