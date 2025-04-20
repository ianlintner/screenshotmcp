/**
 * MCP Interface Module
 * 
 * Provides a simplified interface for implementing MCP tools and resources.
 * This is a mock implementation that can be replaced with the actual
 * @modelcontextprotocol/server and @modelcontextprotocol/toolkit
 * implementations when they become available.
 */

class MCPServer {
  constructor(options = {}) {
    this.name = options.name || 'screenshot-mcp';
    this.description = options.description || 'Screenshot MCP Server for capturing screenshots of applications';
    this.version = options.version || '1.0.0';
    this.tools = {};
    this.resources = {};
    this.baseUrl = options.baseUrl || 'screenshot://';
    this.isRunning = false;
    this.port = options.port || 3000;
  }

  /**
   * Registers a tool with the MCP server
   * 
   * @param {string} name - Tool name
   * @param {Object} toolDef - Tool definition
   * @param {string} toolDef.description - Tool description
   * @param {Object} toolDef.inputSchema - JSON Schema for tool input
   * @param {Function} toolDef.handler - Tool implementation function
   */
  registerTool(name, toolDef) {
    this.tools[name] = toolDef;
    console.log(`Registered tool: ${name}`);
    return this;
  }

  /**
   * Registers a resource with the MCP server
   * 
   * @param {string} uri - Resource URI (without base URL)
   * @param {Object} resourceDef - Resource definition
   * @param {string} resourceDef.description - Resource description
   * @param {Function} resourceDef.handler - Resource implementation function
   */
  registerResource(uri, resourceDef) {
    const fullUri = uri.startsWith(this.baseUrl) ? uri : `${this.baseUrl}${uri}`;
    this.resources[fullUri] = resourceDef;
    console.log(`Registered resource: ${fullUri}`);
    return this;
  }

  /**
   * Registers a parameterized resource with the MCP server
   * 
   * @param {string} uriTemplate - Resource URI template (e.g., 'screenshot://history/{id}')
   * @param {Object} resourceDef - Resource definition
   * @param {string} resourceDef.description - Resource description
   * @param {Function} resourceDef.handler - Resource implementation function that takes params
   */
  registerTemplateResource(uriTemplate, resourceDef) {
    const fullUriTemplate = uriTemplate.startsWith(this.baseUrl) 
      ? uriTemplate 
      : `${this.baseUrl}${uriTemplate}`;
    
    this.resources[fullUriTemplate] = {
      ...resourceDef,
      isTemplate: true,
      template: fullUriTemplate
    };
    console.log(`Registered template resource: ${fullUriTemplate}`);
    return this;
  }

  /**
   * Starts the MCP server
   */
  start() {
    if (this.isRunning) {
      console.log('Server is already running');
      return;
    }
    
    console.log(`Starting ${this.name} (version ${this.version})...`);
    console.log(`Registered tools: ${Object.keys(this.tools).join(', ')}`);
    console.log(`Registered resources: ${Object.keys(this.resources).join(', ')}`);
    
    this.isRunning = true;
    
    // Mock server listening on HTTP
    console.log(`MCP Server is running on port ${this.port}`);
    
    // Actual implementation would start an HTTP server or other transport
    return this;
  }

  /**
   * Stops the MCP server
   */
  stop() {
    if (!this.isRunning) {
      console.log('Server is not running');
      return;
    }
    
    console.log('Stopping MCP Server...');
    this.isRunning = false;
    
    // Actual implementation would stop the HTTP server or other transport
    return this;
  }

  /**
   * Builds a server configuration object
   * 
   * @returns {Object} Server configuration
   */
  buildServerConfig() {
    return {
      serverName: this.name,
      description: this.description,
      version: this.version,
      capabilities: {
        tools: Object.entries(this.tools).map(([name, def]) => ({
          name,
          description: def.description,
          inputSchema: def.inputSchema
        })),
        resources: Object.entries(this.resources).map(([uri, def]) => ({
          uri,
          description: def.description,
          isTemplate: !!def.isTemplate
        }))
      }
    };
  }
}

module.exports = {
  MCPServer
};