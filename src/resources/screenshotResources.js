/**
 * MCP Screenshot Resources
 * 
 * Implements all the MCP resources for accessing screenshots.
 */

const screenshotManager = require('../core/screenshotManager');
const fs = require('fs-extra');
const path = require('path');

/**
 * Resource: screenshot://latest
 * Gets the most recent screenshot
 */
const latestScreenshot = {
  description: 'Gets the most recent screenshot',
  handler: async () => {
    try {
      const screenshot = screenshotManager.getLatestScreenshot();
      
      if (!screenshot) {
        return {
          success: false,
          error: 'No screenshots available'
        };
      }
      
      // Check if the file still exists
      if (screenshot.filePath && !fs.existsSync(screenshot.filePath)) {
        return {
          success: false,
          error: 'Screenshot file no longer exists'
        };
      }
      
      // Read the file if it exists
      let base64Data = null;
      if (screenshot.filePath) {
        const buffer = await fs.readFile(screenshot.filePath);
        base64Data = buffer.toString('base64');
      } else {
        base64Data = screenshot.base64;
      }
      
      return {
        success: true,
        screenshot: {
          id: screenshot.id,
          timestamp: screenshot.timestamp,
          type: screenshot.type,
          format: screenshot.format,
          width: screenshot.width,
          height: screenshot.height,
          filePath: screenshot.filePath,
          base64: base64Data
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
 * Resource: screenshot://history
 * Gets a list of recent screenshots with metadata
 */
const screenshotHistory = {
  description: 'Gets a list of recent screenshots with metadata',
  handler: async () => {
    try {
      const history = screenshotManager.getScreenshotHistory();
      
      return {
        success: true,
        history
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
 * Resource Template: screenshot://history/{id}
 * Gets a specific screenshot by ID
 */
const screenshotById = {
  description: 'Gets a specific screenshot by ID',
  handler: async (params) => {
    try {
      const { id } = params;
      
      if (!id) {
        return {
          success: false,
          error: 'Screenshot ID is required'
        };
      }
      
      const screenshot = screenshotManager.getScreenshotById(id);
      
      if (!screenshot) {
        return {
          success: false,
          error: `Screenshot with ID "${id}" not found`
        };
      }
      
      // Check if the file still exists
      if (screenshot.filePath && !fs.existsSync(screenshot.filePath)) {
        return {
          success: false,
          error: 'Screenshot file no longer exists'
        };
      }
      
      // Read the file if it exists
      let base64Data = null;
      if (screenshot.filePath) {
        const buffer = await fs.readFile(screenshot.filePath);
        base64Data = buffer.toString('base64');
      } else {
        base64Data = screenshot.base64;
      }
      
      return {
        success: true,
        screenshot: {
          id: screenshot.id,
          timestamp: screenshot.timestamp,
          type: screenshot.type,
          format: screenshot.format,
          width: screenshot.width,
          height: screenshot.height,
          filePath: screenshot.filePath,
          base64: base64Data
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
  latestScreenshot,
  screenshotHistory,
  screenshotById
};