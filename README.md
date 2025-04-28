# GoPlus-MCP

## Description
This project is designed to provide security analysis tools for blockchain assets, including token security, malicious address detection, approval security, and phishing website detection. It utilizes the GoPlus security API to perform these analyses and return structured results.

## Installation
To install the project dependencies, run the following command:

```bash
npm install goplus-mcp
```

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# GoPlus API credentials
GOPLUS_API_KEY=your_api_key_here
GOPLUS_API_SECRET=your_api_secret_here

# Server configuration
PORT=30400
```

You can obtain your GoPlus API credentials by signing up at [GoPlus Security](https://gopluslabs.io/).

## Development
To start the development server:

```bash
npm run dev
```

## Build
To build the project:

```bash
npm run build
```

## Deployment Guide

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- PM2 (for production deployment)

### Local Deployment
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

4. Start the service:
```bash
npm start
```

### Production Deployment with PM2

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create a PM2 ecosystem file (ecosystem.config.js):
```javascript
module.exports = {
  apps: [{
    name: "goplus-mcp",
    script: "build/src/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 30400
    }
  }]
}
```

3. Start the service using PM2:
```bash
pm2 start ecosystem.config.js
```

4. Save the PM2 process list:
```bash
pm2 save
```

5. Setup PM2 to start on system boot:
```bash
pm2 startup
```

### Deployment Verification

1. Check service status:
```bash
pm2 status
```

2. View logs:
```bash
pm2 logs goplus-mcp
```

3. Monitor the service:
```bash
pm2 monit
```

### Common Deployment Commands

```bash
# Restart the service
pm2 restart goplus-mcp

# Stop the service
pm2 stop goplus-mcp

# Delete the service from PM2
pm2 delete goplus-mcp

# View real-time logs
pm2 logs goplus-mcp --lines 100

# View error logs
pm2 logs goplus-mcp --err --lines 100
```

### Troubleshooting

1. If the service fails to start:
   - Check the logs: `pm2 logs goplus-mcp`
   - Verify port availability: `lsof -i :30400`
   - Check Node.js version: `node -v`

2. If the service crashes:
   - Check memory usage: `pm2 monit`
   - Review error logs: `pm2 logs goplus-mcp --err`
   - Verify environment variables

3. If the service is not accessible:
   - Check firewall settings
   - Verify network configuration
   - Test local access: `curl http://localhost:30400/mcp`

## Available Tools
The server provides the following security analysis tools:

- **Token Security Tool**: Detects security risks of token contracts and identifies potential vulnerabilities.
- **Solana Token Security Tool**: Analyzes security risks of Solana tokens.
- **SUI Token Security Tool**: Analyzes security risks of SUI tokens.
- **Malicious Address Tool**: Identifies potential malicious addresses or scam wallets to protect users from threats.
- **Approval Security Tool**: Assesses the security of approval contracts and evaluates potential risks.
- **Phishing Website Tool**: Detects if a URL is a phishing website to protect crypto assets.

## API Usage
The server exposes a single endpoint at `/mcp` that supports the following HTTP methods:

- **GET**: Establishes an SSE (Server-Sent Events) connection for receiving real-time updates
- **POST**: Sends requests to the server
- **DELETE**: Terminates an active session

### Headers
- `Mcp-Session-Id`: Required for maintaining session state (automatically handled by the client)

### Example Usage
```javascript
// Initialize a new session
const response = await fetch('http://localhost:30400/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'callTool',
    params: {
      name: 'tokenSecurity',
      arguments: {
        chainId: '1',
        address: '0x...'
      }
    }
  })
});

// Get the session ID from the response headers
const sessionId = response.headers.get('Mcp-Session-Id');

// Establish SSE connection
const eventSource = new EventSource(`http://localhost:30400/mcp?sessionId=${sessionId}`);
```

## Usage

```bash
# Start the server
npx goplus-mcp
```

The server will start on port 30400 by default. You can change this by setting the `PORT` environment variable.

## Contribution
Contributions are welcome! Please follow these steps to contribute:
1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with clear messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.
