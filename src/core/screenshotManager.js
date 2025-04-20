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

// Directory to store screenshots
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

// Create screenshots directory if it doesn't exist
fs.ensureDirSync(SCREENSHOT_DIR);

// Screenshot history storage
const screenshotHistory = [];

// Fallback for 'node-mac-window-list' using shell commands
const getWindowList = async () => {
  if (process.platform !== 'darwin') {
    throw new Error('Window listing is only supported on macOS');
  }
  
  return new Promise((resolve, reject) => {
    // Use AppleScript to get window information
    const script = `
      tell application "System Events"
        set windowList to {}
        set allProcesses to processes whose visible is true
        repeat with proc in allProcesses
          set procName to name of proc
          set procWindows to windows of proc
          repeat with win in procWindows
            set winName to ""
            try
              set winName to name of win
            end try
            if winName is not "" then
              set end of windowList to {id:id of win, title:winName, app:procName}
            end if
          end repeat
        end repeat
        return windowList
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error getting window list:', error);
        // Return empty list as fallback
        resolve([]);
        return;
      }
      
      try {
        // Parse the output into a structured format
        const output = stdout.trim();
        const windows = [];
        
        // Very basic parser for AppleScript output
        // This is a simplified version and may need improvements
        const entries = output.split(', {');
        for (const entry of entries) {
          const match = entry.match(/id:(\d+), title:(.+?), app:(.+?)(?:}|$)/);
          if (match) {
            windows.push({
              id: match[1],
              title: match[2].replace(/"/g, ''),
              owner: { name: match[3].replace(/"/g, '') },
              bounds: { x: 0, y: 0, width: 0, height: 0 } // Placeholder bounds
            });
          }
        }
        
        resolve(windows);
      } catch (err) {
        console.error('Error parsing window list:', err);
        resolve([]);
      }
    });
  });
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
    
    // On macOS, we'll use screencapture command directly for capturing a specific window
    if (process.platform === 'darwin') {
      try {
        // Create a temporary file path
        const tempFilePath = path.join(SCREENSHOT_DIR, `temp_${Date.now()}.png`);
        
        // Execute screencapture command to capture the window by ID
        // -l flag specifies the window ID
        execSync(`screencapture -l ${targetWindow.id} "${tempFilePath}"`, { stdio: 'inherit' });
        
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
 * Lists all available windows that can be captured
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
 * @param {number} options.x - X coordinate
 * @param {number} options.y - Y coordinate
 * @param {number} options.width - Width of region
 * @param {number} options.height - Height of region
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
  
  // Validate options
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error('Region coordinates (x, y, width, height) are required');
  }
  
  try {
    const timestamp = new Date().toISOString();
    const filename = `region_${x}_${y}_${width}_${height}_${timestamp.replace(/[:.]/g, '-')}.${format}`;
    const filePath = saveToFile ? path.join(SCREENSHOT_DIR, filename) : null;
    
    // On macOS, use screencapture with the -R option
    if (process.platform === 'darwin') {
      try {
        // Create a temporary file path
        const tempFilePath = path.join(SCREENSHOT_DIR, `temp_${Date.now()}.png`);
        
        // Execute screencapture command to capture the specified region
        // -R flag specifies the rectangle to capture (x,y,width,height)
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
        const metadata = await sharp(processedBuffer).metadata();
        const screenshotData = {
          id: generateId(),
          timestamp,
          type: 'region',
          region: { x, y, width, height },
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
        console.error('Error using screencapture command for region:', error);
        throw new Error(`Failed to capture region using screencapture: ${error.message}`);
      }
    } else {
      // Fallback for non-macOS platforms
      // Capture full screen and crop region
      const fullScreenBuffer = await screenshot();
      
      // Crop the image
      const processedBuffer = await sharp(fullScreenBuffer)
        .extract({ left: x, top: y, width, height })
        .toFormat(format === 'jpg' ? 'jpeg' : format)
        .jpeg({ quality: format === 'jpg' ? quality : 100 })
        .toBuffer();
      
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
 * Gets the latest screenshot from the history
 * 
 * @returns {Object|null} The latest screenshot or null if none exists
 */
function getLatestScreenshot() {
  if (screenshotHistory.length === 0) {
    return null;
  }
  
  return screenshotHistory[screenshotHistory.length - 1];
}

/**
 * Gets the screenshot history (most recent first)
 * 
 * @param {number} limit - Maximum number of items to return
 * @returns {Array} Array of screenshot metadata
 */
function getScreenshotHistory(limit = 10) {
  // Return at most 'limit' items, most recent first
  return screenshotHistory
    .slice(-limit)
    .reverse()
    .map(item => ({
      id: item.id,
      timestamp: item.timestamp,
      type: item.type,
      format: item.format,
      width: item.width,
      height: item.height,
      filePath: item.filePath
    }));
}

/**
 * Gets a screenshot by ID
 * 
 * @param {string} id - Screenshot ID
 * @returns {Object|null} Screenshot data or null if not found
 */
function getScreenshotById(id) {
  const screenshot = screenshotHistory.find(item => item.id === id);
  return screenshot || null;
}

/**
 * Adds a screenshot to the history
 * 
 * @param {Object} screenshot - Screenshot data
 */
function addToHistory(screenshot) {
  // Limit history size
  if (screenshotHistory.length >= 100) {
    screenshotHistory.shift(); // Remove oldest
  }
  
  screenshotHistory.push(screenshot);
}

/**
 * Generates a unique ID for screenshots
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