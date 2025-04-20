/**
 * Screenshot MCP Server
 * 
 * Main entry point for the Screenshot MCP Server that provides
 * screenshot capabilities for Godot games, PyGame applications,
 * and other visual applications on macOS.
 */

const { MCPServer } = require('./core/mcpInterface');
const captureTools = require('./tools/captureTools');
const screenshotResources = require('./resources/screenshotResources');
const fs = require('fs-extra');
const path = require('path');

// Ensure screenshots directory exists
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
fs.ensureDirSync(SCREENSHOT_DIR);

// Create MCP Server
const server = new MCPServer({
  name: 'screenshot-mcp',
  description: 'MCP Server for capturing screenshots of applications, particularly Godot games and PyGame',
  version: '1.0.0',
  baseUrl: 'screenshot://',
  port: process.env.PORT || 3000
});

// Register tools
server.registerTool('capture_full_screen', captureTools.captureFullScreen);
server.registerTool('capture_window', captureTools.captureWindow);
server.registerTool('capture_application', captureTools.captureApplication);
server.registerTool('list_windows', captureTools.listWindows);
server.registerTool('capture_region', captureTools.captureRegion);

// Register resources
server.registerResource('latest', screenshotResources.latestScreenshot);
server.registerResource('history', screenshotResources.screenshotHistory);
server.registerTemplateResource('history/{id}', screenshotResources.screenshotById);

// Start the server
const startServer = () => {
  try {
    server.start();
    console.log('Screenshot MCP Server started successfully');
    
    // Print server configuration
    console.log('\nServer Configuration:');
    console.log(JSON.stringify(server.buildServerConfig(), null, 2));
    
    // Print usage examples
    console.log('\nUsage Examples:');
    console.log('1. List all available windows:');
    console.log('   Tool: list_windows');
    console.log('   Params: {}');
    console.log('\n2. Capture a specific window:');
    console.log('   Tool: capture_window');
    console.log('   Params: {"windowTitle": "Godot"}');
    console.log('\n3. Capture a Godot game:');
    console.log('   Tool: capture_application');
    console.log('   Params: {"appType": "godot"}');
    console.log('\n4. Access the latest screenshot:');
    console.log('   Resource: screenshot://latest');
  } catch (error) {
    console.error('Failed to start Screenshot MCP Server:', error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down Screenshot MCP Server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down Screenshot MCP Server...');
  server.stop();
  process.exit(0);
});

// If this file is run directly, start the server
if (require.main === module) {
  startServer();
}

// Export for programmatic usage
module.exports = {
  server,
  startServer
};