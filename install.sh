#!/bin/bash

# Screenshot MCP Server Installation Script
# This script helps install and configure the Screenshot MCP Server

# Function to print colored text
print_colored() {
  local color=$1
  local text=$2
  case $color in
    "green") echo -e "\033[0;32m$text\033[0m" ;;
    "blue") echo -e "\033[0;34m$text\033[0m" ;;
    "yellow") echo -e "\033[0;33m$text\033[0m" ;;
    "red") echo -e "\033[0;31m$text\033[0m" ;;
    *) echo "$text" ;;
  esac
}

print_colored "blue" "==========================================="
print_colored "blue" "Screenshot MCP Server Installation"
print_colored "blue" "==========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  print_colored "red" "Node.js is not installed. Please install Node.js v16 or higher."
  print_colored "yellow" "You can install it from https://nodejs.org/"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
  print_colored "red" "Node.js version $NODE_VERSION detected. Version 16 or higher is required."
  print_colored "yellow" "Please upgrade your Node.js installation."
  exit 1
fi

print_colored "green" "✓ Node.js version $NODE_VERSION detected."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  print_colored "red" "npm is not installed. Please install npm."
  exit 1
fi

print_colored "green" "✓ npm detected."

# Check platform
if [[ "$OSTYPE" != "darwin"* ]]; then
  print_colored "yellow" "Warning: This MCP server is optimized for macOS."
  print_colored "yellow" "Some functionality may be limited on your platform."
fi

# Install dependencies
print_colored "blue" "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
  print_colored "red" "Error installing dependencies."
  exit 1
fi

print_colored "green" "✓ Dependencies installed successfully."

# Create screenshots directory if it doesn't exist
if [ ! -d "screenshots" ]; then
  mkdir -p screenshots
  print_colored "green" "✓ Created screenshots directory."
fi

print_colored "green" "Installation completed successfully!"
echo ""
print_colored "blue" "To start the MCP server, run:"
print_colored "yellow" "npm start"
echo ""
print_colored "blue" "For development with auto-reload, run:"
print_colored "yellow" "npm run dev"
echo ""