/**
 * MCP Screenshot Capture Tools
 * 
 * Implements all the MCP tools for capturing screenshots.
 */

const screenshotManager = require('../core/screenshotManager');

/**
 * Tool: capture_full_screen
 * Captures the entire screen with format, quality, and storage options
 */
const captureFullScreen = {
  description: 'Captures the entire screen with format, quality, and storage options',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Image format (png or jpg)',
        enum: ['png', 'jpg'],
        default: 'png'
      },
      quality: {
        type: 'number',
        description: 'Image quality (1-100, only applies to jpg)',
        minimum: 1,
        maximum: 100,
        default: 100
      },
      saveToFile: {
        type: 'boolean',
        description: 'Whether to save the screenshot to a file',
        default: true
      }
    }
  },
  handler: async (params) => {
    try {
      const result = await screenshotManager.captureFullScreen(params);
      
      // Return a sanitized response (without the base64 data which could be large)
      return {
        success: true,
        screenshot: {
          id: result.id,
          timestamp: result.timestamp,
          type: result.type,
          format: result.format,
          width: result.width,
          height: result.height,
          filePath: result.filePath,
          // Include a truncated preview of the base64 data
          base64Preview: result.base64.substring(0, 100) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * Tool: capture_window
 * Captures a specific window by title with customizable output settings
 */
const captureWindow = {
  description: 'Captures a specific window by title with customizable output settings',
  inputSchema: {
    type: 'object',
    properties: {
      windowTitle: {
        type: 'string',
        description: 'Title or partial title of the window to capture'
      },
      format: {
        type: 'string',
        description: 'Image format (png or jpg)',
        enum: ['png', 'jpg'],
        default: 'png'
      },
      quality: {
        type: 'number',
        description: 'Image quality (1-100, only applies to jpg)',
        minimum: 1,
        maximum: 100,
        default: 100
      },
      saveToFile: {
        type: 'boolean',
        description: 'Whether to save the screenshot to a file',
        default: true
      }
    },
    required: ['windowTitle']
  },
  handler: async (params) => {
    try {
      const result = await screenshotManager.captureWindow(params);
      
      return {
        success: true,
        screenshot: {
          id: result.id,
          timestamp: result.timestamp,
          type: result.type,
          windowTitle: result.windowTitle,
          windowId: result.windowId,
          format: result.format,
          width: result.width,
          height: result.height,
          filePath: result.filePath,
          base64Preview: result.base64.substring(0, 100) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * Tool: capture_application
 * Automatically detects and captures Godot or PyGame applications
 */
const captureApplication = {
  description: 'Automatically detects and captures Godot or PyGame applications',
  inputSchema: {
    type: 'object',
    properties: {
      appType: {
        type: 'string',
        description: 'Type of application to detect',
        enum: ['godot', 'pygame', 'any'],
        default: 'any'
      },
      format: {
        type: 'string',
        description: 'Image format (png or jpg)',
        enum: ['png', 'jpg'],
        default: 'png'
      },
      quality: {
        type: 'number',
        description: 'Image quality (1-100, only applies to jpg)',
        minimum: 1,
        maximum: 100,
        default: 100
      },
      saveToFile: {
        type: 'boolean',
        description: 'Whether to save the screenshot to a file',
        default: true
      }
    }
  },
  handler: async (params) => {
    try {
      const result = await screenshotManager.captureApplication(params);
      
      return {
        success: true,
        screenshot: {
          id: result.id,
          timestamp: result.timestamp,
          type: result.type,
          appType: params.appType || 'any',
          windowTitle: result.windowTitle,
          format: result.format,
          width: result.width,
          height: result.height,
          filePath: result.filePath,
          base64Preview: result.base64.substring(0, 100) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * Tool: list_windows
 * Lists all available windows that can be captured
 */
const listWindows = {
  description: 'Lists all available windows that can be captured',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const windows = await screenshotManager.listWindows();
      
      return {
        success: true,
        windows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * Tool: capture_region
 * Captures a specific region of the screen defined by coordinates
 */
const captureRegion = {
  description: 'Captures a specific region of the screen defined by coordinates',
  inputSchema: {
    type: 'object',
    properties: {
      x: {
        type: 'number',
        description: 'X-coordinate of the top-left corner of the region'
      },
      y: {
        type: 'number',
        description: 'Y-coordinate of the top-left corner of the region'
      },
      width: {
        type: 'number',
        description: 'Width of the region in pixels'
      },
      height: {
        type: 'number',
        description: 'Height of the region in pixels'
      },
      format: {
        type: 'string',
        description: 'Image format (png or jpg)',
        enum: ['png', 'jpg'],
        default: 'png'
      },
      quality: {
        type: 'number',
        description: 'Image quality (1-100, only applies to jpg)',
        minimum: 1,
        maximum: 100,
        default: 100
      },
      saveToFile: {
        type: 'boolean',
        description: 'Whether to save the screenshot to a file',
        default: true
      }
    },
    required: ['x', 'y', 'width', 'height']
  },
  handler: async (params) => {
    try {
      const result = await screenshotManager.captureRegion(params);
      
      return {
        success: true,
        screenshot: {
          id: result.id,
          timestamp: result.timestamp,
          type: result.type,
          region: result.region,
          format: result.format,
          width: result.width,
          height: result.height,
          filePath: result.filePath,
          base64Preview: result.base64.substring(0, 100) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = {
  captureFullScreen,
  captureWindow,
  captureApplication,
  listWindows,
  captureRegion
};