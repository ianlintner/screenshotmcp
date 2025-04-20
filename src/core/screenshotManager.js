/**
 * Screenshot Manager Module
 * 
 * Provides core functionality for capturing screenshots of the screen,
 * specific windows, and applications.
 */

const screenshot = require('screenshot-desktop');
const activeWin = require('active-win');
const { execSync, exec } = require('child_process');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const windowDetection = require('./windowDetection');

// Directory to store screenshots
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

// Create screenshots directory if it doesn't exist
fs.ensureDirSync(SCREENSHOT_DIR);

// Screenshot history storage
const screenshotHistory = [];

// Enhanced window listing function that uses multiple detection methods
const getWindowList = async () => {
  // Use our enhanced window detection module
  return windowDetection.getWindowList();
};

/**
 * Captures the entire screen
 * 
 * @param {Object} options - Capture options
 * @param {string} options.format - Image format (png, jpg)
 * @param {number} options.quality - Image quality (1-100)
 * @param {boolean} options.saveToFile - Whether to save to file
 * @returns {Promise<Object>} Screenshot result with metadata
 */
async function captureFullScreen(options = {}) {
  const format = options.format || 'png';
  const quality = options.quality || 100;
  const saveToFile = options.saveToFile !== undefined ? options.saveToFile : true;
  
  try {
    const timestamp = new Date().toISOString();
    const filename = `fullscreen_${timestamp.replace(/[:.]/g, '-')}.${format}`;
    const filePath = saveToFile ? path.join(SCREENSHOT_DIR, filename) : null;
    
    // Capture the screen
    const imgBuffer = await screenshot();
    
    // Process the image if needed
    let processedBuffer = imgBuffer;
    if (format === 'jpg' || quality < 100) {
      processedBuffer = await sharp(imgBuffer)
        .jpeg({ quality: quality })
        .toBuffer();
    }
    
    // Save to file if requested
    if (saveToFile) {
      await fs.writeFile(filePath, processedBuffer);
    }
    
    // Create screenshot metadata
    const screenshotData = {
      id: generateId(),
      timestamp,
      type: 'fullscreen',
      format,
      quality,
      width: null, // Will be determined from the image
      height: null, // Will be determined from the image
      filePath: filePath,
      base64: processedBuffer.toString('base64')
    };
    
    // Get image dimensions
    const metadata = await sharp(processedBuffer).metadata();
    screenshotData.width = metadata.width;
    screenshotData.height = metadata.height;
    
    // Add to history
    addToHistory(screenshotData);
    
    return screenshotData;
  } catch (error) {
    console.error('Error capturing full screen:', error);
    throw new Error(`Failed to capture full screen: ${error.message}`);
  }
}

/**
 * Captures a specific window by title
 * 
 * @param {Object} options - Capture options
 * @param {string} options.windowTitle - Title of the window to capture
 * @param {string} options.format - Image format (png, jpg)
 * @param {number} options.quality - Image quality (1-100)
 * @param {boolean} options.saveToFile - Whether to save to file
 * @returns {Promise<Object>} Screenshot result with metadata
 */
async function captureWindow(options = {}) {
  const { windowTitle } = options;
  const format = options.format || 'png';
  const quality = options.quality || 100;
  const saveToFile = options.saveToFile !== undefined ? options.saveToFile : true;
  
  if (!windowTitle) {
    throw new Error('Window title is required');
  }
  
  try {
    // Find the window by title
    const windows = await getWindowList();
    const targetWindow = windows.find(win =>
      win.title && win.title.includes(windowTitle)
    );
    
    if (!targetWindow) {
      throw new Error(`Window with title "${windowTitle}" not found`);
    }
    
    const timestamp = new Date().toISOString();
    const filename = `window_${windowTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp.replace(/[:.]/g, '-')}.${format}`;
    const filePath = saveToFile ? path.join(SCREENSHOT_DIR, filename) : null;
    
    // On macOS, we'll use screencapture command
    if (process.platform === 'darwin') {
      try {
        // Create a temporary file path
        const tempFilePath = path.join(SCREENSHOT_DIR, `temp_${Date.now()}.png`);
        
        // Check if we're dealing with an app ID (from the fallback method)
        const isAppId = targetWindow.id.startsWith('app_');
        
        if (isAppId) {
          // For app IDs, we'll use the full screen capture as a fallback
          // since we can't directly target the window
          console.log(`Using full screen capture for ${targetWindow.owner.name}`);
          execSync(`screencapture "${tempFilePath}"`, { stdio: 'inherit' });
        } else {
          // For real window IDs, use -l flag to capture specific window
          console.log(`Using window ID capture for ${targetWindow.id}`);
          execSync(`screencapture -l ${targetWindow.id} "${tempFilePath}"`, { stdio: 'inherit' });
        }
        
        // Process the screenshot
        let processedBuffer = await fs.readFile(tempFilePath);
        
        // Convert/optimize if needed
        if (format === 'jpg' || quality < 100) {
          processedBuffer = await sharp(processedBuffer)
            .jpeg({ quality: quality })
            .toBuffer();
        }
        
        // Save to final destination if requested
        if (saveToFile) {
          await fs.writeFile(filePath, processedBuffer);
        }
        
        // Clean up temp file
        await fs.remove(tempFilePath);
        
        // Create screenshot metadata
        const metadata = await sharp(processedBuffer).metadata();
        const screenshotData = {
          id: generateId(),
          timestamp,
          type: 'window',
          windowTitle,
          windowId: targetWindow.id,
          format,
          quality,
          width: metadata.width,
          height: metadata.height,
          filePath: filePath,
          base64: processedBuffer.toString('base64')
        };
        
        // Add to history
        addToHistory(screenshotData);
        
        return screenshotData;
      } catch (error) {
        console.error('Error using screencapture command:', error);
        throw new Error(`Failed to capture window using screencapture: ${error.message}`);
      }
    } else {
      throw new Error('Window capture is currently only supported on macOS');
    }
  } catch (error) {
    console.error('Error capturing window:', error);
    throw new Error(`Failed to capture window: ${error.message}`);
  }
}

/**
 * Automatically detects and captures Godot or PyGame applications
 * 
 * @param {Object} options - Capture options
 * @param {string} options.appType - Type of application ('godot', 'pygame', 'any')
 * @param {string} options.format - Image format (png, jpg)
 * @param {number} options.quality - Image quality (1-100)
 * @param {boolean} options.saveToFile - Whether to save to file
 * @returns {Promise<Object>} Screenshot result with metadata
 */
async function captureApplication(options = {}) {
  const appType = options.appType || 'any';
  
  try {
    // Get a list of all windows
    const windows = await getWindowList();
    
    // Find windows that match the application type
    let targetWindow = null;
    if (appType === 'godot' || appType === 'any') {
      targetWindow = windows.find(win => 
        win.title && (win.title.includes('Godot') || win.owner.name.includes('Godot'))
      );
    }
    
    if (!targetWindow && (appType === 'pygame' || appType === 'any')) {
      targetWindow = windows.find(win => 
        win.title && (win.title.includes('pygame') || win.title.includes('PyGame'))
      );
    }
    
    if (!targetWindow) {
      throw new Error(`No ${appType === 'any' ? 'Godot or PyGame' : appType} application found`);
    }
    
    // Delegate to captureWindow
    return captureWindow({
      windowTitle: targetWindow.title,
      ...options
    });
  } catch (error) {
    console.error('Error capturing application:', error);
    throw new Error(`Failed to capture application: ${error.message}`);
  }
}

/**
 * List all available windows
 * 
 * @returns {Promise<Array>} List of windows
 */
async function listWindows() {
  try {
    const windows = await getWindowList();
    
    return windows.map(win => ({
      id: win.id,
      title: win.title,
      application: win.owner.name
    }));
  } catch (error) {
    console.error('Error listing windows:', error);
    throw new Error(`Failed to list windows: ${error.message}`);
  }
}

/**
 * Captures a specific region of the screen
 * 
 * @param {Object} options - Capture options
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.width - Width
 * @param {number} options.height - Height
 * @param {string} options.format - Image format (png, jpg)
 * @param {number} options.quality - Image quality (1-100)
 * @param {boolean} options.saveToFile - Whether to save to file
 * @returns {Promise<Object>} Screenshot result with metadata
 */
async function captureRegion(options = {}) {
  const { x, y, width, height } = options;
  const format = options.format || 'png';
  const quality = options.quality || 100;
  const saveToFile = options.saveToFile !== undefined ? options.saveToFile : true;
  
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error('Region coordinates (x, y, width, height) are required');
  }
  
  try {
    // On macOS, we'll use screencapture command directly for capturing a region
    if (process.platform === 'darwin') {
      try {
        // Create a temporary file path
        const tempFilePath = path.join(SCREENSHOT_DIR, `temp_${Date.now()}.png`);
        const timestamp = new Date().toISOString();
        const filename = `region_${x}_${y}_${width}_${height}_${timestamp.replace(/[:.]/g, '-')}.${format}`;
        const filePath = saveToFile ? path.join(SCREENSHOT_DIR, filename) : null;
        
        // Execute screencapture command to capture a specific region
        // -R flag specifies the region in the format x,y,width,height
        execSync(`screencapture -R${x},${y},${width},${height} "${tempFilePath}"`, { stdio: 'inherit' });
        
        // Process the screenshot
        let processedBuffer = await fs.readFile(tempFilePath);
        
        // Convert/optimize if needed
        if (format === 'jpg' || quality < 100) {
          processedBuffer = await sharp(processedBuffer)
            .jpeg({ quality: quality })
            .toBuffer();
        }
        
        // Save to final destination if requested
        if (saveToFile) {
          await fs.writeFile(filePath, processedBuffer);
        }
        
        // Clean up temp file
        await fs.remove(tempFilePath);
        
        // Create screenshot metadata
        const screenshotData = {
          id: generateId(),
          timestamp,
          type: 'region',
          region: { x, y, width, height },
          format,
          quality,
          width,
          height,
          filePath: filePath,
          base64: processedBuffer.toString('base64')
        };
        
        // Add to history
        addToHistory(screenshotData);
        
        return screenshotData;
      } catch (error) {
        console.error('Error using screencapture command for region:', error);
        throw new Error(`Failed to capture region using screencapture: ${error.message}`);
      }
    } else {
      // For other platforms, we'll use a different approach
      // First capture the full screen, then crop the region
      const fullScreenCapture = await captureFullScreen({ format: 'png', saveToFile: false });
      
      // Crop the region
      const processedBuffer = await sharp(Buffer.from(fullScreenCapture.base64, 'base64'))
        .extract({ left: x, top: y, width, height })
        .toFormat(format === 'jpg' ? 'jpeg' : 'png')
        .jpeg({ quality: quality })
        .toBuffer();
      
      const timestamp = new Date().toISOString();
      const filename = `region_${x}_${y}_${width}_${height}_${timestamp.replace(/[:.]/g, '-')}.${format}`;
      const filePath = saveToFile ? path.join(SCREENSHOT_DIR, filename) : null;
      
      // Save to file if requested
      if (saveToFile) {
        await fs.writeFile(filePath, processedBuffer);
      }
      
      // Create screenshot metadata
      const screenshotData = {
        id: generateId(),
        timestamp,
        type: 'region',
        region: { x, y, width, height },
        format,
        quality,
        width,
        height,
        filePath: filePath,
        base64: processedBuffer.toString('base64')
      };
      
      // Add to history
      addToHistory(screenshotData);
      
      return screenshotData;
    }
  } catch (error) {
    console.error('Error capturing region:', error);
    throw new Error(`Failed to capture region: ${error.message}`);
  }
}

/**
 * Get the latest screenshot from history
 * 
 * @returns {Object} Latest screenshot data
 */
function getLatestScreenshot() {
  if (screenshotHistory.length === 0) {
    return null;
  }
  
  return screenshotHistory[screenshotHistory.length - 1];
}

/**
 * Get screenshot history
 * 
 * @param {number} limit - Maximum number of items to return
 * @returns {Array} Screenshot history
 */
function getScreenshotHistory(limit = 10) {
  // Create a copy of the array with most recent first
  return [...screenshotHistory]
    .reverse()
    .slice(0, limit)
    .map(item => ({
      id: item.id,
      timestamp: item.timestamp,
      type: item.type,
      filePath: item.filePath,
      width: item.width,
      height: item.height,
      format: item.format
    }));
}

/**
 * Get a screenshot by ID
 */
function getScreenshotById(id) {
  return screenshotHistory.find(screenshot => screenshot.id === id);
}

/**
 * Add a screenshot to history
 * @param {Object} screenshot - Screenshot data
 */
function addToHistory(screenshot) {
  // Limit history to 100 items
  if (screenshotHistory.length >= 100) {
    screenshotHistory.shift(); // Remove oldest
  }
  
  screenshotHistory.push(screenshot);
}

/**
 * Generate a unique ID for a screenshot
 */
function generateId() {
  return `ss_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

module.exports = {
  captureFullScreen,
  captureWindow,
  captureApplication,
  captureRegion,
  listWindows,
  getLatestScreenshot,
  getScreenshotHistory,
  getScreenshotById
};