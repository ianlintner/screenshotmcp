/**
 * Window Detection Module
 * 
 * Provides advanced window detection functionality for macOS using multiple strategies.
 */

const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// Directory to store screenshots and temporary files
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

/**
 * Get window list using multiple strategies for better reliability
 * @returns {Promise<Array>} List of window objects
 */
async function getWindowList() {
  if (process.platform !== 'darwin') {
    throw new Error('Window listing is only supported on macOS');
  }
  
  console.log('Trying to detect windows using multiple methods...');
  
  // Try multiple detection methods in sequence
  try {
    // First try: CGWindowListCopyWindowInfo via Swift (most reliable but requires permissions)
    const swiftWindows = await getWindowListSwift();
    if (swiftWindows.length > 0) {
      console.log(`Found ${swiftWindows.length} windows using Swift method`);
      return swiftWindows;
    }
    
    // Second try: Improved AppleScript approach
    const appleScriptWindows = await getWindowListAppleScript();
    if (appleScriptWindows.length > 0) {
      console.log(`Found ${appleScriptWindows.length} windows using AppleScript method`);
      return appleScriptWindows;
    }
    
    // Third try: screencapture -l list
    const screencaptureWindows = await getWindowListScreencapture();
    if (screencaptureWindows.length > 0) {
      console.log(`Found ${screencaptureWindows.length} windows using screencapture method`);
      return screencaptureWindows;
    }
    
    // Last resort: Just list applications as pseudo-windows
    const appWindows = await getApplicationsAsFallback();
    console.log(`Found ${appWindows.length} applications as fallback`);
    return appWindows;
  } catch (error) {
    console.error('All window detection methods failed:', error);
    return [];
  }
}

/**
 * Get window list using Swift script (most reliable method on macOS)
 * @returns {Promise<Array>} List of window objects
 */
async function getWindowListSwift() {
  // Create a Swift script to get window information using CGWindowListCopyWindowInfo
  const swiftScript = `
#!/usr/bin/swift
import Cocoa

// Get window list with detailed info
let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]

for window in windowList {
    let windowID = window[kCGWindowNumber as String] as! Int
    let ownerName = window[kCGWindowOwnerName as String] as? String ?? "Unknown"
    let windowName = window[kCGWindowName as String] as? String ?? ""
    
    // Skip windows without names or system windows we don't want to capture
    if windowName.isEmpty || ownerName == "Window Server" || ownerName == "Dock" {
        continue
    }
    
    let bounds = window[kCGWindowBounds as String] as! CFDictionary
    let boundsDict = bounds as! [String: Any]
    let x = boundsDict["X"] as! CGFloat
    let y = boundsDict["Y"] as! CGFloat
    let width = boundsDict["Width"] as! CGFloat
    let height = boundsDict["Height"] as! CGFloat
    
    // Output in a format we can easily parse (pipe-separated)
    print("\\(windowID)|\\(ownerName)|\\(windowName)|\\(Int(x))|\\(Int(y))|\\(Int(width))|\\(Int(height))")
}
`;

  // Write the Swift script to a temporary file
  const scriptPath = path.join(SCREENSHOT_DIR, 'getWindows.swift');
  await fs.writeFile(scriptPath, swiftScript);
  
  // Make the script executable
  execSync(`chmod +x "${scriptPath}"`);
  
  return new Promise((resolve, reject) => {
    // Execute the Swift script
    exec(`"${scriptPath}"`, (error, stdout, stderr) => {
      // Clean up the script
      fs.unlink(scriptPath).catch(err => console.error('Error removing temp script:', err));
      
      if (error) {
        console.error('Error running Swift script:', error);
        resolve([]);
        return;
      }
      
      try {
        const windows = [];
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const [id, appName, title, x, y, width, height] = line.split('|');
          windows.push({
            id,
            title,
            owner: { name: appName },
            bounds: { 
              x: parseInt(x, 10), 
              y: parseInt(y, 10), 
              width: parseInt(width, 10), 
              height: parseInt(height, 10) 
            }
          });
        }
        
        resolve(windows);
      } catch (err) {
        console.error('Error parsing Swift output:', err);
        resolve([]);
      }
    });
  });
}

/**
 * Get window list using improved AppleScript
 * @returns {Promise<Array>} List of window objects
 */
async function getWindowListAppleScript() {
  return new Promise((resolve, reject) => {
    // Improved AppleScript to get window information with better formatting
    const script = `
      set output to ""
      tell application "System Events"
        try
          set windowList to {}
          set allApps to application processes whose visible is true
          repeat with currentApp in allApps
            set appName to name of currentApp
            try
              repeat with currentWindow in (windows of currentApp)
                try
                  set windowName to name of currentWindow
                  set windowID to id of currentWindow
                  
                  -- Skip empty window names
                  if windowName is not "" then
                    set windowInfo to appName & "|" & windowName & "|" & windowID
                    set output to output & windowInfo & "\\n"
                  end if
                end try
              end repeat
            end try
          end repeat
        on error errMsg
          -- Return error info for debugging
          return "ERROR: " & errMsg
        end try
      end tell
      return output
    `;
    
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error getting window list via AppleScript:', error);
        resolve([]);
        return;
      }
      
      try {
        const output = stdout.trim();
        
        // Check for explicit error return from AppleScript
        if (output.startsWith("ERROR:")) {
          console.error('AppleScript error:', output);
          resolve([]);
          return;
        }
        
        const windows = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const parts = line.split('|');
          if (parts.length >= 3) {
            const [appName, windowTitle, windowId] = parts;
            
            windows.push({
              id: windowId.trim(),
              title: windowTitle.trim(),
              owner: { name: appName.trim() },
              bounds: { x: 0, y: 0, width: 0, height: 0 }
            });
          }
        }
        
        resolve(windows);
      } catch (err) {
        console.error('Error parsing AppleScript window list:', err);
        resolve([]);
      }
    });
  });
}

/**
 * Get window list using screencapture -l command
 * @returns {Promise<Array>} List of window objects
 */
async function getWindowListScreencapture() {
  return new Promise((resolve, reject) => {
    // Execute screencapture with list windows option
    exec('screencapture -lc', (error, stdout, stderr) => {
      if (error) {
        console.error('Error using screencapture to list windows:', error);
        resolve([]);
        return;
      }
      
      try {
        // Parse the stderr output which contains window IDs and titles
        // Format example: "1234. WindowTitle"
        const windowRegex = /(\d+)\. (.+)/g;
        const windows = [];
        let match;
        
        while ((match = windowRegex.exec(stderr)) !== null) {
          const [_, id, title] = match;
          windows.push({
            id,
            title,
            owner: { name: title.split(' ')[0] }, // Rough guess at app name
            bounds: { x: 0, y: 0, width: 0, height: 0 }
          });
        }
        
        resolve(windows);
      } catch (err) {
        console.error('Error parsing screencapture window list:', err);
        resolve([]);
      }
    });
  });
}

/**
 * List all visible applications as a fallback
 * @returns {Promise<Array>} List of application windows
 */
async function getApplicationsAsFallback() {
  return new Promise((resolve, reject) => {
    // List running applications as a fallback
    exec(`osascript -e 'tell application "System Events" to get name of every process whose visible is true'`, 
      (error, stdout, stderr) => {
        if (error) {
          console.error('Error listing applications:', error);
          // Return at least one dummy window so the user knows what's happening
          resolve([{
            id: "dummy_0",
            title: "Screenshot MCP (Permission issue)",
            owner: { name: "System" }
          }]);
          return;
        }
        
        try {
          const windows = [];
          const apps = stdout.trim().split(', ');
          
          // Create pseudo-windows for each application
          for (let i = 0; i < apps.length; i++) {
            const appName = apps[i].trim();
            if (appName) {
              windows.push({
                id: `app_${i}`,
                title: `${appName} Window`,
                owner: { name: appName },
                bounds: { x: 0, y: 0, width: 0, height: 0 }
              });
            }
          }
          
          resolve(windows);
        } catch (err) {
          console.error('Error parsing application list:', err);
          resolve([]);
        }
      }
    );
  });
}

// Export the window detection functions
module.exports = {
  getWindowList
};