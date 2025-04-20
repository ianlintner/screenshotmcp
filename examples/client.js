/**
 * Example Client for Screenshot MCP Server
 * 
 * This simple example demonstrates how to connect to and use the 
 * screenshot MCP server for capturing screenshots.
 */

// In a real application, you'd use the MCP client libraries
// This is a simplified demonstration using direct calls

const { server, startServer } = require('../src/index');

// Start the server programmatically
startServer();

async function runExamples() {
  console.log('Running Screenshot MCP Server examples...');
  
  try {
    // Example 1: List all available windows
    console.log('\n1. Listing all available windows...');
    const windows = await callTool('list_windows', {});
    console.log(`Found ${windows.windows.length} windows:`);
    
    for (const window of windows.windows) {
      console.log(`- ${window.title} (${window.application})`);
    }
    
    if (windows.windows.length === 0) {
      console.log('No windows found. Some examples will be skipped.');
    }
    
    // Example 2: Capture full screen
    console.log('\n2. Capturing full screen...');
    const fullScreenResult = await callTool('capture_full_screen', {
      format: 'png',
      quality: 100,
      saveToFile: true
    });
    
    if (fullScreenResult.success) {
      console.log(`Full screen captured successfully!`);
      console.log(`- Saved to: ${fullScreenResult.screenshot.filePath}`);
      console.log(`- Dimensions: ${fullScreenResult.screenshot.width}x${fullScreenResult.screenshot.height}`);
    } else {
      console.error(`Failed to capture full screen: ${fullScreenResult.error}`);
    }
    
    // Example 3: Capture a specific window if any found
    if (windows.windows.length > 0) {
      const targetWindow = windows.windows[0];
      console.log(`\n3. Capturing window: "${targetWindow.title}"...`);
      
      try {
        const windowResult = await callTool('capture_window', {
          windowTitle: targetWindow.title,
          format: 'png',
          quality: 100,
          saveToFile: true
        });
        
        if (windowResult.success) {
          console.log(`Window captured successfully!`);
          console.log(`- Saved to: ${windowResult.screenshot.filePath}`);
          console.log(`- Dimensions: ${windowResult.screenshot.width}x${windowResult.screenshot.height}`);
        } else {
          console.error(`Failed to capture window: ${windowResult.error}`);
        }
      } catch (error) {
        console.error(`Error capturing window: ${error.message}`);
      }
    }
    
    // Example 4: Capture a region of the screen
    console.log('\n4. Capturing screen region (100,100,400,300)...');
    const regionResult = await callTool('capture_region', {
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      format: 'png',
      saveToFile: true
    });
    
    if (regionResult.success) {
      console.log(`Region captured successfully!`);
      console.log(`- Saved to: ${regionResult.screenshot.filePath}`);
      console.log(`- Dimensions: ${regionResult.screenshot.width}x${regionResult.screenshot.height}`);
    } else {
      console.error(`Failed to capture region: ${regionResult.error}`);
    }
    
    // Example 5: Access the latest screenshot resource
    console.log('\n5. Accessing latest screenshot resource...');
    const latestResult = await accessResource('latest');
    
    if (latestResult.success) {
      console.log(`Retrieved latest screenshot!`);
      console.log(`- ID: ${latestResult.screenshot.id}`);
      console.log(`- Type: ${latestResult.screenshot.type}`);
      console.log(`- Time: ${latestResult.screenshot.timestamp}`);
    } else {
      console.error(`Failed to retrieve latest screenshot: ${latestResult.error}`);
    }
    
    // Example 6: Access the screenshot history
    console.log('\n6. Accessing screenshot history...');
    const historyResult = await accessResource('history');
    
    if (historyResult.success) {
      console.log(`Retrieved screenshot history!`);
      console.log(`- Found ${historyResult.history.length} screenshots`);
    } else {
      console.error(`Failed to retrieve screenshot history: ${historyResult.error}`);
    }
    
  } catch (error) {
    console.error('Error running examples:', error);
  } finally {
    console.log('\nExamples completed!');
    console.log('\nLeaving the server running for further testing...');
    console.log('Press Ctrl+C to stop the server and exit.');
  }
}

// Helper function to call a tool
async function callTool(toolName, params) {
  try {
    // In a real MCP client, this would use the proper protocol
    // Here we're directly calling the handler for demonstration
    const tool = server.tools[toolName];
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }
    
    const result = await tool.handler(params);
    return result;
  } catch (error) {
    console.error(`Error calling tool ${toolName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to access a resource
async function accessResource(uri) {
  try {
    // In a real MCP client, this would use the proper protocol
    // Here we're directly calling the handler for demonstration
    const fullUri = `screenshot://${uri}`;
    const resource = server.resources[fullUri];
    if (!resource) {
      throw new Error(`Resource "${fullUri}" not found`);
    }
    
    const result = await resource.handler();
    return result;
  } catch (error) {
    console.error(`Error accessing resource ${uri}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the examples after a short delay to let the server initialize
setTimeout(runExamples, 1000);