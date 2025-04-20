# Screenshot MCP Server

An MCP (Model Context Protocol) server for capturing screenshots of applications on macOS, with special support for Godot games and PyGame applications.

## Features

- **Full Screen Capture**: Capture the entire screen with customizable format and quality
- **Window Capture**: Capture specific application windows by title
- **Region Capture**: Capture specific regions of the screen
- **Application Detection**: Auto-detect and capture Godot and PyGame applications
- **Window Listing**: List all available windows that can be captured
- **Screenshot History**: Access previously captured screenshots
- **Multiple Formats**: Support for PNG and JPG formats with quality settings
- **macOS Optimized**: Uses native macOS screencapture for best quality and performance

## Requirements

- macOS (primary platform, some features may work on other platforms)
- Node.js v16.0.0 or higher
- npm (comes with Node.js)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/screenshotmcp.git
   cd screenshotmcp
   ```

2. Run the installation script:
   ```
   chmod +x install.sh
   ./install.sh
   ```

   Or install manually:
   ```
   npm install
   ```

## Usage

### Starting the Server

```
npm start
```

For development with auto-reload:
```
npm run dev
```

### Running the Example Client

```
node examples/client.js
```

### MCP Tools

The server provides the following MCP tools:

#### 1. `capture_full_screen`

Captures the entire screen.

**Input Schema:**
```json
{
  "format": "png",     // Image format: 'png' or 'jpg'
  "quality": 100,      // Image quality (1-100, only applies to jpg)
  "saveToFile": true   // Whether to save to file
}
```

#### 2. `capture_window`

Captures a specific window by title.

**Input Schema:**
```json
{
  "windowTitle": "Godot",  // Title or partial title of window to capture
  "format": "png",         // Image format: 'png' or 'jpg'
  "quality": 100,          // Image quality (1-100, only applies to jpg)
  "saveToFile": true       // Whether to save to file
}
```

#### 3. `capture_application`

Automatically detects and captures Godot or PyGame applications.

**Input Schema:**
```json
{
  "appType": "any",      // Type of application: 'godot', 'pygame', or 'any'
  "format": "png",       // Image format: 'png' or 'jpg'
  "quality": 100,        // Image quality (1-100, only applies to jpg)
  "saveToFile": true     // Whether to save to file
}
```

#### 4. `list_windows`

Lists all available windows that can be captured.

**Input Schema:**
```json
{}  // No parameters required
```

#### 5. `capture_region`

Captures a specific region of the screen.

**Input Schema:**
```json
{
  "x": 100,              // X-coordinate of top-left corner
  "y": 100,              // Y-coordinate of top-left corner
  "width": 400,          // Width of region in pixels
  "height": 300,         // Height of region in pixels
  "format": "png",       // Image format: 'png' or 'jpg'
  "quality": 100,        // Image quality (1-100, only applies to jpg)
  "saveToFile": true     // Whether to save to file
}
```

### MCP Resources

The server provides the following MCP resources:

#### 1. `screenshot://latest`

Gets the most recent screenshot.

#### 2. `screenshot://history`

Gets a list of recent screenshots with metadata.

#### 3. `screenshot://history/{id}`

Gets a specific screenshot by ID.

## Integration with MCP Clients

This server implements a simplified MCP interface. To integrate with real MCP clients, you would need to:

1. Install the MCP client library in your application
2. Connect to this server using the MCP protocol
3. Use the tools and resources as documented above

Example (pseudo-code):
```javascript
// Connect to the server
const mcpClient = new MCPClient("screenshot-mcp");

// Capture a window
const result = await mcpClient.useTool("capture_window", {
  windowTitle: "Godot Game",
  format: "png"
});

// Access the screenshot data
console.log(`Screenshot saved to: ${result.screenshot.filePath}`);
```

## Troubleshooting

### No Windows Found

If `list_windows` returns an empty list:
- Make sure you have open application windows
- Try running the application with elevated permissions
- On macOS, make sure you've granted screen recording permissions to Terminal/iTerm

### Errors Capturing Screenshots

- Check that your system supports the methods used by the `screenshot-desktop` package
- Ensure you have proper permissions for screen recording
- Try running the server with sudo for troubleshooting

### Window Capture Not Working

- Make sure the window title you're searching for is correct
- Some applications use dynamic titles or have special characters
- Try using a partial window title instead of the exact title

## License

ISC