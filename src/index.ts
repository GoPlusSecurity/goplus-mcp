#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport, StreamableHTTPServerTransportOptions } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools, ToolContext } from "./tools/index.js";
import { logger } from "./utils/logger.js";
import dotenv from "dotenv";
import { MCP_SERVER_CONFIG } from "./config/index.js";
import { randomUUID } from "node:crypto";

// Load environment variables
dotenv.config();

// Check required environment variables
const requiredEnvVars = ['GOPLUS_API_KEY', 'GOPLUS_API_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  logger.error('Please set these variables in your environment or .env file');
  process.exit(1);
}

async function main() {
  try {
    // Create MCP server with configuration
    const server = new McpServer(
      {
        name: MCP_SERVER_CONFIG.name,
        version: MCP_SERVER_CONFIG.version,
        systemPrompt: MCP_SERVER_CONFIG.systemPrompt
      },
      { capabilities: { resources: {}, tools: {} } }
    );
    
    // Register all tools with empty context
    const toolContext: ToolContext = {};
    registerTools(server, toolContext);
    
    // Create transport with options
    const transportOptions: StreamableHTTPServerTransportOptions = {
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        logger.info(`New session ${sessionId} initialized`);
      }
    };
    const transport = new StreamableHTTPServerTransport(transportOptions);
    
    // Connect server to transport
    await server.connect(transport);
    
    logger.info('GoPlus MCP server is running');
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

main();