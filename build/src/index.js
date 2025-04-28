import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { registerTools } from "./tools/index.js";
import { MCP_SERVER_CONFIG } from "./config/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Load environment variables
dotenv.config();
// Global state
const state = {
    // Store session data including server and transport
    sessions: new Map()
};
// Middleware to load environment variables
async function loadEnvironmentVariables(ctx, next) {
    // Set environment in ctx.state
    ctx.state.env = {
        account: ctx.account
    };
    await next();
}
// Handle tool calls
async function handleToolCall(server, name, args, ctx) {
    try {
        // Get environment variables from ctx.state if available
        const envOptions = ctx?.state?.env || {};
        console.log("Tool call options:", JSON.stringify({ name, args, envOptions }, null, 2));
        // Create a tool call request
        const request = {
            method: "callTool",
            params: {
                name,
                arguments: args
            }
        };
        // Send the request and get the response
        const response = await server.request(request, CallToolRequestSchema);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(response, null, 2)
                }],
            isError: false
        };
    }
    catch (error) {
        console.error(`Error in handleToolCall for ${name}:`, error);
        return {
            content: [{
                    type: "text",
                    text: `Error executing tool ${name}: ${error.message}`
                }],
            isError: true
        };
    }
}
// Setup MCP server
function setupServer(server, initialCtx) {
    // Store the current Koa context in a closure for the tool handler
    let currentCtx = initialCtx;
    // Add a method to update the context for subsequent requests in the same session
    server.setContext = (newCtx) => {
        currentCtx = newCtx;
    };
    // Register all tools with the server
    registerTools(server, { account: initialCtx?.account });
    return server;
}
// Create the Koa server with streamable HTTP support
export function createServer() {
    const app = new Koa();
    const router = new Router();
    // Use middleware
    app.use(cors());
    app.use(bodyParser());
    // Single unified MCP endpoint for Streamable HTTP
    router.all("/mcp", loadEnvironmentVariables, async (ctx) => {
        // Extract the session ID from the header (if it exists)
        const sessionId = ctx.get('Mcp-Session-Id');
        const session = sessionId ? state.sessions.get(sessionId) : undefined;
        if (ctx.method === 'GET') {
            // Handle GET request for server-to-client SSE stream
            if (session) {
                console.log(`GET request for existing session ${sessionId}`);
                // Existing session, use the transport for SSE streaming
                await session.transport.handleRequest(ctx.req, ctx.res);
                ctx.respond = false; // Transport handles the response
            }
            else {
                // No session ID or invalid session ID for GET
                console.log(`GET request with invalid/missing session ID: ${sessionId}`);
                ctx.status = 404;
                ctx.body = "Session not found for SSE stream";
            }
        }
        else if (ctx.method === 'POST') {
            if (session) {
                console.log(`POST request for existing session ${sessionId}`);
                // Update context for this specific request before handling
                session.server.setContext(ctx);
                // Pass parsed body (from koa-bodyparser) to handleRequest
                await session.transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
                ctx.respond = false; // Transport handles the response
            }
            else if (!sessionId) {
                // No session ID header - treat as initialization request for a new session
                console.log("POST request: Initializing new session");
                // Create transport WITH session ID generation for stateful behavior
                const transportOptions = {
                    // Generate a new UUID for each session
                    sessionIdGenerator: () => randomUUID(),
                    // Store session *after* ID is generated and transport is initialized
                    onsessioninitialized: (newSessionId) => {
                        // Now we have the ID, store the server and transport
                        state.sessions.set(newSessionId, {
                            server,
                            transport,
                            connectedAt: new Date(),
                            lastActivity: new Date()
                        });
                        console.log(`New session ${newSessionId} initialized and stored.`);
                        // Handle session cleanup when the *initial* request connection ends
                        ctx.req.on("close", () => {
                            if (state.sessions.has(newSessionId)) {
                                console.log(`Initial POST connection closed for session ${newSessionId}. Session remains active until GET disconnects or explicit DELETE.`);
                            }
                        });
                        // More robust cleanup when the SSE (GET) connection closes
                        transport.onclose = () => {
                            if (state.sessions.has(newSessionId)) {
                                console.log(`SSE connection closed for session ${newSessionId}. Cleaning up.`);
                                server.close(); // Close the MCP server
                                state.sessions.delete(newSessionId); // Remove from state
                            }
                        };
                    }
                };
                const transport = new StreamableHTTPServerTransport(transportOptions);
                // Create a new server instance for this session
                const server = new McpServer({
                    name: MCP_SERVER_CONFIG.name,
                    version: MCP_SERVER_CONFIG.version,
                    systemPrompt: MCP_SERVER_CONFIG.systemPrompt
                }, { capabilities: { resources: {}, tools: {} } });
                // Set up the server handlers, passing the initial context
                setupServer(server, ctx);
                // Connect the server to the transport (asynchronous)
                await server.connect(transport);
                // Handle the initialization request using the public method
                // Pass the parsed body
                await transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
                ctx.respond = false; // Transport handles the response
            }
            else {
                // Session ID header was present, but not found in our state
                console.log(`POST request with invalid session ID: ${sessionId}`);
                ctx.status = 404;
                ctx.body = "Session not found";
            }
        }
        else if (ctx.method === 'DELETE') {
            // Handle explicit session termination
            if (session) {
                console.log(`DELETE request received for session ${sessionId}. Terminating.`);
                await session.server.close(); // Gracefully close MCP server
                await session.transport.close(); // Close transport resources
                state.sessions.delete(sessionId); // Remove from state map
                ctx.status = 204; // No Content success status for DELETE
            }
            else {
                console.log(`DELETE request with invalid session ID: ${sessionId}`);
                ctx.status = 404;
                ctx.body = "Session not found";
            }
        }
        else {
            // Method not allowed
            ctx.status = 405;
            ctx.body = "Method Not Allowed";
        }
    });
    // Set up routes
    app.use(router.routes()).use(router.allowedMethods());
    return app;
}
// Start server
const port = process.env.PORT || 30400;
const app = createServer();
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/mcp`);
    console.log(`Active sessions: ${state.sessions.size}`);
});
